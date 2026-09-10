#!/usr/bin/env python3
"""Validate the local Lyra portfolio without network access or writes."""

from __future__ import annotations

import hashlib
import json
import re
import sys
import tomllib
from datetime import date
from html.parser import HTMLParser
from pathlib import Path


ECOSYSTEM = Path(__file__).resolve().parents[1]
WORKSPACE = ECOSYSTEM.parent
REPOSITORY = re.compile(r"^[a-z0-9](?:[a-z0-9-]*/)[a-z0-9][a-z0-9-]*$")


def load_toml(path: Path) -> dict:
    with path.open("rb") as stream:
        return tomllib.load(stream)


class SiteMetadata(HTMLParser):
    """Read machine-readable release identity independently of translated copy."""

    def __init__(self) -> None:
        super().__init__()
        self.blocks: list[str] = []
        self.current: list[str] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "script" and dict(attrs).get("type") == "application/ld+json":
            self.current = []

    def handle_data(self, data: str) -> None:
        if self.current is not None:
            self.current.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "script" and self.current is not None:
            self.blocks.append("".join(self.current))
            self.current = None


def site_errors(html: str, release: dict) -> list[str]:
    parser = SiteMetadata()
    parser.feed(html)
    parser.close()
    errors: list[str] = []
    identities: list[dict] = []

    def collect(value: object) -> None:
        if isinstance(value, list):
            for item in value:
                collect(item)
        elif isinstance(value, dict):
            if value.get("@type") == "SoftwareApplication" and value.get("name") == "Lyra OS":
                identities.append(value)
            if "@graph" in value:
                collect(value["@graph"])

    for block in parser.blocks:
        try:
            collect(json.loads(block))
        except ValueError:
            errors.append("site/index.html: invalid JSON-LD")
    if parser.current is not None:
        errors.append("site/index.html: unterminated JSON-LD script")
    if len(identities) != 1:
        errors.append("site/index.html: expected exactly one Lyra OS SoftwareApplication identity")
    for identity in identities:
        for field, expected in (("softwareVersion", release["product_version"]),
                                ("operatingSystem", release["architecture"])):
            if identity.get(field) != expected:
                errors.append(f"site/index.html: {field} differs from canonical release contract")
    return errors


def release_errors(catalog: dict, release: dict, workspace: Path) -> list[str]:
    errors: list[str] = []
    for product in catalog.get("products", []):
        if product.get("kind") != "edition":
            continue
        name = product["id"]
        manifest = product.get("release_manifest")
        if not manifest:
            errors.append(f"{name}: missing release_manifest in catalog")
            continue
        relative = Path(product["local_path"]) / manifest
        try:
            values = load_toml(workspace / relative).get("release", {})
        except (OSError, ValueError) as error:
            errors.append(f"{relative}: cannot read release manifest: {error}")
            continue
        server = name == "lyraos-server"
        expected = {
            "version": release["product_version"],
            "codename": release["server_codename" if server else "codename"],
            "codename_id": release["server_codename_id" if server else "codename_id"],
            "base_distribution": release["base_distribution"],
            "base_version": release["base_version"],
            "architecture": release["architecture"],
        }
        for field, expected_value in expected.items():
            if values.get(field) != expected_value:
                errors.append(f"{relative}: {field} differs from canonical release contract")
    return errors


def local_markdown_targets(path: Path) -> list[Path]:
    targets: list[Path] = []
    for raw_target in re.findall(r"\[[^]]+\]\(([^)]+)\)", path.read_text()):
        target = raw_target.split("#", 1)[0]
        if not target or "://" in target or target.startswith("mailto:"):
            continue
        targets.append((path.parent / target).resolve())
    return targets


def catalog_errors(catalog: dict, workspace: Path) -> list[str]:
    """Validate ownership and the complete, acyclic distribution graph."""
    errors: list[str] = []
    products = catalog.get("products", [])
    ids = [product.get("id") for product in products]

    if catalog.get("schema") != 1:
        errors.append("products.toml: schema must be 1")
    if len(ids) != len(set(ids)):
        errors.append("products.toml: product ids must be unique")

    known = {product.get("id"): product for product in products if product.get("id")}
    repositories: set[str] = set()
    for product in products:
        product_id = product.get("id", "<missing>")
        for field in ("kind", "repository", "local_path", "owner"):
            if not product.get(field):
                errors.append(f"{product_id}: missing {field}")
        repository = product.get("repository", "")
        if repository and not REPOSITORY.fullmatch(repository):
            errors.append(f"{product_id}: invalid repository {repository!r}")
        if repository in repositories:
            errors.append(f"{product_id}: duplicate repository {repository}")
        repositories.add(repository)
        if repository and product.get("owner") != repository.split("/", 1)[0]:
            errors.append(f"{product_id}: owner must match repository organization")

        local_path = product.get("local_path")
        if not local_path or not (workspace / local_path).is_dir():
            errors.append(f"{product_id}: missing local repository {local_path!r}")
        for relation in ("consumes", "consumed_by"):
            related_ids = product.get(relation, [])
            if len(related_ids) != len(set(related_ids)):
                errors.append(f"{product_id}: duplicate {relation} target")
            for related in related_ids:
                if related not in known:
                    errors.append(f"{product_id}: unknown {relation} target {related}")

    for product_id, product in known.items():
        for dependency in product.get("consumes", []):
            if dependency in known and product_id not in known[dependency].get("consumed_by", []):
                errors.append(f"{product_id} -> {dependency}: missing reciprocal consumed_by")
        for consumer in product.get("consumed_by", []):
            if consumer in known and product_id not in known[consumer].get("consumes", []):
                errors.append(f"{product_id} -> {consumer}: distributed component is not cataloged by consumer")

    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(product_id: str, trail: tuple[str, ...]) -> None:
        if product_id in visiting:
            start = trail.index(product_id)
            errors.append("products.toml: dependency cycle: " + " -> ".join((*trail[start:], product_id)))
            return
        if product_id in visited:
            return
        visiting.add(product_id)
        for dependency in known[product_id].get("consumes", []):
            if dependency in known:
                visit(dependency, (*trail, product_id))
        visiting.remove(product_id)
        visited.add(product_id)

    for product_id in known:
        visit(product_id, ())
    return errors


