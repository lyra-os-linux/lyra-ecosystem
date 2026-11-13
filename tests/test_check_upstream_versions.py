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

SERVICE = """<services>
  <service name="download_url">
    <param name="protocol">https</param>
    <param name="host">example.test</param>
    <param name="path">/warsaw_setup64.rpm</param>
  </service>
  <service name="verify_file">
    <param name="file">_service:download_url:warsaw_setup64.rpm</param>
    <param name="verifier">sha256</param>
    <param name="checksum">{checksum}</param>
  </service>
</services>
"""


class CheckUpstreamVersionsTests(unittest.TestCase):
    def test_manifest_entries_are_complete(self) -> None:
        with (ECOSYSTEM / "upstream-versions.toml").open("rb") as stream:
            manifest = tomllib.load(stream)
        self.assertEqual(manifest["schema"], 1)
        for package in manifest["packages"]:
            self.assertIn(package["source"], {"github", "pypi", "gcloud", "aws-cli", "url-sha256"})
            self.assertTrue(package["spec"].endswith(".spec"))
            if package["source"] in {"github", "pypi"}:
                self.assertIn("upstream", package)
            if package["source"] == "url-sha256":
                upstream = package["upstream"]
                urls = [upstream] if isinstance(upstream, str) else upstream
                self.assertTrue(urls)
                for url in urls:
                    self.assertTrue(url.startswith("https://"))
                self.assertTrue(package["service"])
                self.assertTrue(package["file"])
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

    def test_url_sha256_package_matches_the_pinned_service(self) -> None:
        checksum = "a" * 64
        package = {
            "name": "warsaw",
            "repository": "lyra-os-linux/warsaw",
            "spec": "warsaw.spec",
            "source": "url-sha256",
            "upstream": [
                "https://example.test/warsaw_setup64.rpm",
                "https://example.test/GBPCEFwr64.rpm",
            ],
            "service": "_service",
            "file": "warsaw_setup64.rpm",
        }
        service = SERVICE.format(checksum=checksum).encode()

        def read_packaged(repository: str, path: str, remote: bool) -> bytes:
            return b"Version: 2.21.4\n" if path.endswith(".spec") else service

        with mock.patch.object(checker, "read_packaged", side_effect=read_packaged), \
                mock.patch.object(checker, "fetch_digest", side_effect=[
                    (checksum, "Wed, 05 Jun 2024 10:00:00 GMT"),
                    (checksum, "Thu, 06 Jun 2024 10:00:00 GMT"),
                ]):
            result = checker.check_package(package, remote=True)
        self.assertEqual(result.status, checker.OK)
        self.assertIn("Last-Modified", result.note)
        self.assertIn("GBPCEFwr64.rpm", result.note)

        with mock.patch.object(checker, "read_packaged", side_effect=read_packaged), \
                mock.patch.object(checker, "fetch_digest", side_effect=[(checksum, None), ("b" * 64, None)]):
            result = checker.check_package(package, remote=True)
        self.assertEqual(result.status, checker.OUTDATED)
        self.assertIn("GBPCEFwr64.rpm", result.note)

    def test_service_checksum_requires_a_matching_sha256_entry(self) -> None:
        checksum = "c" * 64
        self.assertEqual(checker.service_checksum(SERVICE.format(checksum=checksum), "warsaw_setup64.rpm"), checksum)
        with self.assertRaises(ValueError):
            checker.service_checksum(SERVICE.format(checksum=checksum), "other.rpm")

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
