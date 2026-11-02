#!/usr/bin/env python3
"""Report repackaged third-party applications that are behind upstream.

Reads upstream-versions.toml, compares each spec `Version:` with the newest
upstream release and each pinned repository signing key with the key upstream
publishes. Specs and keys come from the local workspace (LYRA_WORKSPACE, the
directory above lyra-ecosystem by default) or, with --remote, from the main
branch on GitHub.

Exit codes:
  0 - everything is current
  1 - at least one package is outdated or one key needs attention
  2 - a check could not be completed (network, missing file, parse error)
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import tomllib
import urllib.request
from dataclasses import dataclass
from pathlib import Path


ECOSYSTEM = Path(__file__).resolve().parents[1]
WORKSPACE = Path(os.environ.get("LYRA_WORKSPACE", str(ECOSYSTEM.parent))).resolve()
MANIFEST = ECOSYSTEM / "upstream-versions.toml"
AWS_CHANGELOG = "https://raw.githubusercontent.com/aws/aws-cli/v2/CHANGELOG.rst"
GCLOUD_MANIFEST = "https://dl.google.com/dl/cloudsdk/channels/rapid/components-2.json"
# Warn this long before a pinned key expires, so a replacement ships in time.
KEY_EXPIRY_WARNING_DAYS = 60

OK, OUTDATED, ATTENTION, ERROR = "ok", "desatualizado", "atenção", "erro"


@dataclass
class Result:
    name: str
    current: str
    upstream: str
    status: str
    note: str = ""


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "lyra-upstream-versions"})
    token = os.environ.get("GITHUB_TOKEN")
    if token and url.startswith("https://api.github.com/"):
        request.add_header("Authorization", f"Bearer {token}")
        request.add_header("Accept", "application/vnd.github+json")
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


def read_packaged(repository: str, path: str, remote: bool) -> bytes:
    if remote:
        return fetch(f"https://raw.githubusercontent.com/{repository}/main/{path}")
    return (WORKSPACE / repository.split("/", 1)[1] / path).read_bytes()


def spec_version(spec: str) -> str:
    match = re.search(r"^Version:\s*(\S+)", spec, re.MULTILINE)
    if not match:
        raise ValueError("spec sem campo Version")
    return match.group(1)


def version_key(version: str) -> tuple[int, ...]:
    return tuple(int(part) for part in re.findall(r"\d+", version))


def latest_upstream(package: dict) -> str:
    source = package["source"]
    if source == "github":
        release = json.loads(fetch(f"https://api.github.com/repos/{package['upstream']}/releases/latest"))
        return release["tag_name"].removeprefix("v")
    if source == "pypi":
        return json.loads(fetch(f"https://pypi.org/pypi/{package['upstream']}/json"))["info"]["version"]
    if source == "gcloud":
        return json.loads(fetch(GCLOUD_MANIFEST))["version"]
    if source == "aws-cli":
        changelog = fetch(AWS_CHANGELOG).decode()
        match = re.search(r"^(2\.\d+\.\d+)\s*$", changelog, re.MULTILINE)
        if not match:
            raise ValueError("versão não encontrada no CHANGELOG do aws-cli")
        return match.group(1)
    raise ValueError(f"source desconhecido: {source}")


def check_package(package: dict, remote: bool) -> Result:
    name = package["name"]
    try:
        current = spec_version(read_packaged(package["repository"], package["spec"], remote).decode())
        upstream = latest_upstream(package)
    except Exception as error:  # noqa: BLE001 - every failure is reported, not raised
        return Result(name, "?", "?", ERROR, str(error))
    if version_key(upstream) > version_key(current):
        return Result(name, current, upstream, OUTDATED, f"atualizar {package['repository']}")
    if version_key(upstream) < version_key(current):
        return Result(name, current, upstream, ATTENTION, "versão empacotada é maior que a do upstream")
    return Result(name, current, upstream, OK)


def key_info(armored: bytes) -> tuple[str, int | None]:
    """Primary key fingerprint and expiry timestamp (None if it never expires)."""
    with tempfile.TemporaryDirectory() as home:
        output = subprocess.run(
            ["gpg", "--homedir", home, "--batch", "--show-keys", "--with-colons"],
            input=armored, capture_output=True, check=True,
        ).stdout.decode()
    expiry: int | None = None
    after_pub = False
    for line in output.splitlines():
        fields = line.split(":")
        if fields[0] == "pub":
            expiry = int(fields[6]) if fields[6] else None
            after_pub = True
        elif fields[0] == "fpr" and after_pub:
            return fields[9], expiry
    raise ValueError("chave sem fingerprint")


def check_key(entry: dict, remote: bool) -> Result:
    name = entry["name"]
    try:
        packaged, expiry = key_info(read_packaged(entry["repository"], entry["key"], remote))
        published, _ = key_info(fetch(entry["upstream"]))
    except Exception as error:  # noqa: BLE001
        return Result(name, "?", "?", ERROR, str(error))
    current, upstream = f"chave {packaged[-16:]}", f"chave {published[-16:]}"
    if packaged != published:
        return Result(name, current, upstream, ATTENTION, f"upstream trocou a chave; atualizar {entry['repository']}")
    if expiry is not None:
        days = (expiry - time.time()) / 86400
        if days < KEY_EXPIRY_WARNING_DAYS:
            return Result(name, current, upstream, ATTENTION, f"chave expira em {int(days)} dias")
    return Result(name, current, upstream, OK)


def render(results: list[Result]) -> str:
    icons = {OK: "✅", OUTDATED: "⚠️", ATTENTION: "🔑", ERROR: "❌"}
    lines = [
        "| Pacote | Empacotado | Upstream | Situação | Observação |",
        "|---|---|---|---|---|",
    ]
    for result in results:
        lines.append(
            f"| {result.name} | {result.current} | {result.upstream} "
            f"| {icons[result.status]} {result.status} | {result.note} |"
        )
    return "\n".join(lines) + "\n"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--remote", action="store_true", help="ler specs e chaves do GitHub (branch main)")
    parser.add_argument("--manifest", type=Path, default=MANIFEST)
    parser.add_argument("--markdown", type=Path, help="também gravar a tabela neste arquivo")
    args = parser.parse_args(argv)

    if not shutil.which("gpg"):
        print("error: gpg não encontrado", file=sys.stderr)
        return 2
    with args.manifest.open("rb") as stream:
        manifest = tomllib.load(stream)

    results = [check_package(package, args.remote) for package in manifest.get("packages", [])]
    results += [check_key(entry, args.remote) for entry in manifest.get("keys", [])]
    table = render(results)
    print(table, end="")
    if args.markdown:
        args.markdown.write_text(table, encoding="utf-8")

    statuses = {result.status for result in results}
    if ERROR in statuses:
        return 2
    if statuses & {OUTDATED, ATTENTION}:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
