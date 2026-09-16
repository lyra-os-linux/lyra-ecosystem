#!/usr/bin/env python3
"""Prepare checked source/dependency kits, then validate GNOME without network.

Only prepare resolves dependencies. Verify starts with empty user caches and
uses a Bubblewrap network/filesystem namespace; it never falls back to the host.
Native SDK packages remain supplied by the qualified openSUSE build environment.
"""
from __future__ import annotations

import argparse
import importlib.util
import hashlib
import json
import os
import platform
import re
import shutil
import signal
import stat
import subprocess
import sys
import tarfile
import tempfile
import time
import tomllib
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_POLICY = ROOT / 'build-toolchains.toml'
EXIT_CODES = {'CONFIG_INVALID': 2, 'TOOL_MISSING': 10, 'TOOL_VERSION_MISMATCH': 11,
              'DEPENDENCY_MISSING': 12, 'SOURCE_INVALID': 13, 'INTEGRITY_FAILED': 14,
              'ISOLATION_UNAVAILABLE': 15, 'CODE_FAILED': 20, 'COMMAND_TIMEOUT': 21}


class Failure(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


def require(condition, code, message):
    if not condition:
        raise Failure(code, message)


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def save_json(path: Path, value):
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + '\n', encoding='utf-8')


def safe_relative(name: str) -> Path:
    parts = PurePosixPath(name)
    require(bool(name) and not parts.is_absolute() and '..' not in parts.parts
            and '\\' not in name and '\x00' not in name,
            'INTEGRITY_FAILED', 'Unsafe archive/source path')
    return Path(*parts.parts)


def run(argv, *, cwd=None, env=None, log=None, timeout=900, code='CODE_FAILED'):
    """Bound the process group, including interruption during preparation."""
    stream = Path(log).open('ab') if log else None
    try:
        if stream:
            stream.write((json.dumps([str(a) for a in argv]) + '\n').encode())
            stream.flush()
        try:
            process = subprocess.Popen(argv, cwd=cwd, env=env, stdin=subprocess.DEVNULL,
                start_new_session=True, stdout=stream or subprocess.PIPE,
                stderr=subprocess.STDOUT if stream else subprocess.PIPE,
                text=not bool(stream))
        except FileNotFoundError as error:
            raise Failure('TOOL_MISSING', f'Missing executable: {argv[0]}') from error
        try:
            stdout, stderr = process.communicate(timeout=timeout)
        except BaseException as error:
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            process.wait()
            if isinstance(error, subprocess.TimeoutExpired):
                raise Failure('COMMAND_TIMEOUT', f'Timed out: {argv[0]}; log={log}') from error
            raise
        details = f'see {log}' if log else (stderr or '')[-1000:]
        require(process.returncode == 0, code, f'Command exited {process.returncode}: {argv[0]}; {details}')
        return (stdout or '').strip()
    finally:
        if stream:
            stream.close()


def load_policy(path):
    try:
        policy = tomllib.loads(path.read_text())
        require(policy['schema'] == 1 and policy['platform'] == 'linux-x86_64',
                'CONFIG_INVALID', 'Unsupported build policy')
        expected_tools = {'rustc', 'cargo', 'go', 'node', 'npm', 'python3'}
        require(set(policy['tools']) == expected_tools, 'CONFIG_INVALID', 'Incomplete toolchain pins')
        for version in policy['tools'].values():
            require(re.fullmatch(r'\d+\.\d+\.\d+', version), 'CONFIG_INVALID', 'Tool versions must be exact')
        ids = set()
        for component in policy['components']:
            require(re.fullmatch(r'[a-z0-9-]+', component['id']) and component['id'] not in ids,
                    'CONFIG_INVALID', 'Invalid/duplicate component')
            ids.add(component['id'])
            require(component['kind'] in {'rust', 'go', 'node'}, 'CONFIG_INVALID', 'Unknown build kind')
            safe_relative(component['root'])
        return policy
    except (KeyError, OSError, ValueError, tomllib.TOMLDecodeError) as error:
        raise Failure('CONFIG_INVALID', f'Cannot read build policy: {error}') from error


