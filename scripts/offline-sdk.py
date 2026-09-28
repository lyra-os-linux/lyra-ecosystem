#!/usr/bin/env python3
"""Seal and verify an archived RPM SDK without installing packages or using root.

Obtain the expected manifest digest independently of the transferred archive.
RPM keys must be approved when sealing; signatures supplement that pinned digest.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
import re
import subprocess
import tempfile
from pathlib import Path


class InvalidSDK(ValueError):
    pass


def require(value, message):
    if not value:
        raise InvalidSDK(message)


def sha(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def command(argv):
    result = subprocess.run(argv, capture_output=True, text=True, timeout=120,
                            stdin=subprocess.DEVNULL, env={**os.environ, 'LC_ALL': 'C.UTF-8'})
    require(result.returncode == 0, f'{argv[0]} failed: {result.stderr[-1500:]} {result.stdout[-1500:]}')
    return result.stdout.strip()


def member(root, name):
    require(isinstance(name, str) and re.fullmatch(r'[A-Za-z0-9_.+%-]+', name)
            and name not in ('.', '..'), 'Unsafe SDK member name')
    path = root / name
    require(path.is_file() and not path.is_symlink(), f'Missing or linked SDK member: {name}')
    return path


def directories(root):
    for path in (root, root / 'keys', root / 'rpms'):
        require(path.is_dir() and not path.is_symlink(), f'Missing or linked SDK directory: {path}')


def inspect_rpms(root, files, keys):
    """Only the archived, digest-checked keys enter this temporary trust database."""
    with tempfile.TemporaryDirectory(prefix='lyra-sdk-trust-') as temporary:
        database = Path(temporary) / 'rpmdb'
        database.mkdir()
        command(['rpmkeys', '--dbpath', str(database), '--import', *[str(p) for p in keys]])
        # Keep arguments bounded even for larger dependency closures.
        for start in range(0, len(files), 50):
            batch = files[start:start + 50]
            output = command(['rpmkeys', '--dbpath', str(database), '--checksig',
                              *[str(p) for p in batch]])
            require(len(output.splitlines()) == len(batch)
                    and all(line.endswith(': digests signatures OK') for line in output.splitlines()),
                    'Every SDK RPM must have a valid signature, not only valid digests')
        result = []
        seen = set()
        for path in files:
            fields = command(['rpm', '--dbpath', str(database), '-qp', '--qf',
                              '%{NAME}\t%{EPOCHNUM}\t%{VERSION}\t%{RELEASE}\t%{ARCH}', str(path)]).split('\t')
            require(len(fields) == 5, 'Invalid RPM identity')
            name, epoch, version, release, arch = fields
            require(arch in ('x86_64', 'noarch'), f'Unexpected SDK architecture: {arch}')
            require((name, arch) not in seen, f'Multiple SDK RPMs for {name}.{arch}')
            seen.add((name, arch))
            result.append({'file': path.name, 'sha256': sha(path), 'name': name,
                           'epoch': epoch, 'version': version, 'release': release, 'arch': arch})
        return result


def installed_inventory():
    text = command(['rpm', '-qa', '--qf', '%{NAME}\t%{EPOCHNUM}\t%{VERSION}\t%{RELEASE}\t%{ARCH}\n'])
    return {tuple(line.split('\t')) for line in text.splitlines()
            if line and not line.startswith('gpg-pubkey\t')}


def verify(root, expected, *, installed=False):
    directories(root)
    require(re.fullmatch(r'[a-f0-9]{64}', expected or ''), 'An independently approved SDK digest is required')
    manifest_path = member(root, 'sdk.json')
    require(sha(manifest_path) == expected, 'SDK manifest checksum mismatch')
    data = json.loads(manifest_path.read_text())
    require(data['schema'] == 1 and data['platform'] == 'linux-x86_64', 'Unsupported SDK archive')
    require(re.fullmatch(r'[a-f0-9]{64}', data['policy_sha256']), 'Invalid toolchain policy digest')
    require(data['packages'] and data['keys'], 'Empty SDK archive')
    paths = {}
    for group, folder, suffix in [('packages', 'rpms', '.rpm'), ('keys', 'keys', '.asc')]:
        names = [entry['file'] for entry in data[group]]
        require(len(set(names)) == len(names), f'Duplicate {group} manifest entry')
        require(set(names) == {p.name for p in (root / folder).iterdir()}, f'{group} inventory changed')
        paths[group] = []
        for entry in data[group]:
            require(entry['file'].endswith(suffix), 'Invalid SDK file type')
            path = member(root / folder, entry['file'])
            require(sha(path) == entry['sha256'], f'SDK checksum mismatch: {entry["file"]}')
            paths[group].append(path)
    actual = inspect_rpms(root, paths['packages'], paths['keys'])
    require(actual == data['packages'], 'SDK RPM identities differ from the manifest')
    if installed:
        expected_inventory = {tuple(p[k] for k in ('name', 'epoch', 'version', 'release', 'arch')) for p in actual}
        observed = installed_inventory()
        require(observed == expected_inventory,
                f'Installed SDK inventory differs; missing={sorted(expected_inventory-observed)}, extra={sorted(observed-expected_inventory)}')
    return {'code': 'OK', 'sdk_sha256': expected, 'policy_sha256': data['policy_sha256'],
            'rpm_count': len(actual), 'signatures_verified': True, 'installed_inventory_verified': installed}


def seal(root, policy):
    directories(root)
    require(not (root / 'sdk.json').exists(), 'SDK is already sealed; create a new immutable archive')
    keys = sorted((root / 'keys').glob('*.asc'))
    rpms = sorted((root / 'rpms').glob('*.rpm'))
    require(keys and rpms, 'No SDK keys or packages')
    for path in [*keys, *rpms]:
        member(path.parent, path.name)
    require(len(list((root / 'keys').iterdir())) == len(keys)
            and len(list((root / 'rpms').iterdir())) == len(rpms), 'Unexpected archive members')
    packages = inspect_rpms(root, rpms, keys)
    record = {'schema': 1, 'platform': 'linux-x86_64', 'base': 'openSUSE Leap 16.1',
              'policy_sha256': sha(policy),
              'keys': [{'file': p.name, 'sha256': sha(p)} for p in keys], 'packages': packages}
    (root / 'sdk.json').write_text(json.dumps(record, indent=2, sort_keys=True) + '\n')
    checksum = sha(root / 'sdk.json')
    (root / 'sdk.json.sha256').write_text(checksum + '\n')
    return {'code': 'OK', 'sdk_sha256': checksum, 'rpm_count': len(packages)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='action', required=True)
    create = commands.add_parser('seal')
    create.add_argument('--sdk', type=Path, required=True)
    create.add_argument('--policy', type=Path, required=True)
    check = commands.add_parser('verify')
    check.add_argument('--sdk', type=Path, required=True)
    check.add_argument('--expected-sha256', required=True)
    check.add_argument('--installed', action='store_true')
    args = parser.parse_args()
    try:
        result = seal(args.sdk, args.policy) if args.action == 'seal' else verify(args.sdk, args.expected_sha256, installed=args.installed)
        print(json.dumps(result, indent=2))
        return 0
    except (InvalidSDK, OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError) as error:
        print(json.dumps({'code': 'SDK_INVALID', 'message': str(error)}))
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
