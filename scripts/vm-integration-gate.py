#!/usr/bin/env python3
"""Run the read-only Lyra integration gate against a candidate VM over SSH."""

from __future__ import annotations

import argparse
import json
import os
import selectors
import time
from xml.parsers import expat
import re
import subprocess
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

VERSION = re.compile(r"(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)(?:\.(?:0|[1-9][0-9]*))?(?:-(?:alpha|beta|rc)\.[1-9][0-9]*(?:\.[1-9][0-9]*)?)?")
TARGET = re.compile(r"^[A-Za-z0-9_.@:-]+$")


@dataclass(frozen=True)
class Check:
    name: str
    command: str


MAX_OUTPUT = 1024 * 1024
DEPENDENCY_COMMAND = (
    "/usr/bin/timeout --kill-after=5s 110s /usr/bin/zypper "
    "--xmlout --non-interactive --no-refresh verify --dry-run --details"
)


COMMON_CHECKS = (
    Check("systemd", "test -z \"$(systemctl --failed --no-legend)\""),
    Check("zypper", DEPENDENCY_COMMAND),
    Check("vega-bus", "busctl --auto-start=no introspect org.lyraos.Vega1 /org/lyraos/Vega1 >/dev/null"),
    Check("vega-polkit", "pkaction | grep -q '^org.lyraos.vega\\.'"),
    Check("selinux-enforcing", "test \"$(getenforce)\" = Enforcing"),
    Check("vegad-policy", "semodule -l | grep -q '^vegad_bootloader'"),
    Check("vegad-label", "matchpathcon /usr/lib/vega/vegad | grep -q ':vegad_exec_t:'"),
    Check("vegad-domain", "busctl --auto-start=no introspect org.lyraos.Vega1 /org/lyraos/Vega1 >/dev/null && pid=$(pgrep -xo vegad) && ps -eZ -p \"$pid\" | grep -q ':vegad_t:'"),
    Check("vegad-avc", "! ausearch -m AVC -ts boot -c vegad 2>/dev/null | grep -q 'avc:  denied'"),
)

EDITION_CHECKS = {
    "desktop": (
        Check("desktop-root", "test \"$(findmnt -n -o FSTYPE /)\" = btrfs"),
        Check("snapper", "snapper -c root list >/dev/null"),
        Check("welcome-runtime", "test -x /usr/bin/lyra-welcome && ldd /usr/bin/lyra-welcome | grep -qi webkit"),
        Check("upgrade-runtime", "systemctl cat org.lyraos.Upgrade.service >/dev/null"),
    ),
    "server": (
        Check("server-root", "test \"$(findmnt -n -o FSTYPE /)\" = ext4"),
        Check("server-ssh", "systemctl is-active --quiet sshd"),
        Check("server-web", "systemctl is-active --quiet vega-web"),
    ),
}


def run_bounded(argv: list[str], *, timeout: float = 120, limit: int = MAX_OUTPUT) -> tuple[int, str]:
    """Bound capture while reading, so a bad candidate cannot exhaust the gate."""
    try:
        child = subprocess.Popen(argv, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
                                 stderr=subprocess.STDOUT)
    except OSError as error:
        return 127, f"Probe could not start: {error}"
    output = bytearray()
    deadline = time.monotonic() + timeout
    with child, selectors.DefaultSelector() as selector:
        assert child.stdout is not None
        selector.register(child.stdout, selectors.EVENT_READ)
        try:
            while True:
                remaining = deadline - time.monotonic()
                if remaining <= 0 or not selector.select(remaining):
                    raise TimeoutError
                chunk = os.read(child.stdout.fileno(), min(65536, limit + 1 - len(output)))
                if not chunk:
                    break
                output.extend(chunk)
                if len(output) > limit:
                    child.kill()
                    child.wait()
                    return 125, "Probe output exceeded the capture limit"
            status = child.wait(timeout=max(0, deadline - time.monotonic()))
        except (TimeoutError, subprocess.TimeoutExpired):
            child.kill()
            child.wait()
            return 124, "Probe timed out"
        except OSError:
            child.kill()
            child.wait()
            return 125, "Probe output could not be read"
    try:
        return status, output.decode("utf-8")
    except UnicodeDecodeError:
        return 125, "Probe output was not valid UTF-8"


