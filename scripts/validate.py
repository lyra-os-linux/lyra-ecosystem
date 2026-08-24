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


def validate() -> list[str]:
    errors: list[str] = []
    catalog = load_toml(ECOSYSTEM / "products.toml")
    contracts = load_toml(ECOSYSTEM / "contracts.toml")
    products = catalog.get("products", [])
    ids = [product.get("id") for product in products]

    if catalog.get("schema") != 1:
        errors.append("products.toml: schema must be 1")
    if len(ids) != len(set(ids)):
        errors.append("products.toml: product ids must be unique")

    known = set(ids)
    for product in products:
        product_id = product.get("id", "<missing>")
        local_path = product.get("local_path")
        if not local_path or not (WORKSPACE / local_path).is_dir():
            errors.append(f"{product_id}: missing local repository {local_path!r}")
            continue
        for relation in ("consumes", "consumed_by"):
            for related in product.get(relation, []):
                if related not in known:
                    errors.append(f"{product_id}: unknown {relation} target {related}")
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
