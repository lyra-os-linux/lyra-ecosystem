import base64
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
        release = {"product_version": "16.1", "architecture": "x86_64"}
        identity = {"@type": "SoftwareApplication", "name": "Lyra OS",
                    "softwareVersion": "16.1", "operatingSystem": "x86_64"}

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

    def test_release_key_fingerprint_is_read_from_armored_key(self):
        contracts = MODULE.load_toml(MODULE.ECOSYSTEM / "contracts.toml")
        expected = contracts["release"]["release_key_fingerprint"]
        armored = (MODULE.WORKSPACE / contracts["keys"]["release_public"]["canonical"]).read_text()
        self.assertEqual(MODULE.openpgp_fingerprint(armored), expected)

        lines = armored.strip().splitlines()
        blank = lines.index("")
        data = base64.b64decode("".join(line for line in lines[blank + 1:-1] if not line.startswith("=")))
        size = 1 << (data[0] & 0x03)
        length = int.from_bytes(data[1:1 + size], "big")
        packet = data[1 + size:1 + size + length]
        # Same key with a new-format two-octet length header.
        high, low = divmod(length - 192, 256)
        rewritten = bytes([0xC6, high + 192, low]) + packet
        armor = "\n".join(["-----BEGIN PGP PUBLIC KEY BLOCK-----", "",
                           base64.b64encode(rewritten).decode(), "-----END PGP PUBLIC KEY BLOCK-----"])
        self.assertEqual(MODULE.openpgp_fingerprint(armor), expected)

        for broken in ("", "not a key", armored.replace("PUBLIC KEY", "PRIVATE KEY")):
            with self.subTest(broken=broken[:20]):
                with self.assertRaises(ValueError):
                    MODULE.openpgp_fingerprint(broken)

    def test_edition_scripts_must_pin_the_release_key(self):
        catalog = {"products": [{"id": "edition", "kind": "edition", "local_path": "edition"},
                                {"id": "app", "kind": "application", "local_path": "app"}]}
        with tempfile.TemporaryDirectory() as directory:
            workspace = Path(directory)
            for name in ("edition", "app"):
                (workspace / name / "scripts").mkdir(parents=True)
            good = workspace / "edition/scripts/build.sh"
            good.write_text('#!/bin/bash\nRELEASE_SIGNING_FINGERPRINT="AAAA"\n')
            (workspace / "app/scripts/build.sh").write_text('RELEASE_SIGNING_FINGERPRINT="BBBB"\n')
            self.assertEqual(MODULE.release_script_errors(catalog, "AAAA", workspace), [])
            (workspace / "edition/scripts/upload.sh").write_text("RELEASE_SIGNING_FINGERPRINT=BBBB\n")
            errors = MODULE.release_script_errors(catalog, "AAAA", workspace)
            self.assertEqual(errors, ["edition/scripts/upload.sh: release key fingerprint differs from contract"])

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
