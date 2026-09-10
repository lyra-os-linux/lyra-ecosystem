from __future__ import annotations

import importlib.util
import sys
import unittest
from unittest.mock import patch
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("vm_integration_gate", ROOT / "scripts/vm-integration-gate.py")
assert SPEC and SPEC.loader
gate = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = gate
SPEC.loader.exec_module(gate)


HEALTHY = (ROOT / "tests/fixtures/verify-healthy.xml").read_text()


class VmIntegrationGateTests(unittest.TestCase):
    def test_desktop_passes_only_when_every_read_only_check_passes(self) -> None:
        commands = []

        def runner(command: str) -> tuple[int, str]:
            commands.append(command)
            return 0, HEALTHY if command == gate.DEPENDENCY_COMMAND else "ok"

        report = gate.execute("desktop", "1.0-alpha.6", runner)
        self.assertEqual(report["status"], "passed")
        self.assertIn(gate.DEPENDENCY_COMMAND, commands)
        self.assertTrue(any("vegad_t" in command for command in commands))
        self.assertTrue(any("lyra-welcome" in command for command in commands))

    def test_a_single_failure_fails_closed_and_keeps_evidence(self) -> None:
        def runner(command: str) -> tuple[int, str]:
            return (1, "AVC found") if "ausearch" in command else (0, HEALTHY if command == gate.DEPENDENCY_COMMAND else "ok")

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

    def test_real_solver_reports_reject_install_and_remove_even_with_exit_zero(self) -> None:
        for name in ("healthy", "install", "remove"):
            output = (ROOT / f"tests/fixtures/verify-{name}.xml").read_text()
            for edition in ("desktop", "server"):
                report = gate.execute(edition, "1.0", lambda command: (
                    0, output if command == gate.DEPENDENCY_COMMAND else "ok"))
                self.assertEqual(report["status"], "passed" if name == "healthy" else "failed")
                if name != "healthy":
                    failure = next(item for item in report["checks"] if item["name"] == "zypper")
                    self.assertIn("candidate rejected", failure["output"])
        self.assertFalse(gate.dependencies_healthy(1, HEALTHY))

    def test_missing_malformed_or_ambiguous_xml_never_passes(self) -> None:
        cases = ["", "ok", "<stream/>", HEALTHY + HEALTHY,
                 HEALTHY.replace("</stream>", ""),
                 HEALTHY.replace("<stream>", "<!DOCTYPE stream [<!ENTITY x 'value'>]><stream>"),
                 HEALTHY.replace("<stream>", "<stream><?probe ignored?>"),
                 HEALTHY.replace("</stream>", "<message type='error'>failed</message></stream>"),
                 HEALTHY.replace("</stream>", "<prompt/></stream>"),
                 HEALTHY.replace("<stream>", "<stream><nested>").replace("</stream>", "</nested></stream>"),
                 HEALTHY.replace('packages-to-change="0"', 'packages-to-change="0" packages-to-change="0"'),
                 HEALTHY.replace("</stream>", "<install-summary/></stream>"),
                 HEALTHY.replace("</install-summary>", "<![CDATA[action]]></install-summary>"),
                 " " * (gate.MAX_OUTPUT + 1),
                 "<stream>" + "<nested>" * 33 + "</nested>" * 33 + "</stream>"]
        for output in cases:
            with self.subTest(output=output[:80]):
                self.assertFalse(gate.dependencies_healthy(0, output))

    def test_summary_must_be_empty_and_have_all_zero_counters(self) -> None:
        for name in ("to-install", "to-remove", "to-upgrade", "to-downgrade",
                     "to-reinstall", "to-change-vendor", "to-change-arch", "unknown"):
            self.assertFalse(gate.dependencies_healthy(0, HEALTHY.replace(
                "</install-summary>", f"<{name}/></install-summary>")))
        for key in ("packages-to-change", "download-size", "space-usage-diff",
                    "space-usage-installed", "space-usage-removed"):
            for value in ("1", "-1", "invalid", ""):
                with self.subTest(key=key, value=value):
                    self.assertFalse(gate.dependencies_healthy(0, HEALTHY.replace(
                        f'{key}="0"', f'{key}="{value}"')))
            self.assertFalse(gate.dependencies_healthy(0, HEALTHY.replace(f' {key}="0"', "")))

    def test_transport_keeps_full_xml_for_validation_and_exact_readonly_arguments(self) -> None:
        expected = ("/usr/bin/timeout --kill-after=5s 110s /usr/bin/zypper "
                    "--xmlout --non-interactive --no-refresh verify --dry-run --details")
        self.assertEqual(gate.DEPENDENCY_COMMAND, expected)
        # Discarding everything but the last 4000 bytes would lose this error.
        large = HEALTHY.replace("<stream>", "<stream><message type='error'>failed</message>" + " " * 5000)
        with patch.object(gate, "run_bounded", return_value=(0, large)) as run:
            result = gate.ssh_runner("root@candidate")(expected)
            self.assertEqual(result, (0, large))
            run.assert_called_once_with(["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=10",
                                         "root@candidate", expected])
        self.assertFalse(gate.dependencies_healthy(*result))
        for check in gate.COMMON_CHECKS:
            if "busctl" in check.command:
                self.assertIn("--auto-start=no", check.command)

    def test_transport_bounds_output_and_deadline_before_returning_failure(self) -> None:
        self.assertEqual(gate.run_bounded([sys.executable, "-c", "print('ok')"]), (0, "ok\n"))
        status, output = gate.run_bounded([sys.executable, "-c", "print('x' * 10000)"], limit=100)
        self.assertEqual(status, 125)
        self.assertIn("capture limit", output)
        status, output = gate.run_bounded([sys.executable, "-c", "import time; time.sleep(5)"], timeout=0.1)
        self.assertEqual(status, 124)
        self.assertIn("timed out", output)
        self.assertEqual(gate.run_bounded(["/nonexistent/lyra-probe"])[0], 127)


if __name__ == "__main__":
    unittest.main()
