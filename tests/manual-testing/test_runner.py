"""Display-free tests for the offline acceptance tool."""
from copy import deepcopy
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts'))
from manual_testing import model, storage, exporter

CATALOG_PATH = ROOT / 'docs/manual-testing/test-cases.json'
CATALOG = model.load_catalog(CATALOG_PATH)


class Contracts(unittest.TestCase):
    def setUp(self):
        self.catalog = deepcopy(CATALOG)
        self.session = model.new_session(self.catalog)
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.folder = Path(self.temporary.name)

    def invalid_catalog(self, change):
        change(self.catalog)
        with self.assertRaises(ValueError): model.validate_catalog(self.catalog)

    def test_load_definition(self):
        self.assertEqual(model.load_catalog(CATALOG_PATH), CATALOG)

    def test_schema_version(self):
        self.invalid_catalog(lambda c: c.update(schema_version=2))

    def test_schema_bool_is_not_version(self):
        self.invalid_catalog(lambda c: c.update(schema_version=True))

    def test_missing_definition_version(self):
        self.invalid_catalog(lambda c: c.pop('definition_version'))

    def test_duplicate_test(self):
        self.invalid_catalog(lambda c: c['tests'].append(deepcopy(c['tests'][0])))

    def test_missing_suite_reference(self):
        self.invalid_catalog(lambda c: c['suites'][0]['tests'].append('MISSING'))

    def test_duplicate_suite(self):
        self.invalid_catalog(lambda c: c['suites'].append(deepcopy(c['suites'][0])))

    def test_invalid_steps(self):
        self.invalid_catalog(lambda c: c['tests'][0].update(steps='not a list'))

    def test_empty_expected(self):
        self.invalid_catalog(lambda c: c['tests'][0].update(expected=[]))

    def test_duplicate_scenario(self):
        self.invalid_catalog(lambda c: c['tests'][0]['scenarios'].append(c['tests'][0]['scenarios'][0]))

    def test_missing_scenarios(self):
        self.invalid_catalog(lambda c: c['tests'][0].update(scenarios=[]))

    def test_catalog_integrity(self):
        matrix = next(s for s in self.catalog['suites'] if s['id'] == 'full-matrix')
        self.assertEqual(set(matrix['tests']), set(model.MATRIX_IDS))
        self.assertEqual(len(matrix['tests']), 42)
        pi = next(s for s in self.catalog['suites'] if s['id'] == 'windows-pi-retest')
        self.assertEqual(pi['tests'], ['PI01'])
        test = next(t for t in self.catalog['tests'] if t['id'] == 'PI01')
        self.assertEqual(len(test['steps']), 7)
        self.assertEqual(len(test['scenarios']), 7)

    def test_source_matrix_meaning_preserved(self):
        source = (ROOT / 'docs/MANUAL_TESTING.md').read_text()
        rows = [line for line in source.splitlines() if re.match(r'^\| [HARKPDI]\d\d \|', line)]
        self.assertEqual(len(rows), 42)
        for row in rows:
            tid, _, steps, expected = [cell.strip() for cell in row.strip('|').split('|')]
            test = next(t for t in self.catalog['tests'] if t['id'] == tid)
            self.assertEqual(test['steps'], [steps])
            expected = re.sub(r' \*\*Windows(?: Plus)? observed subset: Pass\*\*.*', '', expected)
            self.assertEqual(test['expected'], [expected])
        section = source.split('## Windows PI routing retest')[1].split('## Stage 8')[0]
        pi = next(t for t in self.catalog['tests'] if t['id'] == 'PI01')
        self.assertEqual(pi['steps'], re.findall(r'^\d\. (.+)$', section, re.M))

    def test_frozen_expectations(self):
        test = next(t for t in self.catalog['tests'] if t['id'] == 'D05')
        self.assertIn('Short touch only refreshes', test['expected'][0])
        self.assertEqual(next(t for t in self.catalog['tests'] if t['id'] == 'D02')['title'], 'Transport Dial')

    def test_new_session_all_not_run_despite_prior_evidence(self):
        self.assertTrue(any(t['prior_evidence'] for t in self.catalog['tests']))
        self.assertTrue(all(model.test_status(self.session, tid) == 'Not Run' for tid in self.session['results']))
        self.assertTrue(set(model.ENV_FIELDS) <= self.session['environment'].keys())
        self.assertNotEqual(model.new_session(self.catalog)['session_id'], self.session['session_id'])

    def test_session_snapshot_is_independent(self):
        self.catalog['tests'][0]['title'] = 'changed'
        self.assertNotEqual(self.session['catalog_snapshot']['tests'][0]['title'], 'changed')

    def test_git_detection_optional(self):
        with patch('manual_testing.model.subprocess.run', side_effect=FileNotFoundError):
            self.assertEqual(model.new_session(self.catalog, self.folder)['environment']['plugin_commit'], '')

    def test_roundtrip_unicode(self):
        self.session['results']['K05']['scenarios']['s1'].update(status='Pass', actual='日本語 → café', evidence='C:\\logs\\test.txt')
        target = self.folder / 'nested' / 'session.json'
        storage.save_session(target, self.session)
        self.assertEqual(storage.load_session(target), self.session)

    def test_atomic_replace_same_directory(self):
        target = self.folder / 'session.json'
        actual_replace = storage.os.replace
        seen = []
        def observe(source, dest):
            seen.append((Path(source), Path(dest)))
            self.assertEqual(Path(source).parent, target.parent)
            self.assertTrue(Path(source).exists())
            return actual_replace(source, dest)
        with patch('manual_testing.storage.os.replace', side_effect=observe):
            storage.save_session(target, self.session)
        self.assertEqual(len(seen), 1)
        self.assertFalse(seen[0][0].exists())
        self.assertEqual(list(self.folder.glob('*.tmp')), [])

    def test_failed_atomic_save_retains_original(self):
        target = self.folder / 'session.json'
        storage.save_session(target, self.session)
        original = target.read_bytes()
        self.session['environment']['tester'] = 'changed'
        with patch('manual_testing.storage.os.replace', side_effect=OSError('disk failure')):
            with self.assertRaises(OSError): storage.save_session(target, self.session)
        self.assertEqual(target.read_bytes(), original)
        self.assertEqual(len(list(self.folder.iterdir())), 1)

    def test_unknown_session_version_rejected_without_rewrite(self):
        self.session['schema_version'] = 7
        path = self.folder / 'old.json'
        path.write_text(json.dumps(self.session))
        before = path.read_bytes()
        with self.assertRaises(ValueError): storage.load_session(path)
        self.assertEqual(path.read_bytes(), before)

    def test_invalid_status(self):
        self.session['results']['K05']['scenarios']['s1']['status'] = 'Partial'
        with self.assertRaises(ValueError): model.validate_session(self.session)
        with self.assertRaises(ValueError): model.aggregate(['invalid'])

    def test_missing_saved_scenario_rejected(self):
        self.session['results']['K05']['scenarios'].pop('s1')
        with self.assertRaises(ValueError): model.validate_session(self.session)

    def test_snapshot_tamper_rejected(self):
        self.session['catalog_snapshot']['tests'][0]['steps'] = ['changed']
        with self.assertRaises(ValueError): model.validate_session(self.session)

    def test_old_definitions_retained_and_orphan_detected(self):
        self.session['results']['K05']['scenarios']['s1']['status'] = 'Pass'
        current = deepcopy(self.catalog)
        current['definition_version'] = 'future'
        current['tests'] = [t for t in current['tests'] if t['id'] != 'K05']
        for suite in current['suites']:
            suite['tests'] = [tid for tid in suite['tests'] if tid != 'K05']
        model.validate_catalog(current)
        changes = model.definition_changes(self.session, current)
        self.assertTrue(changes['changed'])
        self.assertIn('K05', changes['orphaned'])
        path = self.folder / 'old.json'
        storage.save_session(path, self.session)
        loaded = storage.load_session(path)
        self.assertEqual(loaded['definition_version'], self.catalog['definition_version'])
        self.assertIn('K05', exporter.markdown_report(loaded))

    def test_extra_orphan_result_retained_exported(self):
        self.session['results']['OLD'] = {'actual': 'historical', 'evidence': 'issue', 'scenarios': {'old': {'status': 'Fail', 'actual': '', 'evidence': ''}}}
        model.validate_session(self.session)
        report = exporter.markdown_report(self.session)
        self.assertIn('Orphaned historical result', report)
        self.assertIn('historical', report)

    def test_aggregation(self):
        for values, expected in [([], 'Not Run'), (['Not Run'], 'Not Run'),
                (['Pass', 'Pass'], 'Pass'), (['Pass', 'Not Run'], 'Partial'),
                (['Pass', 'Fail', 'Not Run'], 'Fail'), (['Blocked', 'Pass'], 'Blocked'),
                (['Blocked', 'Not Run'], 'Blocked'), (['Not Applicable'], 'Not Applicable'),
                (['Pass', 'Not Applicable'], 'Pass'), (['Not Run', 'Not Applicable'], 'Not Run'),
                (['Fail', 'Blocked'], 'Fail')]:
            with self.subTest(values=values): self.assertEqual(model.aggregate(values), expected)

    def test_partial_volume(self):
        self.session['results']['K05']['scenarios']['s1']['status'] = 'Pass'
        self.assertEqual(model.test_status(self.session, 'K05'), 'Partial')

    def test_suite_filters_progress(self):
        self.session['suite_id'] = 'stage-2-keys'
        tests = model.filtered_tests(self.session)
        self.assertEqual(len(tests), 9)
        self.assertEqual([t['id'] for t in model.filtered_tests(self.session, search='K05')], ['K05'])
        self.assertEqual(len(model.filtered_tests(self.session, tag='plus')), 0)
        self.assertEqual(len(model.filtered_tests(self.session, platform_filter='L-K')), 9)
        self.assertEqual(len(model.filtered_tests(self.session, status='Pass')), 0)
        counts, scenarios = model.progress(self.session, tests)
        self.assertEqual(counts['Not Run'], 9)
        self.assertGreater(scenarios['Not Run'], 9)

    def test_markdown_export_does_not_invent_pass(self):
        report = exporter.markdown_report(self.session)
        self.assertIn('- Pass: 0', report)
        self.assertIn('- Not Run: 42', report)
        self.assertIn('Prior evidence is context only', report)

    def test_export_all_touched_outside_suite(self):
        self.session['suite_id'] = 'stage-2-keys'
        self.session['results']['PI01']['actual'] = 'incomplete notes'
        self.session['results']['K05']['scenarios']['s1'].update(status='Fail', actual='wrong scale', evidence='local.log')
        report = exporter.markdown_report(self.session)
        for text in ('### PI01', 'wrong scale', 'local.log', '- K05: Fail', 'Scenario counts:'):
            self.assertIn(text, report)

    def test_failure_and_partial_reports(self):
        with self.assertRaises(ValueError): exporter.failure_report(self.session, 'K05')
        self.session['results']['K05']['scenarios']['s1'].update(status='Pass', actual='one step', evidence='log.txt')
        report = exporter.failure_report(self.session, 'K05')
        for value in ('Status: Partial', 'Steps:', 'Expected:', 'Actual:', 'Evidence:', 'one step', 'log.txt'):
            self.assertIn(value, report)
        self.session['results']['K05']['scenarios']['s1']['status'] = 'Blocked'
        self.assertIn('Status: Blocked', exporter.failure_report(self.session, 'K05'))

    def test_secret_fields_excluded(self):
        self.session['environment'].update(access_token='ENV_SECRET', password='PASSWORD_SECRET')
        self.session['access_token'] = 'SESSION_SECRET'
        self.session['results']['K05']['password'] = 'RESULT_SECRET'
        self.session['results']['K05']['scenarios']['s1'].update(status='Fail', token='SCENARIO_SECRET')
        for report in (exporter.failure_report(self.session, 'K05'), exporter.markdown_report(self.session)):
            for secret in ('ENV_SECRET', 'PASSWORD_SECRET', 'SESSION_SECRET', 'RESULT_SECRET', 'SCENARIO_SECRET'):
                self.assertNotIn(secret, report)

    def test_local_installer_hash(self):
        import hashlib
        path = self.folder / 'installer.streamDeckPlugin'
        content = bytes(range(256)) * 5000
        path.write_bytes(content)
        self.assertEqual(storage.file_sha256(path), hashlib.sha256(content).hexdigest())

    def test_export_protects_canonical_history(self):
        path = self.folder / 'docs' / 'MANUAL_TESTING.md'
        path.parent.mkdir()
        path.write_text('history')
        with self.assertRaises(ValueError): exporter.export_session(path, self.session, self.folder)
        self.assertEqual(path.read_text(), 'history')
        with self.assertRaises(ValueError): exporter.export_session(self.folder / 'session.json', self.session, self.folder)

    def test_suite_order_prominent_pi(self):
        self.session['suite_id'] = 'stage-3-baseline'
        self.assertEqual(model.filtered_tests(self.session)[0]['id'], 'PI01')

    def test_gui_missing_tk_short_error(self):
        import contextlib
        import io
        entry = ROOT / 'scripts/manual-test-runner.py'
        spec = importlib.util.spec_from_file_location('runner', entry)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        output = io.StringIO()
        with patch.dict(sys.modules, {'manual_testing.gui': None}):
            with patch.object(sys, 'argv', [str(entry)]), contextlib.redirect_stderr(output):
                self.assertEqual(module.main(), 1)
        self.assertIn('Tkinter is unavailable', output.getvalue())
        self.assertNotIn('Traceback', output.getvalue())

    def test_headless_validate_without_tk(self):
        entry = ROOT / 'scripts/manual-test-runner.py'
        spec = importlib.util.spec_from_file_location('runner', entry)
        module = importlib.util.module_from_spec(spec)
        with patch.dict(sys.modules, {'tkinter': None}):
            spec.loader.exec_module(module)
            with patch.object(sys, 'argv', [str(entry), '--validate']):
                self.assertEqual(module.main(), 0)

    def test_headless_export_command(self):
        source, target = self.folder / 'session.json', self.folder / 'report.md'
        storage.save_session(source, self.session)
        result = subprocess.run([sys.executable, str(ROOT / 'scripts/manual-test-runner.py'),
                                 '--export', str(source), '--output', str(target)], capture_output=True, text=True,
                                env={**os.environ, 'DISPLAY': ''})
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('- Pass: 0', target.read_text())


if __name__ == '__main__':
    unittest.main()
