from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("vm_integration_gate", ROOT / "scripts/vm-integration-gate.py")
assert SPEC and SPEC.loader
gate = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = gate
SPEC.loader.exec_module(gate)


class VmIntegrationGateTests(unittest.TestCase):
    def test_desktop_passes_only_when_every_read_only_check_passes(self) -> None:
        commands = []

        def runner(command: str) -> tuple[int, str]:
            commands.append(command)
            return 0, "ok"

        report = gate.execute("desktop", "1.0-alpha.6", runner)
        self.assertEqual(report["status"], "passed")
        self.assertIn("zypper --non-interactive verify", commands)
        self.assertTrue(any("vegad_t" in command for command in commands))
        self.assertTrue(any("lyra-welcome" in command for command in commands))

    def test_a_single_failure_fails_closed_and_keeps_evidence(self) -> None:
        def runner(command: str) -> tuple[int, str]:
            return (1, "AVC found") if "ausearch" in command else (0, "ok")

        report = gate.execute("server", "1.0-beta.1", runner)
        self.assertEqual(report["status"], "failed")
        failed = [item for item in report["checks"] if item["status"] == "failed"]
        self.assertEqual(failed, [{"name": "vegad-avc", "status": "failed", "output": "AVC found"}])

    def test_editions_have_distinct_storage_and_runtime_contracts(self) -> None:
        desktop = gate.execute("desktop", "1.0", lambda _: (0, ""))
        server = gate.execute("server", "1.0", lambda _: (0, ""))
        desktop_names = {item["name"] for item in desktop["checks"]}
        server_names = {item["name"] for item in server["checks"]}
        self.assertIn("snapper", desktop_names)
        self.assertIn("server-ssh", server_names)
        self.assertNotIn("welcome-runtime", server_names)


if __name__ == "__main__":
    unittest.main()