def tool_environment(go_root=None):
    env = dict(os.environ)
    # Prevent implicit compiler substitution, downloads and inherited build flags.
    for key in list(env):
        if key.startswith(('CARGO_', 'RUST', 'GO', 'NPM_CONFIG_', 'npm_config_', 'PKG_CONFIG')) or key in {'CC', 'CXX', 'CFLAGS', 'CPPFLAGS', 'LDFLAGS', 'LD_LIBRARY_PATH', 'LD_PRELOAD'}:
            env.pop(key)
    env.update({'PATH': '/usr/bin:/bin', 'GOTOOLCHAIN': 'local', 'LC_ALL': 'C.UTF-8', 'PYTHONDONTWRITEBYTECODE': '1'})
    if go_root:
        env['PATH'] = str(go_root / 'bin') + os.pathsep + env.get('PATH', '/usr/bin:/bin')
        env['GOROOT'] = str(go_root)
    return env


def doctor(policy, go_root=None):
    require(platform.system() == 'Linux' and platform.machine() == 'x86_64',
            'CONFIG_INVALID', 'This baseline supports Linux x86_64')
    env = tool_environment(go_root)
    observed = {}
    for tool, expected in policy['tools'].items():
        executable = shutil.which(tool, path=env.get('PATH'))
        require(executable, 'TOOL_MISSING', f'{tool} is missing; install the pinned SDK or pass --go-root')
        args = [executable, 'version' if tool == 'go' else '--version']
        text = run(args, env=env, timeout=20, code='TOOL_VERSION_MISMATCH')
        match = re.search(r'(?<!\d)(\d+\.\d+\.\d+)(?![\dA-Za-z.+-])', text)
        require(match and match[1] == expected, 'TOOL_VERSION_MISMATCH',
                f'{tool}: required {expected}; found {text}')
        observed[tool] = {'version': match[1], 'executable': str(Path(executable).resolve()), 'reported': text}
    for tool in ('git', 'bwrap', 'pkg-config', 'cc', 'msgfmt', 'gpg', 'gpgv', 'dbus-daemon'):
        require(shutil.which(tool, path=env.get('PATH')), 'TOOL_MISSING', f'Missing SDK tool: {tool}')
    native = {}
    for library, expected in policy['native'].items():
        actual = run(['pkg-config', '--modversion', library], env=env, code='DEPENDENCY_MISSING')
        require(actual == expected, 'TOOL_VERSION_MISMATCH', f'{library}: required {expected}; found {actual}')
        native[library] = actual
    if shutil.which('rpm'):
        # Identifies the native SDK used, without reading repository credentials.
        rpms = run(['rpm', '-qa', '--qf', '%{NAME}-%{VERSION}-%{RELEASE}.%{ARCH}\n']).splitlines()
    else:
        rpms = []
    return {'tools': observed, 'native': native, 'native_rpms': sorted(rpms)}


def snapshot(repo: Path, destination: Path, allow_dirty: bool):
    require(repo.is_dir(), 'SOURCE_INVALID', f'Missing repository: {repo}')
    head = run(['git', '-C', str(repo), 'rev-parse', 'HEAD'], code='SOURCE_INVALID')
    status = run(['git', '-C', str(repo), 'status', '--porcelain=v1', '--untracked-files=all'], code='SOURCE_INVALID')
    require(not status or allow_dirty, 'SOURCE_INVALID', f'Dirty repository: {repo}; --allow-dirty is local-only')
    raw = subprocess.check_output(['git', '-C', str(repo), 'ls-files', '-z', '--cached', '--others', '--exclude-standard'])
    source_hashes = {}
    destination.mkdir(parents=True)
    for value in sorted(set(raw.split(b'\x00')) - {b''}):
        name = value.decode('utf-8')
        relative = safe_relative(name)
        source = repo / relative
        if not source.exists() and not source.is_symlink():
            continue  # Explicit deletion in a dirty checkout.
        target = destination / relative
        mode = source.lstat().st_mode
        require(stat.S_ISREG(mode) or stat.S_ISLNK(mode), 'SOURCE_INVALID', f'Unsupported source entry: {name}')
        target.parent.mkdir(parents=True, exist_ok=True)
        if stat.S_ISLNK(mode):
            link = os.readlink(source)
            resolved = (source.parent / link).resolve()
            require(not Path(link).is_absolute() and resolved.is_relative_to(repo.resolve()),
                    'SOURCE_INVALID', f'External source symlink: {name}')
            target.symlink_to(link)
            source_hashes[name] = {'link': link}
        else:
            shutil.copyfile(source, target)
            target.chmod(0o755 if mode & 0o111 else 0o644)
            source_hashes[name] = {'sha256': digest(target)}
            require(digest(source) == source_hashes[name]['sha256'], 'SOURCE_INVALID', f'Source changed while copying: {name}')
    require(run(['git', '-C', str(repo), 'rev-parse', 'HEAD']) == head and
            run(['git', '-C', str(repo), 'status', '--porcelain=v1', '--untracked-files=all']) == status,
            'SOURCE_INVALID', 'Git state changed during snapshot')
    return {'commit': head, 'dirty': bool(status), 'files': source_hashes}


