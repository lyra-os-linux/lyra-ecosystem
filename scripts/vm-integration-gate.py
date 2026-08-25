#!/usr/bin/env python3
"""Run the read-only Lyra integration gate against a candidate VM over SSH."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

VERSION = re.compile(r"^\d{2}\.\d{2}(?:-(?:alpha|beta|rc)\d+)?$")
TARGET = re.compile(r"^[A-Za-z0-9_.@:-]+$")


@dataclass(frozen=True)
class Check:
    name: str
    command: str


COMMON_CHECKS = (
    Check("systemd", "test -z \"$(systemctl --failed --no-legend)\""),
    Check("zypper", "zypper --non-interactive verify"),
    Check("vega-bus", "busctl introspect org.lyraos.Vega1 /org/lyraos/Vega1 >/dev/null"),
    Check("vega-polkit", "pkaction | grep -q '^org.lyraos.vega\\.'"),
    Check("selinux-enforcing", "test \"$(getenforce)\" = Enforcing"),
    Check("vegad-policy", "semodule -l | grep -q '^vegad_bootloader'"),
    Check("vegad-label", "matchpathcon /usr/lib/vega/vegad | grep -q ':vegad_exec_t:'"),
    Check("vegad-domain", "busctl introspect org.lyraos.Vega1 /org/lyraos/Vega1 >/dev/null && pid=$(pgrep -xo vegad) && ps -eZ -p \"$pid\" | grep -q ':vegad_t:'"),
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


def ssh_runner(target: str) -> Callable[[str], tuple[int, str]]:
    def run(command: str) -> tuple[int, str]:
        completed = subprocess.run(
            ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=10", target, command],
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=120,
            check=False,
        )
        return completed.returncode, completed.stdout[-4000:]

    return run


def execute(edition: str, version: str, runner: Callable[[str], tuple[int, str]]) -> dict[str, object]:
    identity_file = "/usr/lib/lyra-os/release" if edition == "desktop" else "/usr/lib/lyra-os/server-release"
    checks = (Check("identity", f"grep -Fqx \"LYRA_VERSION_ID='{version}'\" {identity_file}"), *COMMON_CHECKS, *EDITION_CHECKS[edition])
    results = []
    for check in checks:
        status, output = runner(check.command)
        results.append({"name": check.name, "status": "passed" if status == 0 else "failed", "output": output})
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
        parser.error("version must use YY.MM with an optional prerelease suffix")
    report = execute(args.edition, args.version, ssh_runner(args.target))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"{report['status']}: {args.output}")
    return 0 if report["status"] == "passed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
