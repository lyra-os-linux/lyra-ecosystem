from __future__ import annotations

import importlib.util
import contextlib
import io
import json
import shlex
import subprocess
import sys
import tempfile
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
    def test_cli_accepts_release_versions_and_rejects_unsafe_input_before_ssh(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "report.json"
            for version in ("1.1", "1.1.2", "1.1-alpha.7", "1.1-beta.1.1", "1.1-rc.1"):
                args = ["gate", "--target", "root@candidate", "--edition", "desktop",
                        "--version", version, "--output", str(output)]
                runner = lambda command: (0, HEALTHY if command == gate.DEPENDENCY_COMMAND else "ok")
                with patch.object(sys, "argv", args), patch.object(gate, "ssh_runner", return_value=runner), contextlib.redirect_stdout(io.StringIO()):
                    self.assertEqual(gate.main(), 0)
                self.assertEqual(json.loads(output.read_text())["version"], version)
            for version in ("1.1-alpha7", "1.1-alpha.0", "01.1", "1.1\n", "1.1$(id)", "1.1';id", "v1.1"):
                with self.subTest(version=version), patch.object(sys, "argv", [*args[:6], "--version", version, "--output", str(output)]), patch.object(gate, "ssh_runner") as ssh, contextlib.redirect_stderr(io.StringIO()):
                    with self.assertRaises(SystemExit) as error:
                        gate.main()
                    self.assertEqual(error.exception.code, 2)
                    ssh.assert_not_called()
                    with self.assertRaises(ValueError):
                        gate.execute("desktop", version, runner)

    def test_identity_checks_generated_artifact_instead_of_product_version(self):
        fixtures = (("desktop", "1.1-alpha.7", "release"),
                    ("server", "1.1-beta.1.1", "server-release"))
        with tempfile.TemporaryDirectory() as directory:
            for edition, artifact, filename in fixtures:
                identity = Path(directory) / filename
                identity.write_text(f"LYRA_ARTIFACT_VERSION='{artifact}'\nLYRA_VERSION_ID='1.1'\n")

                def runner(command):
                    if command.startswith("grep "):
                        args = shlex.split(command)
                        self.assertEqual(args[-1], f"/usr/lib/lyra-os/{filename}")
                        args[-1] = str(identity)
                        result = subprocess.run(args, capture_output=True, text=True, check=False)
                        return result.returncode, result.stdout
                    return 0, HEALTHY if command == gate.DEPENDENCY_COMMAND else "ok"

                self.assertEqual(gate.execute(edition, artifact, runner)["status"], "passed")
                for wrong in ("1.1", "1.1-alpha.8"):
                    report = gate.execute(edition, wrong, runner)
                    self.assertEqual(report["status"], "failed")
                    self.assertEqual(report["checks"][0]["status"], "failed")

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