def archive_tree(source: Path, output: Path):
    # Stable tar metadata; compressed content is reproducible for identical input.
    with tarfile.open(output, 'w:xz', preset=1) as archive:
        for path in sorted(source.rglob('*')):
            name = path.relative_to(source).as_posix()
            info = archive.gettarinfo(str(path), arcname=name)
            require(info.isfile() or info.isdir() or info.issym(), 'SOURCE_INVALID', 'Special archive input')
            info.uid = info.gid = info.mtime = 0
            info.uname = info.gname = ''
            info.mode = 0o755 if info.isdir() or path.lstat().st_mode & 0o111 else 0o644
            if info.isfile():
                with path.open('rb') as stream:
                    archive.addfile(info, stream)
            else:
                archive.addfile(info)


def extract_checked(archive_path: Path, destination: Path):
    """No absolute paths, special files, duplicate names or link traversal."""
    with tarfile.open(archive_path, 'r:xz') as archive:
        members = archive.getmembers()
        seen, links, total = set(), set(), 0
        for member in members:
            name = safe_relative(member.name)
            require(name not in seen, 'INTEGRITY_FAILED', 'Duplicate archive entry')
            seen.add(name)
            require(member.isfile() or member.isdir() or member.issym(), 'INTEGRITY_FAILED', 'Special archive entry')
            total += member.size
            require(total <= 12 * 1024**3 and len(seen) <= 300_000, 'INTEGRITY_FAILED', 'Archive exceeds extraction limits')
            if member.issym():
                link = Path(member.linkname)
                require(not link.is_absolute(), 'INTEGRITY_FAILED', 'Absolute archive link')
                require((destination / name.parent / link).resolve().is_relative_to(destination.resolve()),
                        'INTEGRITY_FAILED', 'Escaping archive link')
                links.add(name)
        for name in seen:
            require(not any(parent in links for parent in name.parents), 'INTEGRITY_FAILED', 'Archive writes through a symlink')
        # All entries have been validated before the first write.
        archive.extractall(destination, members=members, filter='data')