def dependencies_healthy(status: int, output: str) -> bool:
    """Exit zero can still propose repairs; require one empty solver summary."""
    if status != 0 or len(output.encode("utf-8")) > MAX_OUTPUT:
        return False
    path: list[str] = []
    summary_seen = False
    parser = expat.ParserCreate(namespace_separator="}")

    def reject(*_args: object) -> None:
        raise ValueError("invalid dependency report")

    def start(name: str, attributes: dict[str, str]) -> None:
        nonlocal summary_seen
        if len(path) >= 32 or (not path and name != "stream") or "install-summary" in path:
            reject()
        if name == "install-summary":
            if summary_seen or path != ["stream"]:
                reject()
            summary_seen = True
            for key in ("packages-to-change", "download-size", "space-usage-diff",
                        "space-usage-installed", "space-usage-removed"):
                if not re.fullmatch(r"[+-]?0+", attributes.get(key, "")):
                    reject()
        if (name in ("prompt", "solvable") or name.startswith("to-")
                or (name == "message" and attributes.get("type") == "error")):
            reject()
        path.append(name)

    def text(value: str) -> None:
        if (not path or path[-1] == "install-summary") and value.strip():
            reject()

    parser.StartElementHandler = start
    parser.EndElementHandler = lambda _name: path.pop()
    parser.CharacterDataHandler = text
    parser.StartDoctypeDeclHandler = reject
    parser.ProcessingInstructionHandler = reject
    parser.StartCdataSectionHandler = reject
    try:
        parser.Parse(output, True)
    except (expat.ExpatError, ValueError):
        return False
    return summary_seen and not path


def ssh_runner(target: str) -> Callable[[str], tuple[int, str]]:
    def run(command: str) -> tuple[int, str]:
        return run_bounded([
            "ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=10", target, command,
        ])

    return run


def execute(edition: str, version: str, runner: Callable[[str], tuple[int, str]]) -> dict[str, object]:
    if not VERSION.fullmatch(version):
        raise ValueError("invalid release version")
    identity_file = "/usr/lib/lyra-os/release" if edition == "desktop" else "/usr/lib/lyra-os/server-release"
    checks = (Check("identity", f"grep -Fqx \"LYRA_ARTIFACT_VERSION='{version}'\" {identity_file}"), *COMMON_CHECKS, *EDITION_CHECKS[edition])
    results = []
    for check in checks:
        status, output = runner(check.command)
        passed = dependencies_healthy(status, output) if check.name == "zypper" else status == 0
        if check.name == "zypper" and not passed:
            output = "Dependency diagnosis failed or requires repair; candidate rejected.\n" + output[-3800:]
        results.append({"name": check.name, "status": "passed" if passed else "failed", "output": output[-4000:]})
    return {
        "schema": 1,
        "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "edition": edition,
        "version": version,
        "status": "passed" if all(item["status"] == "passed" for item in results) else "failed",
        "checks": results,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target", required=True)
    parser.add_argument("--edition", choices=sorted(EDITION_CHECKS), required=True)
    parser.add_argument("--version", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if not TARGET.fullmatch(args.target):
        parser.error("invalid SSH target")
    if not VERSION.fullmatch(args.version):
        parser.error("version must use MAJOR.MINOR[.PATCH] with an optional -alpha.N, -beta.N or -rc.N suffix (and optional rebuild .N)")
    report = execute(args.edition, args.version, ssh_runner(args.target))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"{report['status']}: {args.output}")
    return 0 if report["status"] == "passed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
