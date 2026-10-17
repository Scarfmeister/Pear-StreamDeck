"""Human-readable reports using only public environment fields and typed results."""
from pathlib import Path
from .storage import atomic_text
from .model import ENV_FIELDS, DISPLAY_STATUSES, progress, test_status, validate_session

WARNING = 'Do not include access tokens, token-bearing URLs, passwords, or other secrets in test evidence.'


def environment_lines(session):
    # Explicit allowlist: imported unknown/token/password fields are never exported.
    return [f'- {key.replace("_", " ")}: {session["environment"].get(key, "")}' for key in ENV_FIELDS]


def test_report(session, test_id):
    test = next((t for t in session['catalog_snapshot']['tests'] if t['id'] == test_id), None)
    result = session['results'][test_id]
    title = test['title'] if test else 'Orphaned historical result (definition unavailable)'
    lines = [f'Manual test: {test_id} — {title}', f'Status: {test_status(session, test_id)}', '',
             'Environment:', *environment_lines(session), '', 'Steps:']
    lines += [f'{n}. {s}' for n, s in enumerate(test['steps'], 1)] if test else ['Definition unavailable; result retained.']
    lines += ['', 'Expected:', *(test['expected'] if test else []), '', 'Actual:', result['actual'],
              '', 'Evidence:', result['evidence'], '', 'Scenarios:']
    names = {s['id']: s['title'] for s in test['scenarios']} if test else {}
    for sid, row in result['scenarios'].items():
        lines += [f'- {sid} — {names.get(sid, "Historical scenario")}: {row["status"]}',
                  f'  Actual: {row["actual"]}', f'  Evidence: {row["evidence"]}']
    return '\n'.join(lines)


def failure_report(session, test_id):
    validate_session(session)
    if test_status(session, test_id) not in ('Fail', 'Blocked', 'Partial'):
        raise ValueError('Copy report requires a Fail, Blocked or Partial result')
    return test_report(session, test_id)


def markdown_report(session):
    validate_session(session)
    catalog = session['catalog_snapshot']
    suite = next(s for s in catalog['suites'] if s['id'] == session['suite_id'])
    tests = [t for t in catalog['tests'] if t['id'] in suite['tests']]
    counts, scenario_counts = progress(session, tests)
    lines = ['# Manual acceptance session', '', WARNING, '', '## Environment', '', *environment_lines(session), '',
             f'Session ID: {session["session_id"]}',
             f'Definitions: {session["definition_version"]} / SHA-256 {session["definition_sha256"]}',
             '', f'Selected suite: {suite["name"]}', '', '## Selected-suite summary', '']
    lines += [f'- {status}: {counts[status]}' for status in DISPLAY_STATUSES]
    lines += ['', 'Scenario counts: ' + ', '.join(f'{s}: {scenario_counts[s]}' for s in DISPLAY_STATUSES), '',
              'Executed means a recorded Pass/Fail/Blocked scenario; N/A is a disposition, not execution.', '',
              '## Unresolved results (entire session)', '']
    unresolved = [tid for tid in session['results'] if test_status(session, tid) in ('Fail', 'Blocked', 'Partial')]
    lines += [f'- {tid}: {test_status(session, tid)}' for tid in unresolved] or ['None recorded.']
    lines += ['', '## Results (all recorded tests, including outside selected suite)', '']
    # Export all touched results, not just the currently filtered screen/suite.
    for tid, result in session['results'].items():
        touched = (test_status(session, tid) != 'Not Run' or result['actual'] or result['evidence']
                   or any(r['actual'] or r['evidence'] for r in result['scenarios'].values()))
        if touched:
            lines += ['### ' + tid, '', test_report(session, tid), '']
    lines += ['## Selected-suite tests still Not Run', '']
    lines += [f'- {t["id"]} — {t["title"]}' for t in tests if test_status(session, t['id']) == 'Not Run']
    lines += ['', 'Prior evidence is context only; no historical result was imported as a current Pass.', '']
    return '\n'.join(lines)


def export_session(path, session, root):
    """Write reviewed report output, protecting canonical history and session files."""
    target = Path(path).resolve()
    if target == (Path(root) / 'docs/MANUAL_TESTING.md').resolve():
        raise ValueError('Export a new report; MANUAL_TESTING.md is historical evidence.')
    if target.suffix.lower() != '.md':
        raise ValueError('Choose a .md report path; session JSON must not be overwritten.')
    atomic_text(target, markdown_report(session))