def prepare(args, policy):
    observed = doctor(policy, args.go_root)
    require(not args.output.exists(), 'CONFIG_INVALID', 'Output already exists; use a new immutable kit directory')
    sources = json.loads(args.sources.read_text()) if args.sources else {}
    require(isinstance(sources, dict) and set(sources) <= {c['id'] for c in policy['components']}
            and all(isinstance(value, str) and value for value in sources.values()),
            'CONFIG_INVALID', 'Source overrides must map known component IDs to local paths')
    selected = [c for c in policy['components'] if not args.component or c['id'] in args.component]
    require(selected and (not args.component or set(args.component) == {c['id'] for c in selected}), 'CONFIG_INVALID', 'Unknown component selection')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.lyra-kit-', dir=args.output.parent) as staging_name:
        staging = Path(staging_name)
        files = staging / 'kit'
        files.mkdir()
        env = tool_environment(args.go_root)
        entries = []
        for component in selected:
            name = component['id']
            print(f'Preparing {name}', flush=True)
            repo = Path(sources.get(name, str(args.workspace / name))).resolve()
            source = staging / name
            provenance = snapshot(repo, source, args.allow_dirty)
            work = source / component['root']
            log = files / f'{name}.prepare.log'
            lock = {'rust': 'Cargo.lock', 'go': 'go.sum', 'node': 'package-lock.json'}[component['kind']]
            require((work / lock).is_file(), 'DEPENDENCY_MISSING', f'{name}: missing {lock}')
            before = digest(work / lock)
            manifests = {'rust': ['Cargo.toml', 'Cargo.lock'], 'go': ['go.mod', 'go.sum'], 'node': ['package.json', 'package-lock.json']}[component['kind']]
            manifest_hashes = {name: digest(work / name) for name in manifests}
            if component['kind'] == 'rust':
                config = run(['cargo', 'vendor', '--locked', '--versioned-dirs', 'vendor'], cwd=work, env=env, code='DEPENDENCY_MISSING')
                (work / '.cargo').mkdir(exist_ok=True)
                (work / '.cargo/config.toml').write_text(config + '\n[net]\noffline = true\n')
                run(['cargo', 'metadata', '--offline', '--locked', '--format-version', '1'], cwd=work, env=env, log=log, code='DEPENDENCY_MISSING')
            elif component['kind'] == 'go':
                run(['go', 'mod', 'vendor'], cwd=work, env=env, log=log, code='DEPENDENCY_MISSING')
                require((work / 'vendor/modules.txt').is_file(), 'DEPENDENCY_MISSING', 'Missing Go vendor inventory')
            else:
                npm_env = dict(env, npm_config_cache=str(work / '.offline-npm'))
                run(['npm', 'ci', '--ignore-scripts', '--no-audit', '--no-fund'], cwd=work, env=npm_env, log=log, code='DEPENDENCY_MISSING')
                shutil.rmtree(work / 'node_modules')
                shutil.rmtree(work / '.offline-npm/_logs', ignore_errors=True)
            require(all(digest(work / item) == sha for item, sha in manifest_hashes.items()),
                    'INTEGRITY_FAILED', f'{name}: manifest/lockfile changed during vendoring')
            artifact = files / f'{name}.tar.xz'
            archive_tree(source, artifact)
            entries.append({**component, 'archive': artifact.name, 'sha256': digest(artifact), 'lock_sha256': before, 'source': provenance, 'manifest_sha256': manifest_hashes})
            shutil.rmtree(source)
        # Temporary Go installations must not disappear with /tmp cleanup.
        go_root = Path(run(['go', 'env', 'GOROOT'], env=env))
        go_archive = files / 'go-toolchain.tar.xz'
        archive_tree(go_root, go_archive)
        shutil.copyfile(args.policy, files / 'build-toolchains.toml')
        receipt = {'schema': 1, 'scope': 'gnome', 'publishable_sources': not any(e['source']['dirty'] for e in entries),
                   'policy_sha256': digest(args.policy), 'environment': observed, 'components': entries,
                   'go_toolchain': {'archive': go_archive.name, 'sha256': digest(go_archive)}}
        save_json(files / 'kit.json', receipt)
        (files / 'kit.json.sha256').write_text(digest(files / 'kit.json') + '\n')
        files.rename(args.output)
    return {'code': 'OK', 'kit': str(args.output), 'publishable_sources': receipt['publishable_sources'], 'components': len(entries)}


def verify_kit(kit, expected):
    require(re.fullmatch(r'[a-f0-9]{64}', expected), 'CONFIG_INVALID', '--expected-sha256 must identify the reviewed kit manifest')
    require(digest(kit / 'kit.json') == expected, 'INTEGRITY_FAILED', 'Kit manifest checksum mismatch')
    receipt = json.loads((kit / 'kit.json').read_text())
    require(receipt['schema'] == 1 and receipt['scope'] == 'gnome', 'INTEGRITY_FAILED', 'Unknown kit schema/scope')
    require(digest(kit / 'build-toolchains.toml') == receipt['policy_sha256'], 'INTEGRITY_FAILED', 'Policy checksum mismatch')
    policy = load_policy(kit / 'build-toolchains.toml')
    approved = {c['id']: c for c in policy['components']}
    seen = set()
    for component in receipt['components']:
        require(component['id'] in approved and component['id'] not in seen and
                all(component[k] == approved[component['id']][k] for k in ('kind', 'root')),
                'INTEGRITY_FAILED', 'Unrecognized/duplicate component recipe')
        seen.add(component['id'])
    require(seen, 'INTEGRITY_FAILED', 'Empty kit')
    for entry in [*receipt['components'], receipt['go_toolchain']]:
        name = safe_relative(entry['archive'])
        require(len(name.parts) == 1 and (kit / name).is_file() and not (kit / name).is_symlink(), 'INTEGRITY_FAILED', 'Invalid artifact path')
        require(digest(kit / name) == entry['sha256'], 'INTEGRITY_FAILED', f'Artifact checksum mismatch: {name}')
    return receipt, policy


