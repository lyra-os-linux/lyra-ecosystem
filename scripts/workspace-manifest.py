#!/usr/bin/env python3
"""Record the exact local Git state used by a Lyra candidate."""

from __future__ import annotations

import argparse
import json
import subprocess
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT.parent


def git(repo: Path, *arguments: str) -> str:
    return subprocess.run(
        ["git", "-C", str(repo), *arguments],
        check=True,
        text=True,
        stdout=subprocess.PIPE,
    ).stdout.strip()


def collect() -> dict[str, object]:
    with (ROOT / "products.toml").open("rb") as stream:
        catalog = tomllib.load(stream)
    paths = {product["local_path"] for product in catalog["products"]}
    paths.add("lyra-ecosystem")
    repositories = []
    for name in sorted(paths):
        repo = WORKSPACE / name
        status = git(repo, "status", "--porcelain=v1", "--untracked-files=all").splitlines()
        repositories.append(
            {
                "name": name,
                "branch": git(repo, "branch", "--show-current") or None,
                "commit": git(repo, "rev-parse", "HEAD"),
                "dirty": bool(status),
                "change_count": len(status),
            }
        )
    return {"schema": 1, "repositories": repositories}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(collect(), indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(args.output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
