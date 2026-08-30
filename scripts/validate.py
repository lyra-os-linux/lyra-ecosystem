#!/usr/bin/env python3
"""Validate the local Lyra portfolio without network access or writes."""

from __future__ import annotations

import hashlib
import re
import sys
import tomllib
from pathlib import Path


ECOSYSTEM = Path(__file__).resolve().parents[1]
WORKSPACE = ECOSYSTEM.parent
REPOSITORY = re.compile(r"^[a-z0-9](?:[a-z0-9-]*/)[a-z0-9][a-z0-9-]*$")


def load_toml(path: Path) -> dict:
    with path.open("rb") as stream:
        return tomllib.load(stream)


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
    if release_contract.get("planned_release_date") != "2027-02-20":
        errors.append("contracts.toml: planned release date must be 2027-02-20")
    if release_contract.get("support_model") != "community":
        errors.append("contracts.toml: support model must be community")
    if release_contract.get("server_codename") != "Delos":
        errors.append("contracts.toml: server generation codename must be Delos")

    site = (WORKSPACE / "site/index.html").read_text()
    for required in ("20 fev 2027", "Suporte comunitário"):
        if required not in site:
            errors.append(f"site/index.html: missing canonical release policy {required!r}")

    release_manifests = (
        "lyraos-desktop/release.toml",
        "lyraos-desktop-kde/release.toml",
        "lyraos-desktop-xfce/release.toml",
        "lyraos-server/release-server.toml",
    )
    expected = {
        "version": release_contract["product_version"],
        "codename": release_contract["codename"],
        "codename_id": release_contract["codename_id"],
        "base_distribution": "opensuse-leap",
        "base_version": release_contract["base_version"],
    }
    for relative in release_manifests:
        values = load_toml(WORKSPACE / relative)["release"]
        manifest_expected = dict(expected)
        if relative == "lyraos-server/release-server.toml":
            manifest_expected["codename"] = release_contract["server_codename"]
            manifest_expected["codename_id"] = release_contract["server_codename_id"]
        for field, expected_value in manifest_expected.items():
            if values.get(field) != expected_value:
                errors.append(
                    f"{relative}: {field} differs from canonical release contract"
                )

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