def isolated_command(work, go_root, command, cwd='/work'):
    argv = ['bwrap', '--unshare-all', '--die-with-parent', '--new-session', '--cap-drop', 'ALL']
    for path in ('/usr', '/bin', '/sbin', '/lib', '/lib64'):
        if Path(path).is_symlink():
            argv += ['--symlink', os.readlink(path), path]
        elif Path(path).exists():
            argv += ['--ro-bind', path, path]
    argv += ['--proc', '/proc', '--dev', '/dev', '--tmpfs', '/tmp', '--dir', '/etc', '--dir', '/run',
             '--bind', str(work), '/work', '--ro-bind', str(go_root), '/toolchain/go',
             '--clearenv', '--setenv', 'PATH', '/toolchain/go/bin:/usr/bin:/bin',
             '--setenv', 'HOME', '/work/home', '--setenv', 'LC_ALL', 'C.UTF-8',
             '--setenv', 'CARGO_HOME', '/work/cargo-home', '--setenv', 'CARGO_TARGET_DIR', '/work/target',
             '--setenv', 'CARGO_NET_OFFLINE', 'true', '--setenv', 'CARGO_BUILD_JOBS', '2',
             '--setenv', 'CARGO_PROFILE_DEV_DEBUG', '0', '--setenv', 'CARGO_PROFILE_TEST_DEBUG', '0',
             '--setenv', 'GOTOOLCHAIN', 'local', '--setenv', 'GOROOT', '/toolchain/go',
             '--setenv', 'GOPATH', '/work/go-path', '--setenv', 'GOCACHE', '/work/go-cache',
             '--setenv', 'GOPROXY', 'off', '--setenv', 'GOSUMDB', 'off', '--setenv', 'GOWORK', 'off',
             '--setenv', 'npm_config_offline', 'true', '--setenv', 'npm_config_audit', 'false',
             '--setenv', 'npm_config_fund', 'false', '--setenv', 'PYTHONDONTWRITEBYTECODE', '1']
    for path in ('/etc/ld.so.cache', '/etc/localtime', '/etc/passwd', '/etc/group', '/etc/os-release'):
        if Path(path).exists():
            argv += ['--ro-bind', path, path]
    argv += ['--chdir', cwd, '--', *command]
    return argv


