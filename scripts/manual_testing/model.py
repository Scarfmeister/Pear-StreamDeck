"""Versioned catalog and session contracts, independent of Tk and the network."""
from collections import Counter
from copy import deepcopy
from datetime import datetime
import hashlib
import json
import platform
import subprocess
import uuid

STATUSES = ('Not Run', 'Pass', 'Fail', 'Blocked', 'Not Applicable')
DISPLAY_STATUSES = STATUSES + ('Partial',)
ENV_FIELDS = (
    'session_name', 'tester', 'test_datetime', 'os_product', 'os_build',
    'host_application', 'host_version', 'device_model', 'firmware',
    'plugin_branch', 'plugin_commit', 'plugin_package_sha256', 'pear_version',
    'pear_branch', 'pear_commit', 'api_endpoint', 'protocol',
    'authorization_mode', 'host_language', 'environment_notes',
)
MATRIX_IDS = tuple(f'{prefix}{n:02}' for prefix, size in
                   [('H', 6), ('A', 6), ('R', 7), ('K', 9), ('P', 6), ('D', 5), ('I', 3)] for n in range(1, size + 1))


def require(condition, message):
    if not condition:
        raise ValueError(message)


def strings(value, label):
    require(isinstance(value, list) and all(isinstance(x, str) and x.strip() for x in value),
            f'{label} must be a list of nonempty strings')


def validate_catalog(data):
    require(isinstance(data, dict), 'Catalog must be an object')
    require(type(data.get('schema_version')) is int and data['schema_version'] == 1,
            'Unsupported catalog schema_version')
    require(isinstance(data.get('definition_version'), str) and data['definition_version'],
            'Missing definition_version')
    strings(data.get('context', []), 'Catalog context')
    require(isinstance(data.get('tests'), list) and data['tests'], 'Missing tests')
    ids = set()
    for test in data['tests']:
        require(isinstance(test, dict), 'Test must be an object')
        for key in ('id', 'title'):
            require(isinstance(test.get(key), str) and test[key].strip(), f'Missing test {key}')
        require(test['id'] not in ids, f'Duplicate test ID: {test["id"]}')
        ids.add(test['id'])
        for key in ('platforms', 'tags', 'prerequisites', 'steps', 'expected'):
            strings(test.get(key), f'{test["id"]}.{key}')
        require(test['steps'] and test['expected'], 'Steps and expected cannot be empty')
        require(test.get('prior_evidence') is None or isinstance(test['prior_evidence'], str),
                'prior_evidence must be text or null')
        require(isinstance(test.get('platform_notes', ''), str), 'platform_notes must be text')
        require(test['platforms'], 'Test platforms cannot be empty')
        scenarios = test.get('scenarios')
        require(isinstance(scenarios, list) and scenarios, 'Each test needs at least one scenario')
        seen = set()
        for scenario in scenarios:
            require(isinstance(scenario, dict), 'Scenario must be an object')
            for key in ('id', 'title'):
                require(isinstance(scenario.get(key), str) and scenario[key].strip(),
                        f'Scenario missing {key}')
            require(scenario['id'] not in seen, 'Duplicate scenario ID')
            seen.add(scenario['id'])
    require(isinstance(data.get('suites'), list) and data['suites'], 'Missing suites')
    seen = set()
    for suite in data['suites']:
        require(isinstance(suite, dict), 'Suite must be an object')
        for key in ('id', 'name', 'description'):
            require(isinstance(suite.get(key), str) and suite[key].strip(), f'Suite missing {key}')
        require(suite['id'] not in seen, 'Duplicate suite ID')
        seen.add(suite['id'])
        strings(suite.get('tests'), 'Suite tests')
        require(len(set(suite['tests'])) == len(suite['tests']), 'Duplicate suite test reference')
        require(set(suite['tests']) <= ids, 'Suite references missing tests')
    return data


def load_catalog(path):
    with open(path, encoding='utf-8') as stream:
        return validate_catalog(json.load(stream))


