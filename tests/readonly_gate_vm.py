"""Actual RPM/zypper only inside the disposable systemd VM."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import importlib.util
import sys

PACKAGES = Path('/test/packages')
ENV = dict(os.environ, LC_ALL='C', PATH='/usr/sbin:/usr/bin:/sbin:/bin')


def run(args, check=True):
    result = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=ENV, timeout=30)
    if check and result.returncode:
        raise AssertionError((args, result.returncode, result.stdout.decode(errors='replace'), result.stderr.decode(errors='replace')))
    return result


def setup(scenario):
    for path in ['/usr/lib/sysimage/rpm', '/var/lib/rpm', '/var/cache/zypp', '/var/lib/zypp', '/etc/zypp', '/test/repo', '/usr/share/lyra-dependency-consumer', '/usr/share/lyra-dependency-provider']:
        p=Path(path)
        if p.is_symlink(): p.unlink()
        elif p.exists(): shutil.rmtree(p)
    Path('/var/tmp/zypp.tmp').mkdir(parents=True,exist_ok=True)
    Path('/var/log').mkdir(parents=True,exist_ok=True)
    repo=Path('/test/repo'); repo.mkdir()
    if scenario != 'remove': shutil.copy2(PACKAGES/'lyra-dependency-provider.rpm',repo/'provider.rpm')
    repos=Path('/etc/zypp/repos.d');repos.mkdir(parents=True)
    (repos/'fixture.repo').write_text('[fixture]\nname=fixture\nbaseurl=file:///test/repo\nenabled=1\nautorefresh=0\ntype=plaindir\ngpgcheck=0\nrepo_gpgcheck=0\npkg_gpgcheck=0\n')
    run(['rpm','--initdb'])
    names=['lyra-dependency-consumer']
    if scenario=='healthy': names.append('lyra-dependency-provider')
    run(['rpm','-i','--nodeps','--noscripts',*[str(PACKAGES/(n+'.rpm')) for n in names]])
    run(['zypper','--non-interactive','refresh'])


def rpm_state():
    # Include the database bytes and package payloads, not just package names.
    paths=[p for p in Path('/usr/lib/sysimage/rpm').rglob('*') if p.is_file() and p.name not in ['.rpm.lock']]
    paths += list(Path('/usr/share').glob('lyra-dependency-*/data'))
    return {'files':{str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths},
            'inventory':run(['rpm','-qa','--qf','%{NAME}-%{VERSION}-%{RELEASE}.%{ARCH}\n']).stdout.decode()}


def load(name):
    spec = importlib.util.spec_from_file_location(name, '/test/'+name+'.py')
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def main():
    assert Path('/run/lyra-readonly-gate-test').exists()
    assert Path('/proc/1/comm').read_text().strip() == 'systemd'
    assert sorted(p.name for p in Path('/sys/class/net').iterdir()) == ['lo']
    gate, baseline = load('gate'), load('baseline')

    def runner(command):
        # Dependency check is native. Other product/desktop checks are fixtures;
        # this VM qualifies package diagnosis, not a complete release image.
        if 'zypper' in command:
            return gate.run_bounded(['/bin/bash', '-c', command])
        return 0, 'unrelated check fixture'

    setup('install')
    before = rpm_state()
    report = baseline.execute('desktop', '1.0', runner)
    after = rpm_state()
    assert report['status'] == 'passed', report
    assert before != after
    assert 'lyra-dependency-provider-1-1.noarch' in after['inventory']
    print('BASELINE_REPRODUCED: gate repaired candidate and passed', flush=True)
    results = {}
    for scenario in ['healthy', 'install', 'remove']:
        setup(scenario)
        before = rpm_state()
        repository = Path('/etc/zypp/repos.d/fixture.repo').read_bytes()
        reports = [gate.execute(edition, '1.0', runner) for edition in ['desktop', 'server']]
        after = rpm_state()
        assert before == after, (scenario, before, after)
        assert Path('/etc/zypp/repos.d/fixture.repo').read_bytes() == repository
        expected = 'passed' if scenario == 'healthy' else 'failed'
        for report in reports:
            assert report['status'] == expected, report
            failures = [c['name'] for c in report['checks'] if c['status'] != 'passed']
            assert failures == ([] if scenario == 'healthy' else ['zypper']), report
        results[scenario] = {'reports': reports, 'rpmdb_payloads_unchanged': before == after,
                             'inventory': after['inventory']}
        print('CANDIDATE '+scenario+' '+expected+' RPMDB_PAYLOADS_UNCHANGED', flush=True)
    print('LYRA_GATE_RESULTS '+json.dumps(results, sort_keys=True), flush=True)
    print('LYRA_READONLY_GATE_VM_PASS', flush=True)


if __name__ == '__main__':
    main()