def verify(args):
    receipt, policy = verify_kit(args.kit, args.expected_sha256)
    sdk_record = None
    require(bool(args.sdk) == bool(args.expected_sdk_sha256), 'CONFIG_INVALID',
            '--sdk and --expected-sdk-sha256 must be supplied together')
    if args.sdk:
        spec = importlib.util.spec_from_file_location('offline_sdk', ROOT / 'scripts/offline-sdk.py')
        sdk = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(sdk)
        try:
            sdk_record = sdk.verify(args.sdk, args.expected_sdk_sha256, installed=True)
        except (sdk.InvalidSDK, OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError) as error:
            raise Failure('INTEGRITY_FAILED', f'Archived SDK verification failed: {error}') from error
        require(sdk_record['policy_sha256'] == receipt['policy_sha256'],
                'INTEGRITY_FAILED', 'SDK and source kit have different toolchain policies')
    require(not args.output.exists(), 'CONFIG_INVALID', 'Evidence output exists; use a new directory')
    args.output.mkdir(parents=True)
    args.evidence_created = True
    args.scratch.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='lyra-offline-', dir=args.scratch) as directory:
        base = Path(directory)
        work, go_root = base / 'work', base / 'go'
        work.mkdir(); go_root.mkdir()
        extract_checked(args.kit / receipt['go_toolchain']['archive'], go_root)
        observed = doctor(policy, go_root)
        save_json(args.output / 'environment.json', observed)
        if sdk_record:
            save_json(args.output / 'sdk.json', sdk_record)
        for name in ('home', 'cargo-home', 'go-path', 'go-cache', 'target', 'sources'):
            (work / name).mkdir()
        probe = "import os,socket; assert not os.listdir('/work/cargo-home'); s=socket.socket(); s.settimeout(1); assert s.connect_ex(('1.1.1.1',443)) != 0; print('network blocked; empty Cargo home')"
        run(isolated_command(work, go_root, ['python3', '-c', probe]), log=args.output / 'isolation.log', timeout=30, code='ISOLATION_UNAVAILABLE')
        results = []
        for component in receipt['components']:
            name = component['id']
            print(f'Validating offline: {name}', flush=True)
            source = work / 'sources' / name
            source.mkdir()
            extract_checked(args.kit / component['archive'], source)
            location = '/work/sources/' + name
            if component['root'] != '.':
                location += '/' + component['root']
            log = args.output / f'{name}.log'
            commands = {
                'rust': [['cargo', 'metadata', '--locked', '--offline', '--format-version', '1'],
                         ['cargo', 'test', '--workspace', '--all-targets', '--locked', '--offline'],
                         ['cargo', 'build', '--workspace', '--locked', '--offline']],
                'go': [['go', 'list', '-mod=vendor', './...'], ['go', 'test', '-mod=vendor', '-count=1', './...'],
                       ['go', 'build', '-mod=vendor', '-trimpath', './...']],
                'node': [['npm', 'ci', '--offline', '--ignore-scripts', '--cache', '.offline-npm'],
                         ['npm', 'test'], ['npm', 'run', 'check']],
            }[component['kind']]
            for index, command in enumerate(commands):
                run(isolated_command(work, go_root, command, location), log=log, timeout=args.timeout,
                    code='DEPENDENCY_MISSING' if index == 0 else 'CODE_FAILED')
            results.append({'id': name, 'passed': True, 'archive_sha256': component['sha256'], 'log': log.name})
            save_json(args.output / 'progress.json', results)
        result = {'schema': 1, 'code': 'OK', 'kit_sha256': args.expected_sha256,
                  'scope': 'gnome', 'network_isolated': True, 'initial_caches_empty': True,
                  'native_sdk_reused': True, 'publishable_sources': receipt['publishable_sources'],
                  'components': results}
        if sdk_record:
            result['archived_sdk'] = sdk_record
        save_json(args.output / 'result.json', result)
    return result


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='action', required=True)
    for action in ('doctor', 'prepare'):
        command = sub.add_parser(action)
        command.add_argument('--policy', type=Path, default=DEFAULT_POLICY)
        command.add_argument('--go-root', type=Path)
        if action == 'prepare':
            command.add_argument('--workspace', type=Path, required=True)
            command.add_argument('--sources', type=Path, help='JSON mapping component IDs to explicit local checkouts')
            command.add_argument('--component', action='append', help='Prepare a subset; receipt lists exact scope')
            command.add_argument('--allow-dirty', action='store_true', help='Local evidence only; never publishable')
            command.add_argument('--output', type=Path, required=True)
    command = sub.add_parser('verify')
    command.add_argument('--kit', type=Path, required=True)
    command.add_argument('--expected-sha256', required=True, help='SHA-256 of the reviewed kit.json, obtained independently')
    command.add_argument('--sdk', type=Path, help='Optional archived SDK; requires an exact installed RPM inventory')
    command.add_argument('--expected-sdk-sha256', help='Independently approved digest of sdk.json')
    command.add_argument('--output', type=Path, required=True)
    command.add_argument('--scratch', type=Path, default=Path(tempfile.gettempdir()))
    command.add_argument('--timeout', type=int, default=1800)
    args = parser.parse_args(argv)
    args.evidence_created = False
    try:
        if args.action == 'verify':
            result = verify(args)
        else:
            policy = load_policy(args.policy)
            result = doctor(policy, args.go_root) if args.action == 'doctor' else prepare(args, policy)
        print(json.dumps(result, indent=2))
        return 0
    except Failure as error:
        result = {'code': error.code, 'message': str(error)}
        if args.action == 'verify' and args.evidence_created and args.output.is_dir():
            save_json(args.output / 'failure.json', result)
        print(json.dumps(result), file=sys.stderr)
        return EXIT_CODES[error.code]
    except (OSError, ValueError, KeyError, tarfile.TarError) as error:
        print(json.dumps({'code': 'CONFIG_INVALID', 'message': str(error)}), file=sys.stderr)
        return EXIT_CODES['CONFIG_INVALID']


if __name__ == '__main__':
    sys.exit(main())
