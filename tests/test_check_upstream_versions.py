from __future__ import annotations

import importlib.util
import sys
import tomllib
import unittest
from pathlib import Path
from unittest import mock


ECOSYSTEM = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("check_upstream_versions", ECOSYSTEM / "scripts/check-upstream-versions.py")
checker = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = checker
spec.loader.exec_module(checker)


class CheckUpstreamVersionsTests(unittest.TestCase):
    def test_manifest_entries_are_complete(self) -> None:
        with (ECOSYSTEM / "upstream-versions.toml").open("rb") as stream:
            manifest = tomllib.load(stream)
        self.assertEqual(manifest["schema"], 1)
        for package in manifest["packages"]:
            self.assertIn(package["source"], {"github", "pypi", "gcloud", "aws-cli"})
            self.assertTrue(package["spec"].endswith(".spec"))
            if package["source"] in {"github", "pypi"}:
                self.assertIn("upstream", package)
        for key in manifest["keys"]:
            self.assertTrue(key["upstream"].startswith("https://"))

    def test_spec_version_is_read_from_header(self) -> None:
        self.assertEqual(checker.spec_version("Name: zed\nVersion:        1.26.2\n"), "1.26.2")
        with self.assertRaises(ValueError):
            checker.spec_version("Name: zed\n")

    def test_versions_compare_numerically(self) -> None:
        self.assertGreater(checker.version_key("7.10.0"), checker.version_key("7.9.2"))
        self.assertEqual(checker.version_key("591.0.0"), checker.version_key("591.0.0"))

    def test_outdated_and_current_packages(self) -> None:
        package = {"name": "zed", "repository": "lyra-os-linux/zededitor", "spec": "zed.spec", "source": "github"}
        with mock.patch.object(checker, "read_packaged", return_value=b"Version: 1.16.1\n"), \
                mock.patch.object(checker, "latest_upstream", return_value="1.26.2"):
            self.assertEqual(checker.check_package(package, remote=True).status, checker.OUTDATED)
        with mock.patch.object(checker, "read_packaged", return_value=b"Version: 1.26.2\n"), \
                mock.patch.object(checker, "latest_upstream", return_value="1.26.2"):
            self.assertEqual(checker.check_package(package, remote=True).status, checker.OK)

    def test_fetch_failure_is_reported_as_error(self) -> None:
        package = {"name": "zed", "repository": "lyra-os-linux/zededitor", "spec": "zed.spec", "source": "github"}
        with mock.patch.object(checker, "read_packaged", side_effect=OSError("offline")):
            self.assertEqual(checker.check_package(package, remote=True).status, checker.ERROR)

    def test_key_mismatch_and_expiry_need_attention(self) -> None:
        entry = {"name": "x-repo", "repository": "lyra-os-linux/x", "key": "x.asc", "upstream": "https://example.invalid/x.asc"}
        with mock.patch.object(checker, "read_packaged", return_value=b""), mock.patch.object(checker, "fetch", return_value=b""):
            with mock.patch.object(checker, "key_info", side_effect=[("A" * 40, None), ("B" * 40, None)]):
                self.assertEqual(checker.check_key(entry, remote=True).status, checker.ATTENTION)
            with mock.patch.object(checker, "key_info", side_effect=[("A" * 40, 0), ("A" * 40, 0)]):
                self.assertEqual(checker.check_key(entry, remote=True).status, checker.ATTENTION)
            with mock.patch.object(checker, "key_info", side_effect=[("A" * 40, None), ("A" * 40, None)]):
                self.assertEqual(checker.check_key(entry, remote=True).status, checker.OK)


if __name__ == "__main__":
    unittest.main()
