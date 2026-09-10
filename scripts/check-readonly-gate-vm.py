#!/usr/bin/env python3
"""Native RPM/zypper verification in disposable QEMU/systemd, without a NIC."""
import argparse
from pathlib import Path
import shutil
import subprocess
from systemd_vm_support import SystemdVM

REPO = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ['kernel', 'baseline-gate', 'log']:
        parser.add_argument('--'+name, type=Path, required=True)
    args = parser.parse_args()
    vm = SystemdVM('readonly-gate', 'lyra-readonly-gate-vm')
    try:
        for name in ['rpm', 'rpmdb', 'rpmkeys', 'zypper', 'repo2solv', 'rpmdb2solv',
                     'cat', 'test', 'timeout', 'sleep', 'gzip', 'xz', 'zstd', 'getent']:
            vm.tool(name)
        (vm.root/'sbin').symlink_to('usr/bin'); (vm.root/'usr/sbin').symlink_to('bin')
        for source in Path('/usr/lib64/rpm-plugins').glob('*.so'): vm.binary(source)
        for source in ['/usr/lib64/libnss_files.so.2', '/usr/lib64/libnss_dns.so.2']:
            if Path(source).is_file(): vm.binary(source)
        shutil.copytree('/usr/lib/rpm', vm.root/'usr/lib/rpm', dirs_exist_ok=True, symlinks=True)
        vm.put('/etc/passwd', 'root:x:0:0:root:/root:/bin/bash\n')
        vm.put('/etc/group', 'root:x:0:\n'); vm.put('/etc/hosts', '127.0.0.1 localhost\n')
        (vm.root/'etc/mtab').symlink_to('../proc/self/mounts')
        vm.put('/test/gate.py', (REPO/'scripts/vm-integration-gate.py').read_text())
        vm.put('/test/baseline.py', args.baseline_gate.read_text())
        # Build tiny scriptless RPM fixtures; only the guest installs them.
        build = vm.base/'rpmbuild'; (build/'SPECS').mkdir(parents=True); (build/'tmp').mkdir()
        packages = vm.root/'test/packages'; packages.mkdir(parents=True)
        for name in ['lyra-dependency-provider', 'lyra-dependency-consumer']:
            dependency = 'Requires: lyra-dependency-provider >= 1\n' if name.endswith('consumer') else ''
            spec = build/'SPECS/fixture.spec'
            spec.write_text(f'''Name: {name}
Version: 1
Release: 1
Summary: Disposable post-boot dependency fixture
License: MIT
BuildArch: noarch
AutoReqProv: no
{dependency}%description
Scriptless RPM installed exclusively in a disposable VM.
%install
mkdir -p %{{buildroot}}/usr/share/{name}
printf fixture > %{{buildroot}}/usr/share/{name}/data
%files
/usr/share/{name}
''')
            result = subprocess.run(['rpmbuild', '--define', f'_topdir {build}', '--define', f'_tmppath {build/"tmp"}',
                                    '--define', '__os_install_post %{nil}', '-bb', str(spec)], capture_output=True, text=True)
            if result.returncode: raise RuntimeError(result.stdout+result.stderr)
            shutil.copy2(build/'RPMS/noarch'/f'{name}-1-1.noarch.rpm', packages/f'{name}.rpm')
        vm.run(args.kernel, args.log, REPO/'tests/readonly_gate_vm.py',
               'lyra-readonly-gate-test', 'LYRA_READONLY_GATE_VM_PASS')
    finally:
        shutil.rmtree(vm.base)


if __name__ == '__main__': main()
