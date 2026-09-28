import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('offline_sdk', Path(__file__).resolve().parents[1] / 'scripts/offline-sdk.py')
sdk = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(sdk)


class SDKTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root / 'keys').mkdir()
        (self.root / 'rpms').mkdir()
        self.key = self.root / 'keys/upstream.asc'
        self.rpm = self.root / 'rpms/compiler.rpm'
        self.key.write_bytes(b'approved key fixture')
        self.rpm.write_bytes(b'approved package fixture')
        self.package = {'file': self.rpm.name, 'sha256': sdk.sha(self.rpm), 'name': 'compiler',
                        'epoch': '0', 'version': '1.0', 'release': '1', 'arch': 'x86_64'}
        self.data = {'schema': 1, 'platform': 'linux-x86_64', 'policy_sha256': 'a' * 64,
                     'keys': [{'file': self.key.name, 'sha256': sdk.sha(self.key)}],
                     'packages': [self.package]}
        self.seal_fixture()

    def seal_fixture(self):
        path = self.root / 'sdk.json'
        path.write_text(json.dumps(self.data))
        self.approved = sdk.sha(path)

    def test_changed_manifest_is_rejected_before_rpm_parsing(self):
        (self.root / 'sdk.json').write_text('{}')
        with patch.object(sdk, 'inspect_rpms') as inspect:
            with self.assertRaisesRegex(sdk.InvalidSDK, 'manifest checksum'):
                sdk.verify(self.root, self.approved)
            inspect.assert_not_called()

    def test_changed_trust_key_is_rejected_before_signature_verification(self):
        self.key.write_bytes(b'attacker key')
        with patch.object(sdk, 'inspect_rpms') as inspect:
            with self.assertRaisesRegex(sdk.InvalidSDK, 'checksum mismatch'):
                sdk.verify(self.root, self.approved)
            inspect.assert_not_called()

    def test_changed_rpm_is_rejected_before_any_native_parser(self):
        self.rpm.write_bytes(b'changed RPM')
        with patch.object(sdk, 'inspect_rpms') as inspect:
            with self.assertRaisesRegex(sdk.InvalidSDK, 'checksum mismatch'):
                sdk.verify(self.root, self.approved)
            inspect.assert_not_called()

    def test_unlisted_rpm_cannot_enter_the_offline_solver(self):
        (self.root / 'rpms/new.rpm').write_bytes(b'unreviewed')
        with self.assertRaisesRegex(sdk.InvalidSDK, 'inventory changed'):
            sdk.verify(self.root, self.approved)

    def test_external_key_symlink_is_refused_even_with_approved_bytes(self):
        other = self.root / 'external.asc'
        other.write_bytes(self.key.read_bytes())
        self.key.unlink()
        self.key.symlink_to('../external.asc')
        with self.assertRaisesRegex(sdk.InvalidSDK, 'linked SDK member'):
            sdk.verify(self.root, self.approved)

    def test_manifest_cannot_select_an_external_path(self):
        self.data['keys'][0]['file'] = '../external.asc'
        self.seal_fixture()
        with self.assertRaises(sdk.InvalidSDK):
            sdk.verify(self.root, self.approved)

    def test_unsigned_rpm_is_not_accepted_as_digest_success(self):
        with patch.object(sdk, 'command', side_effect=['', str(self.rpm) + ': digests OK']):
            with self.assertRaisesRegex(sdk.InvalidSDK, 'valid signature'):
                sdk.inspect_rpms(self.root, [self.rpm], [self.key])

    def test_exact_inventory_distinguishes_clean_sdk_from_host_with_extra_packages(self):
        expected = tuple(self.package[k] for k in ('name', 'epoch', 'version', 'release', 'arch'))
        extra = ('host-only', '0', '1', '1', 'x86_64')
        with patch.object(sdk, 'inspect_rpms', return_value=[self.package]):
            with patch.object(sdk, 'installed_inventory', return_value={expected}):
                result = sdk.verify(self.root, self.approved, installed=True)
                self.assertTrue(result['installed_inventory_verified'])
            for inventory in (set(), {expected, extra}):
                with self.subTest(inventory=inventory), patch.object(sdk, 'installed_inventory', return_value=inventory):
                    with self.assertRaisesRegex(sdk.InvalidSDK, 'Installed SDK inventory differs'):
                        sdk.verify(self.root, self.approved, installed=True)

    def test_altered_rpm_identity_is_rejected(self):
        altered = {**self.package, 'version': '99.0'}
        with patch.object(sdk, 'inspect_rpms', return_value=[altered]):
            with self.assertRaisesRegex(sdk.InvalidSDK, 'identities differ'):
                sdk.verify(self.root, self.approved)


if __name__ == '__main__':
    unittest.main()
