import importlib.util
import json
import shlex
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "validate.py"
SPEC = importlib.util.spec_from_file_location("ecosystem_validate", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)


class EcosystemContractTests(unittest.TestCase):
    def test_site_uses_structured_identity_and_rejects_drift_or_ambiguity(self):
        release = {"product_version": "1.1", "architecture": "x86_64"}
        identity = {"@type": "SoftwareApplication", "name": "Lyra OS",
                    "softwareVersion": "1.1", "operatingSystem": "x86_64"}

        def script(value):
            return '<script type="application/ld+json">' + json.dumps(value) + '</script>'

        for data in (identity, [identity], {"@graph": [identity]}):
            self.assertEqual(MODULE.site_errors("<p>Translated redesign</p>" + script(data), release), [])
        for html in ("", script({}), script(identity) * 2,
                     script({**identity, "softwareVersion": "1.0"}),
                     script({**identity, "operatingSystem": "aarch64"}),
                     '<script type="application/ld+json">{bad}</script>',
                     script(identity).replace('</script>', '')):
            with self.subTest(html=html):
                self.assertTrue(MODULE.site_errors(html, release))

    def test_catalog_drives_manifest_checks_and_missing_files_are_diagnostics(self):
        release = MODULE.load_toml(MODULE.ECOSYSTEM / "contracts.toml")["release"]
        with tempfile.TemporaryDirectory() as directory:
            workspace = Path(directory)
            product = {"id": "edition", "kind": "edition", "local_path": "edition"}
            catalog = {"products": [product]}
            self.assertIn("missing release_manifest", MODULE.release_errors(catalog, release, workspace)[0])
            product["release_manifest"] = "release.toml"
            self.assertIn("cannot read release manifest", MODULE.release_errors(catalog, release, workspace)[0])
            (workspace / "edition").mkdir()
            source = (MODULE.WORKSPACE / "lyraos-desktop/release.toml").read_text()
            manifest = workspace / "edition/release.toml"
            manifest.write_text(source)
            self.assertEqual(MODULE.release_errors(catalog, release, workspace), [])
            for field in ("version", "base_distribution", "base_version", "architecture", "codename"):
                lines = source.splitlines()
                manifest.write_text("\n".join(f'{field} = "wrong"' if line.startswith(field + " =") else line for line in lines))
                self.assertEqual(len(MODULE.release_errors(catalog, release, workspace)), 1)
            manifest.write_text("invalid toml [")
            self.assertIn("cannot read release manifest", MODULE.release_errors(catalog, release, workspace)[0])

    def test_workspace_contracts(self):
        self.assertEqual(MODULE.validate(), [])

    def test_gate_identity_matches_each_editions_generated_release(self):
        spec = importlib.util.spec_from_file_location("identity_gate", SCRIPT.with_name("vm-integration-gate.py"))
        gate = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = gate
        spec.loader.exec_module(gate)
        catalog = MODULE.load_toml(MODULE.ECOSYSTEM / "products.toml")
        for product in catalog["products"]:
            if product["kind"] != "edition":
                continue
            edition = "server" if product["id"] == "lyraos-server" else "desktop"
            filename = "server-release" if edition == "server" else "release"
            identity = MODULE.WORKSPACE / product["local_path"] / "kiwi/root/usr/lib/lyra-os" / filename
            values = dict(line.split("=", 1) for line in identity.read_text().splitlines() if "=" in line)
            artifact = values["LYRA_ARTIFACT_VERSION"].strip("'")

            def runner(command):
                if command.startswith("grep "):
                    args = shlex.split(command)
                    args[-1] = str(identity)
                    result = subprocess.run(args, capture_output=True, text=True, check=False)
                    return result.returncode, result.stdout
                return 0, ""

            with self.subTest(edition=product["id"], artifact=artifact):
                self.assertEqual(gate.execute(edition, artifact, runner)["checks"][0]["status"], "passed")
                self.assertEqual(gate.execute(edition, "99.99-alpha.1", runner)["checks"][0]["status"], "failed")

    def test_rejects_missing_owner_asymmetric_distribution_and_cycles(self):
        with tempfile.TemporaryDirectory() as directory:
            workspace = Path(directory)
            (workspace / "edition").mkdir()
            (workspace / "component").mkdir()
            (workspace / "distributed").mkdir()
            catalog = {
                "schema": 1,
                "products": [
                    {
                        "id": "edition", "kind": "edition",
                        "repository": "lyra-os-linux/edition", "local_path": "edition",
                        "owner": "lyra-os-linux", "consumes": ["component"],
                        "consumed_by": ["component"],
                    },
                    {
                        "id": "component", "kind": "application",
                        "repository": "lyra-os-linux/component", "local_path": "component",
                        "consumes": ["edition"],
                    },
                    {
                        "id": "distributed", "kind": "application",
                        "repository": "lyra-os-linux/distributed", "local_path": "distributed",
                        "owner": "lyra-os-linux", "consumed_by": ["edition"],
                    },
                ],
            }
            errors = MODULE.catalog_errors(catalog, workspace)
            self.assertTrue(any("missing owner" in error for error in errors))
            self.assertTrue(any("missing reciprocal consumed_by" in error for error in errors))
            self.assertTrue(any("distributed component is not cataloged" in error for error in errors))
            self.assertTrue(any("dependency cycle" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
