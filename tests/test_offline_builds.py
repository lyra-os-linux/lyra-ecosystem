import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile
import time
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('offline_builds', ROOT / 'scripts/offline-builds.py')
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


class KitTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def failure(self, code, fn, *args):
        with self.assertRaises(build.Failure) as error:
            fn(*args)
        self.assertEqual(error.exception.code, code)

    def git(self, *argv):
        return subprocess.run(['git', '-C', str(self.root), *argv], check=True,
                              capture_output=True, text=True).stdout.strip()

    def repository(self):
        self.git('init', '-q')
        (self.root / 'source.txt').write_text('original\n')
        self.git('add', 'source.txt')
        self.git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
                 '-c', 'commit.gpgsign=false', 'commit', '-qm', 'fixture')

    def test_dirty_snapshot_never_changes_checkout_and_requires_explicit_opt_in(self):
        self.repository()
        (self.root / 'source.txt').write_text('local change\n')
        (self.root / 'new.rs').write_text('new source')
        with tempfile.TemporaryDirectory() as other:
            self.failure('SOURCE_INVALID', build.snapshot, self.root, Path(other) / 'rejected', False)
            record = build.snapshot(self.root, Path(other) / 'source', True)
            self.assertTrue(record['dirty'])
            self.assertIn('new.rs', record['files'])
            self.assertEqual((self.root / 'source.txt').read_text(), 'local change\n')
            self.assertEqual((Path(other) / 'source/source.txt').read_text(), 'local change\n')

    def test_external_symlink_cannot_read_files_outside_checkout(self):
        self.repository()
        (self.root / 'private').symlink_to('/etc/passwd')
        with tempfile.TemporaryDirectory() as other:
            self.failure('SOURCE_INVALID', build.snapshot, self.root, Path(other) / 'copy', True)

    def make_archive(self, entries):
        path = self.root / 'input.tar.xz'
        with tarfile.open(path, 'w:xz') as archive:
            for name, kind, value in entries:
                item = tarfile.TarInfo(name)
                if kind == 'file':
                    content = value.encode()
                    item.size = len(content)
                    archive.addfile(item, io.BytesIO(content))
                elif kind == 'link':
                    item.type = tarfile.SYMTYPE
                    item.linkname = value
                    archive.addfile(item)
                else:
                    item.type = tarfile.FIFOTYPE
                    archive.addfile(item)
        return path

    def test_unsafe_archives_fail_before_writing_any_entry(self):
        for entries in [
            [('valid', 'file', 'ok'), ('../escape', 'file', 'bad')],
            [('/absolute', 'file', 'bad')],
            [('x', 'file', 'a'), ('x', 'file', 'b')],
            [('pipe', 'fifo', '')],
            [('link', 'link', '/etc')],
            [('link', 'link', '../outside')],
            [('link', 'link', 'inside'), ('link/file', 'file', 'bad')],
        ]:
            with self.subTest(entries=entries):
                target = self.root / 'extracted'
                self.failure('INTEGRITY_FAILED', build.extract_checked, self.make_archive(entries), target)
                self.assertFalse(target.exists())

    def test_reproducible_archive_ignores_mtime_and_roundtrips_internal_links(self):
        source = self.root / 'source'
        source.mkdir()
        (source / 'executable').write_text('#!/bin/sh\nexit 0\n')
        (source / 'executable').chmod(0o755)
        (source / 'alias').symlink_to('executable')
        first, second = self.root / 'a.tar.xz', self.root / 'b.tar.xz'
        build.archive_tree(source, first)
        os.utime(source / 'executable', (999999, 999999))
        build.archive_tree(source, second)
        self.assertEqual(build.digest(first), build.digest(second))
        dest = self.root / 'restored'
        build.extract_checked(first, dest)
        self.assertEqual((dest / 'alias').read_text(), '#!/bin/sh\nexit 0\n')
        self.assertTrue((dest / 'executable').stat().st_mode & 0o111)

    def test_manifest_checksum_is_required_before_loading_recipes(self):
        (self.root / 'kit.json').write_text('{"command":"untrusted"}')
        self.failure('INTEGRITY_FAILED', build.verify_kit, self.root, '0' * 64)
        self.failure('CONFIG_INVALID', build.verify_kit, self.root, 'not-a-digest')

    def test_rejected_output_reuse_never_modifies_an_existing_receipt(self):
        output = self.root / 'existing-evidence'
        output.mkdir()
        receipt = output / 'result.json'
        receipt.write_text('{"code": "OK"}\n')
        with patch.object(build, 'verify_kit', return_value=({}, {})), \
             patch('sys.stderr', new=io.StringIO()):
            code = build.main(['verify', '--kit', str(self.root),
                               '--expected-sha256', '0' * 64, '--output', str(output)])
        self.assertEqual(code, build.EXIT_CODES['CONFIG_INVALID'])
        self.assertEqual(list(output.iterdir()), [receipt])
        self.assertEqual(receipt.read_text(), '{"code": "OK"}\n')

    def test_checked_manifest_cannot_hide_an_altered_dependency_archive(self):
        policy_path = self.root / 'build-toolchains.toml'
        policy_path.write_bytes((ROOT / 'build-toolchains.toml').read_bytes())
        component = build.load_policy(policy_path)['components'][0]
        archive = self.make_archive([('Cargo.lock', 'file', 'fixed dependency')])
        go = self.root / 'go.tar.xz'
        go.write_bytes(archive.read_bytes())
        receipt = {'schema': 1, 'scope': 'gnome', 'policy_sha256': build.digest(policy_path),
                   'components': [{**component, 'archive': archive.name, 'sha256': build.digest(archive)}],
                   'go_toolchain': {'archive': go.name, 'sha256': build.digest(go)}}
        build.save_json(self.root / 'kit.json', receipt)
        reviewed = build.digest(self.root / 'kit.json')
        build.verify_kit(self.root, reviewed)
        archive.write_bytes(b'altered dependency')
        self.failure('INTEGRITY_FAILED', build.verify_kit, self.root, reviewed)

    def test_incomplete_sdk_arguments_never_start_builds(self):
        for options in (['--sdk', str(self.root)], ['--expected-sdk-sha256', 'a' * 64]):
            with self.subTest(options=options), \
                 patch.object(build, 'verify_kit', return_value=({}, {})), \
                 patch.object(build, 'doctor') as doctor, \
                 patch('sys.stderr', new=io.StringIO()):
                output = self.root / 'evidence'
                code = build.main(['verify', '--kit', str(self.root),
                                   '--expected-sha256', '0' * 64, '--output', str(output), *options])
                self.assertEqual(code, build.EXIT_CODES['CONFIG_INVALID'])
                self.assertFalse(output.exists())
                doctor.assert_not_called()

    def test_sdk_integrity_failure_never_creates_build_evidence(self):
        (self.root / 'keys').mkdir()
        (self.root / 'rpms').mkdir()
        (self.root / 'sdk.json').write_text('{"untrusted": true}')
        output = self.root / 'evidence'
        with patch.object(build, 'verify_kit', return_value=({}, {})), \
             patch.object(build, 'doctor') as doctor, \
             patch('sys.stderr', new=io.StringIO()):
            code = build.main(['verify', '--kit', str(self.root),
                               '--expected-sha256', '0' * 64, '--output', str(output),
                               '--sdk', str(self.root), '--expected-sdk-sha256', 'a' * 64])
        self.assertEqual(code, build.EXIT_CODES['INTEGRITY_FAILED'])
        self.assertFalse(output.exists())
        doctor.assert_not_called()

    def test_inherited_tool_overrides_do_not_replace_the_qualified_sdk(self):
        with patch.dict(os.environ, {'PATH': '/unreviewed/bin', 'RUSTC': '/unreviewed/rustc',
                                     'PKG_CONFIG_PATH': '/unreviewed/lib', 'CARGO_HOME': '/private/cache'}):
            env = build.tool_environment(Path('/tools/go'))
        self.assertEqual(env['PATH'], '/tools/go/bin:/usr/bin:/bin')
        for key in ['RUSTC', 'PKG_CONFIG_PATH', 'CARGO_HOME']:
            self.assertNotIn(key, env)
        self.assertEqual(env['GOTOOLCHAIN'], 'local')

    def test_tool_missing_is_distinct_from_wrong_version(self):
        policy = build.load_policy(ROOT / 'build-toolchains.toml')
        with patch.object(build.shutil, 'which', return_value=None):
            self.failure('TOOL_MISSING', build.doctor, policy)
        for reported in ['rustc 1.0.0', 'rustc 1.97.0-nightly']:
            with patch.object(build.shutil, 'which', return_value='/usr/bin/tool'), \
                 patch.object(build, 'run', return_value=reported):
                self.failure('TOOL_VERSION_MISMATCH', build.doctor, policy)

    def test_timeout_kills_child_group_and_failure_categories_are_preserved(self):
        marker = self.root / 'escaped'
        command = [sys.executable, '-c',
            'import subprocess,time,sys; subprocess.Popen([sys.executable,"-c",'
            '"import time,pathlib;time.sleep(.3);pathlib.Path("+repr(sys.argv[1])+").touch()"]);time.sleep(30)', str(marker)]
        with self.assertRaises(build.Failure) as error:
            build.run(command, timeout=.08, log=self.root / 'timeout.log')
        self.assertEqual(error.exception.code, 'COMMAND_TIMEOUT')
        time.sleep(.4)
        self.assertFalse(marker.exists())
        for code in ['DEPENDENCY_MISSING', 'CODE_FAILED']:
            with self.assertRaises(build.Failure) as error:
                build.run([sys.executable, '-c', 'raise SystemExit(1)'], code=code)
            self.assertEqual(error.exception.code, code)

    def test_sandbox_does_not_bind_home_or_system_bus_and_forces_offline_tools(self):
        argv = build.isolated_command(self.root / 'work', self.root / 'go', ['cargo', 'test'])
        self.assertIn('--unshare-all', argv)
        self.assertIn('--clearenv', argv)
        self.assertIn('CARGO_NET_OFFLINE', argv)
        self.assertIn('GOTOOLCHAIN', argv)
        self.assertIn('GOPROXY', argv)
        for index, value in enumerate(argv):
            if value in ['--ro-bind', '--bind']:
                self.assertNotIn(argv[index + 1], ['/home', '/run', '/', str(Path.home())])


if __name__ == '__main__':
    unittest.main()