def fingerprint(catalog):
    return hashlib.sha256(json.dumps(catalog, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def aggregate(statuses):
    values = list(statuses)
    require(all(s in STATUSES for s in values), 'Invalid status')
    if not values or all(s == 'Not Run' for s in values):
        return 'Not Run'
    if 'Fail' in values:
        return 'Fail'
    if all(s == 'Not Applicable' for s in values):
        return 'Not Applicable'
    relevant = [s for s in values if s != 'Not Applicable']
    if all(s == 'Not Run' for s in relevant):
        return 'Not Run'
    if 'Blocked' in relevant:
        return 'Blocked'
    if all(s == 'Pass' for s in relevant):
        return 'Pass'
    return 'Partial'


def blank_result(test):
    return {'actual': '', 'evidence': '', 'scenarios': {
        s['id']: {'status': 'Not Run', 'actual': '', 'evidence': ''} for s in test['scenarios']}}


RUNNER_FIELDS = ('os_system', 'os_product', 'os_build', 'python_version', 'checkout_branch', 'checkout_head')


def detect_runner_environment(root=None):
    """Privacy-minimal diagnostics; never installed-artifact or test-host assertions."""
    system = platform.system()
    runner = dict.fromkeys(RUNNER_FIELDS, '')
    runner.update(os_system=system, os_product=system + ' ' + platform.release(),
                  os_build=platform.version() if system == 'Windows' else platform.release(),
                  python_version=platform.python_version())
    if root:
        for field, args in [('checkout_branch', ['branch', '--show-current']),
                            ('checkout_head', ['rev-parse', 'HEAD'])]:
            try:
                runner[field] = subprocess.run(['git', *args], cwd=root, capture_output=True,
                                              text=True, timeout=2, check=True).stdout.strip()
            except (OSError, subprocess.SubprocessError):
                pass
    return runner


def use_current_machine(session, runner):
    """Explicit user action: update only detectable Test Environment OS fields."""
    session['environment']['os_product'] = runner.get('os_product', '')
    session['environment']['os_build'] = runner.get('os_build', '')


def copy_checkout_revision(session, runner):
    """Explicit user assertion that checkout and installed artifact match."""
    session['environment']['plugin_branch'] = runner.get('checkout_branch', '')
    session['environment']['plugin_commit'] = runner.get('checkout_head', '')


def migrate_session(session):
    """Upgrade schema 1 additively, preserving all original evidence and unknown entries."""
    require(isinstance(session, dict), 'Session must be an object')
    migrated = deepcopy(session)
    if type(migrated.get('schema_version')) is int and migrated['schema_version'] == 1:
        migrated['schema_version'] = 2
        # No way to infer the previous runner from the possibly stale Test Environment.
        migrated.setdefault('runner_environment', {})
        migrated.setdefault('runner_history', [])
        migrated['test_environment_review_required'] = True
    return validate_session(migrated)


def prepare_for_runner(session, runner):
    """Refresh diagnostics and explain material differences without touching evidence."""
    updated = migrate_session(session)
    previous = updated['runner_environment']
    differences = [key for key in RUNNER_FIELDS if previous.get(key, '') != runner.get(key, '')]
    warning = ''
    if previous and differences:
        warning = (f'This session was previously opened on {previous.get("os_product", "an unknown OS")} '
                   f'and is now running on {runner.get("os_product", "an unknown OS")}. '
                   f'Runner fields changed: {", ".join(differences)}. '
                   'Review the Test Environment before continuing; it has not been changed.')
        updated['runner_history'].append(deepcopy(previous))
    if updated['test_environment_review_required']:
        warning += (' Legacy session: runner provenance was not recorded separately. '
                    'Its Test Environment may contain copied OS/checkout defaults. '
                    'Review and explicitly correct it; existing results have been preserved.')
    updated['runner_environment'] = {key: runner.get(key, '') for key in RUNNER_FIELDS}
    return validate_session(updated), warning.strip()


def new_session(catalog, root=None, runner=None):
    environment = dict.fromkeys(ENV_FIELDS, '')
    environment.update(session_name='Untitled session', test_datetime=datetime.now().astimezone().isoformat(timespec='seconds'),
                       api_endpoint='127.0.0.1:26538', protocol='HTTP')
    return {'schema_version': 2, 'session_id': str(uuid.uuid4()),
            'definition_version': catalog['definition_version'], 'definition_sha256': fingerprint(catalog),
            'catalog_snapshot': deepcopy(catalog), 'environment': environment,
            'runner_environment': deepcopy(runner if runner is not None else detect_runner_environment(root)),
            'runner_history': [], 'test_environment_review_required': False,
            'suite_id': 'full-matrix', 'selected_test': catalog['tests'][0]['id'],
            'results': {t['id']: blank_result(t) for t in catalog['tests']}}


def validate_session(session):
    require(isinstance(session, dict) and type(session.get('schema_version')) is int
            and session['schema_version'] == 2, 'Unsupported session schema_version')
    require(isinstance(session.get('runner_environment'), dict), 'Missing Runner Environment')
    require(isinstance(session.get('runner_history'), list), 'Missing runner history')
    for runner in [session['runner_environment'], *session['runner_history']]:
        require(isinstance(runner, dict) and all(isinstance(v, str) for v in runner.values()),
                'Runner Environment values must be text')
    require(type(session.get('test_environment_review_required')) is bool, 'Missing provenance review flag')
    catalog = validate_catalog(session.get('catalog_snapshot'))
    require(session.get('definition_sha256') == fingerprint(catalog), 'Catalog snapshot hash mismatch')
    require(session.get('definition_version') == catalog['definition_version'], 'Definition version mismatch')
    require(isinstance(session.get('session_id'), str) and session['session_id'], 'Missing session ID')
    require(isinstance(session.get('environment'), dict), 'Missing environment')
    require(all(isinstance(v, str) for v in session['environment'].values()), 'Environment values must be text')
    require(isinstance(session.get('suite_id'), str) and session['suite_id'] in
            {s['id'] for s in catalog['suites']}, 'Unknown session suite')
    require(isinstance(session.get('selected_test'), str) and session['selected_test'] in
            {t['id'] for t in catalog['tests']}, 'Unknown selected test')
    require(isinstance(session.get('results'), dict), 'Missing results')
    expected = {t['id']: {s['id'] for s in t['scenarios']} for t in catalog['tests']}
    require(set(expected) <= set(session['results']), 'Session missing test results')
    for test_id, result in session['results'].items():
        require(isinstance(result, dict), 'Result must be an object')
        for key in ('actual', 'evidence'):
            require(isinstance(result.get(key), str), f'Result {key} must be text')
        require(isinstance(result.get('scenarios'), dict) and result['scenarios'], 'Missing result scenarios')
        require(expected.get(test_id, set()) <= set(result['scenarios']), 'Session missing scenario results')
        for row in result['scenarios'].values():
            require(isinstance(row, dict) and row.get('status') in STATUSES, 'Invalid result status')
            require(all(isinstance(row.get(k), str) for k in ('actual', 'evidence')), 'Scenario notes must be text')
    return session


def test_status(session, test_id):
    return aggregate(s['status'] for s in session['results'][test_id]['scenarios'].values())


def filtered_tests(session, search='', status='All', platform_filter='All', tag='All', suite_id=None):
    catalog = session['catalog_snapshot']
    suite_id = suite_id or session['suite_id']
    allowed = next(s['tests'] for s in catalog['suites'] if s['id'] == suite_id)
    search = search.strip()
    exact_id = search.upper() if search.upper() in {t['id'] for t in catalog['tests']} else None
    by_id = {t['id']: t for t in catalog['tests']}
    return [t for t in (by_id[tid] for tid in allowed)
            if (t['id'] == exact_id if exact_id else
                 (not search or search.casefold() in json.dumps(t, ensure_ascii=False).casefold()))
            and (status == 'All' or test_status(session, t['id']) == status)
            and (platform_filter == 'All' or platform_filter in t['platforms'])
            and (tag == 'All' or tag in t['tags'])]


def progress(session, tests):
    counts = Counter(test_status(session, t['id']) for t in tests)
    scenario_counts = Counter(s['status'] for t in tests
                              for s in session['results'][t['id']]['scenarios'].values())
    return counts, scenario_counts


def definition_changes(session, current):
    old = {t['id'] for t in session['catalog_snapshot']['tests']}
    now = {t['id'] for t in current['tests']}
    return {'changed': session['definition_sha256'] != fingerprint(current),
            'orphaned': sorted((old | set(session['results'])) - now), 'added': sorted(now - old)}