def validate() -> list[str]:
    errors: list[str] = []
    catalog = load_toml(ECOSYSTEM / "products.toml")
    contracts = load_toml(ECOSYSTEM / "contracts.toml")
    errors.extend(catalog_errors(catalog, WORKSPACE))
    for product in catalog.get("products", []):
        product_id = product.get("id", "<missing>")
        local_path = product.get("local_path")
        if not local_path or not (WORKSPACE / local_path).is_dir():
            continue
        for document in product.get("canonical_docs", []):
            if not (WORKSPACE / local_path / document).is_file():
                errors.append(f"{product_id}: missing canonical document {document}")

    for document in [ECOSYSTEM / "README.md", *(ECOSYSTEM / "docs").glob("*.md")]:
        for target in local_markdown_targets(document):
            if not target.exists():
                errors.append(f"{document.relative_to(WORKSPACE)}: broken link to {target}")

    updater_docs = WORKSPACE / "lyraos-desktop-updater" / "docs"
    for document in updater_docs.rglob("*.md"):
        for target in local_markdown_targets(document):
            if not target.exists():
                errors.append(f"{document.relative_to(WORKSPACE)}: broken link to {target}")

    key_contract = contracts["keys"]["release_public"]
    key_paths = [key_contract["canonical"], *key_contract.get("replicas", [])]
    key_hashes: dict[str, list[str]] = {}
    for relative in key_paths:
        path = WORKSPACE / relative
        if not path.is_file():
            errors.append(f"contracts.toml: missing public key {relative}")
            continue
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        key_hashes.setdefault(digest, []).append(relative)
    if len(key_hashes) > 1:
        errors.append("contracts.toml: public release key replicas differ")

    fingerprint = contracts["release"]["signing_fingerprint"]
    for relative in ("lyraos-desktop/obs/projects.toml", "lyraos-server/obs/projects.toml"):
        manifest = load_toml(WORKSPACE / relative)
        actual = manifest.get("signing", {}).get("fingerprint")
        if actual != fingerprint:
            errors.append(f"{relative}: signing fingerprint differs from contract")

    release_contract = contracts["release"]
    try:
        planned = release_contract.get("planned_release_date", "")
        if date.fromisoformat(planned).isoformat() != planned:
            raise ValueError("noncanonical date")
    except (TypeError, ValueError):
        errors.append("contracts.toml: planned release date must use a valid YYYY-MM-DD date")
    if release_contract.get("support_model") != "community":
        errors.append("contracts.toml: support model must be community")
    if release_contract.get("server_codename") != "Delos":
        errors.append("contracts.toml: server generation codename must be Delos")

    try:
        site = (WORKSPACE / "site/index.html").read_text()
        errors.extend(site_errors(site, release_contract))
    except OSError as error:
        errors.append(f"site/index.html: cannot read release metadata: {error}")
    errors.extend(release_errors(catalog, release_contract, WORKSPACE))

    release = load_toml(WORKSPACE / "lyraos-desktop" / "release.toml")["release"]
    stage_label = f"{release['stage'].capitalize()} {release['iteration']}"
    readme = (WORKSPACE / "lyraos-desktop" / "README.md").read_text()
    if stage_label not in readme:
        errors.append(f"lyraos-desktop/README.md: current stage {stage_label!r} not found")
    stale = re.findall(r"\b(?:Alpha|Beta|RC)\s+\d+\b", readme, flags=re.IGNORECASE)
    mismatches = sorted({value for value in stale if value.lower() != stage_label.lower()})
    if mismatches:
        errors.append(
            "lyraos-desktop/README.md: stage references disagree with release.toml: "
            + ", ".join(mismatches)
        )

    return errors


def main() -> int:
    errors = validate()
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    print("Lyra ecosystem contracts: OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
