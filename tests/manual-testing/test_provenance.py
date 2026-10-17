"""Cross-machine provenance and schema-1 evidence preservation without Tk."""
from copy import deepcopy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts'))
from manual_testing import model, storage, exporter

CATALOG = model.load_catalog(ROOT / 'docs/manual-testing/test-cases.json')


def runner(system, head='checkout-only'):
    return dict(os_system=system, os_product=system + ' current', os_build='runner-build',
                python_version='3.14.7', checkout_branch='dev/pear-port', checkout_head=head)


class Provenance(unittest.TestCase):
    def setUp(self):
        self.session = model.new_session(CATALOG, runner=runner('Linux'))
        self.session['environment'].update(os_product='Windows 11 Pro 25H2', os_build='26200.9457',
                                           plugin_branch='installed-branch', plugin_commit='installed-artifact',
                                           host_version='7.4.2.22730', firmware='2.0.3.7')
        self.session['results']['K05']['scenarios']['s1'].update(status='Pass', actual='real observation', evidence='local evidence')
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.folder = Path(self.temporary.name)

    def legacy(self):
        old = deepcopy(self.session)
        old['schema_version'] = 1
        for key in ('runner_environment', 'runner_history', 'test_environment_review_required'):
            old.pop(key)
        old['unknown_session_entry'] = {'history': ['retain']}
        old['environment']['unknown_legacy_field'] = 'retain environment'
        old['results']['OLD'] = {'actual': 'orphan notes', 'evidence': 'orphan evidence',
                                 'scenarios': {'old': {'status': 'Blocked', 'actual': 'reason', 'evidence': 'ref'}}}
        old['results']['K05']['scenarios']['historical'] = {'status': 'Fail', 'actual': 'historic', 'evidence': 'legacy log'}
        return old

    def test_detection_privacy_minimal_and_checkout_separate(self):
        with patch.object(model.platform, 'system', return_value='Windows'), \
             patch.object(model.platform, 'release', return_value='11'), \
             patch.object(model.platform, 'version', return_value='10.0.26200'), \
             patch.object(model.platform, 'python_version', return_value='3.14.7'), \
             patch.object(model.subprocess, 'run', side_effect=[subprocess.CompletedProcess([], 0, 'branch\n'),
                                                             subprocess.CompletedProcess([], 0, 'abc123\n')]):
            detected = model.detect_runner_environment(self.folder)
        self.assertEqual(set(detected), set(model.RUNNER_FIELDS))
        self.assertEqual(detected['checkout_head'], 'abc123')
        self.assertEqual(detected['checkout_branch'], 'branch')
        self.assertEqual(detected['os_system'], 'Windows')
        self.assertEqual(detected['python_version'], '3.14.7')
        self.assertNotIn(str(self.folder), json.dumps(detected))

    def test_detection_git_unavailable(self):
        with patch.object(model.subprocess, 'run', side_effect=FileNotFoundError):
            self.assertEqual(model.detect_runner_environment(self.folder)['checkout_head'], '')

    def test_linux_diagnostics_do_not_use_builder_version_text(self):
        with patch.object(model.platform, 'system', return_value='Linux'), \
             patch.object(model.platform, 'release', return_value='6.1'), \
             patch.object(model.platform, 'version', return_value='builder@host private'):
            self.assertNotIn('private', json.dumps(model.detect_runner_environment()))

    def test_new_session_no_installed_artifact_assertion(self):
        with patch.object(model, 'detect_runner_environment', return_value=runner('Windows')):
            session = model.new_session(CATALOG, self.folder)
        self.assertEqual(session['environment']['plugin_branch'], '')
        self.assertEqual(session['environment']['plugin_commit'], '')
        self.assertEqual(session['environment']['os_product'], '')
        self.assertEqual(session['runner_environment']['checkout_head'], 'checkout-only')

    def test_windows_target_reopened_on_linux(self):
        self.session['runner_environment'] = runner('Windows')
        updated, warning = model.prepare_for_runner(self.session, runner('Linux'))
        self.assertEqual(updated['environment'], self.session['environment'])
        self.assertEqual(updated['results'], self.session['results'])
        self.assertIn('Windows', warning)
        self.assertIn('Linux', warning)
        self.assertEqual(updated['runner_history'], [runner('Windows')])

    def test_linux_target_reopened_on_windows(self):
        self.session['environment'].update(os_product='Nobara Linux', os_build='6.17')
        updated, warning = model.prepare_for_runner(self.session, runner('Windows'))
        self.assertEqual(updated['environment'], self.session['environment'])
        self.assertIn('Review the Test Environment', warning)

    def test_same_runner_no_warning(self):
        _, warning = model.prepare_for_runner(self.session, runner('Linux'))
        self.assertEqual(warning, '')

    def test_checkout_change_also_warns_without_artifact_overwrite(self):
        updated, warning = model.prepare_for_runner(self.session, runner('Linux', 'other-checkout'))
        self.assertIn('checkout_head', warning)
        self.assertEqual(updated['environment']['plugin_commit'], 'installed-artifact')

    def test_explicit_current_machine_changes_only_two_os_fields(self):
        before = deepcopy(self.session)
        model.use_current_machine(self.session, runner('Linux'))
        for field, value in before['environment'].items():
            if field not in ('os_product', 'os_build'):
                self.assertEqual(self.session['environment'][field], value)
        self.assertEqual(self.session['environment']['os_product'], 'Linux current')
        self.assertEqual(self.session['environment']['os_build'], 'runner-build')
        self.assertEqual(self.session['results'], before['results'])

    def test_copy_revision_is_explicit_and_limited(self):
        before = deepcopy(self.session['environment'])
        model.copy_checkout_revision(self.session, runner('Linux'))
        self.assertEqual(self.session['environment']['plugin_commit'], 'checkout-only')
        for key in before:
            if key not in ('plugin_branch', 'plugin_commit'):
                self.assertEqual(self.session['environment'][key], before[key])

    def test_schema1_migration_preserves_all_evidence(self):
        old = self.legacy()
        unchanged = deepcopy(old)
        migrated = model.migrate_session(old)
        self.assertEqual(old, unchanged)
        self.assertEqual(migrated['schema_version'], 2)
        for key in ('environment', 'results', 'catalog_snapshot', 'definition_version', 'definition_sha256',
                    'suite_id', 'selected_test', 'unknown_session_entry'):
            self.assertEqual(migrated[key], old[key])
        self.assertTrue(migrated['test_environment_review_required'])
        self.assertEqual(migrated['runner_environment'], {})

    def test_legacy_open_does_not_infer_old_runner_from_target_os(self):
        migrated, warning = model.prepare_for_runner(self.legacy(), runner('Linux'))
        self.assertIn('Legacy session', warning)
        self.assertEqual(migrated['runner_history'], [])
        self.assertEqual(migrated['environment']['os_product'], 'Windows 11 Pro 25H2')

    def test_schema1_json_in_old_checkout_directory_remains_openable(self):
        legacy = self.folder / 'checkout/.manual-test-sessions/old.json'
        legacy.parent.mkdir(parents=True)
        legacy.write_text(json.dumps(self.legacy()), encoding='utf-8')
        before = legacy.read_bytes()
        loaded = storage.load_session(legacy)
        self.assertEqual(legacy.read_bytes(), before)
        self.assertEqual(loaded['results'], self.legacy()['results'])
        storage.save_session(legacy, loaded)
        self.assertEqual(storage.load_session(legacy), loaded)

    def test_test_environment_persists_after_roundtrip_and_runner_refresh(self):
        path = self.folder / 'shared.json'
        storage.save_session(path, self.session)
        reopened, _ = model.prepare_for_runner(storage.load_session(path), runner('Windows'))
        storage.save_session(path, reopened)
        self.assertEqual(storage.load_session(path)['environment'], self.session['environment'])

    def test_machine_local_windows_path(self):
        local = self.folder / 'LocalAppData'
        self.assertEqual(storage.application_state_directory('Windows', {'LOCALAPPDATA': str(local)}, self.folder),
                         local / 'PearStreamDeck/manual-testing')

    def test_windows_missing_localappdata_fallback(self):
        self.assertEqual(storage.application_state_directory('Windows', {}, self.folder),
                         self.folder / 'AppData/Local/PearStreamDeck/manual-testing')

    def test_linux_xdg_state_path(self):
        xdg = self.folder / 'state'
        self.assertEqual(storage.application_state_directory('Linux', {'XDG_STATE_HOME': str(xdg)}, self.folder),
                         xdg / 'pear-streamdeck/manual-testing')

    def test_linux_fallback_state_path(self):
        self.assertEqual(storage.application_state_directory('Linux', {}, self.folder),
                         self.folder / '.local/state/pear-streamdeck/manual-testing')

    def test_relative_xdg_state_ignored(self):
        self.assertEqual(storage.application_state_directory('Linux', {'XDG_STATE_HOME': 'relative'}, self.folder),
                         self.folder / '.local/state/pear-streamdeck/manual-testing')

    def test_copied_checkout_pointer_never_drives_resume(self):
        checkout = self.folder / 'checkout/.manual-test-sessions'
        checkout.mkdir(parents=True)
        session = checkout / 'old.json'
        session.write_text(json.dumps(self.legacy()))
        (checkout / 'last-session.txt').write_text('old.json')
        local_state = self.folder / 'local-state'
        self.assertIsNone(storage.resume_session_path(local_state))
        storage.remember_session(local_state, session)
        self.assertEqual(storage.resume_session_path(local_state), session.resolve())
        self.assertTrue((checkout / 'last-session.txt').exists())

    def test_separately_labeled_export_authoritative_failure_report(self):
        self.session['results']['K05']['scenarios']['s1']['status'] = 'Fail'
        report = exporter.markdown_report(self.session)
        self.assertIn('## Test Environment (authoritative)', report)
        self.assertIn('## Runner Environment (diagnostic only', report)
        failure = exporter.failure_report(self.session, 'K05')
        self.assertIn('Windows 11 Pro 25H2', failure)
        self.assertIn('installed-artifact', failure)
        self.assertNotIn('checkout-only', failure)
        self.assertNotIn('Linux current', failure)

    def test_no_private_runner_fields_in_export(self):
        self.session['runner_environment'].update(username='PRIVATE_USER', hostname='PRIVATE_HOST',
                                                  token='PRIVATE_TOKEN', network_path='PRIVATE_SHARE')
        self.session['runner_history'] = [{'password': 'PRIVATE_HISTORY'}]
        report = exporter.markdown_report(self.session)
        self.assertNotIn('PRIVATE_', report)
        self.assertEqual(set(model.detect_runner_environment()), set(model.RUNNER_FIELDS))


    def test_corrected_report_counts_and_h06_are_consistent(self):
        import re
        from collections import Counter
        text = (ROOT / 'docs/manual-results/2026-10-16-windows-baseline-acceptance.md').read_text(encoding='utf-8')
        blocks = re.findall(r'^### ([A-Z]\d\d)\n(.*?)(?=^### |^## Selected-suite tests still Not Run|\Z)', text, re.M | re.S)
        rows = {tid: re.search(r'^Status: (.+)$', block, re.M).group(1) for tid, block in blocks}
        counts = Counter(rows.values())
        untouched = set(model.MATRIX_IDS) - set(rows)
        counts['Not Run'] = len(untouched)
        self.assertEqual(counts, Counter({'Not Run': 17, 'Pass': 14, 'Fail': 4, 'Blocked': 4, 'Partial': 3}))
        self.assertEqual(rows['H06'], 'Partial')
        scenarios = Counter(re.findall(r'^- s\d+ — .*: (Pass|Fail|Blocked|Not Run|Not Applicable)$', text, re.M))
        scenarios['Not Run'] += sum(len(t['scenarios']) for t in CATALOG['tests'] if t['id'] in untouched)
        self.assertEqual(scenarios, Counter({'Not Run': 52, 'Pass': 49, 'Fail': 4, 'Blocked': 4}))
        block = dict(blocks)['H06']
        self.assertIn('s1 — Inspect host Multi Action availability: Pass', block)
        self.assertIn('s2 — place each supported ordinary key/dial and the retained encoder aliases: Not Run', block)


if __name__ == '__main__':
    unittest.main()
