# Roadmap Stage 1.5 — cross-platform manual-test runner

**Later provenance/evidence micro-stage:** [manual bugfix 04](manual-bugfix-04-test-environment-provenance.md) corrects checkout-derived installed-plugin defaults and copied checkout-local resume state, adds schema-1 → 2 compatibility, and records the authoritative normalized Windows run. Original validation and pending-GUI statements below describe Stage 1.5 at its original commit; they are not rewritten as if provenance was correct then.

Date: 2026-10-16 (America/Chicago). Repository: Scarfmeister/Pear-StreamDeck; branch `dev/pear-port`. Starting SHA: **`5af962d4413901bc5af335d66e09ead3c19aee06`**. Fetched all remotes, checked out required branch, pulled fast-forward-only, inspected recent commits and confirmed clean tree before edits. Read root instructions, Stage 1 freeze, D022/D023, manual matrix, current spec/status/requirements/handoff and relevant bug-fix evidence. No local work discarded.

Final plugin SHA is the commit containing this checkpoint; after fetch resolve it with:

```sh
git log -1 --format=%H --grep='^feat: add manual acceptance test runner$' origin/dev/pear-port
```

The completion report provides the full final SHA. No Pear checkout or source was modified. Plugin version 2.3.0 /manifest 2.3.0.0, all runtime code/action UUIDs/manifest/lockfile and original MIT/XeroxDev history remain unchanged. No Stream Deck installer rebuilt locally, no hardware acceptance, action redesign, PR merge, integration merge, upstream Pear PR or release.

## Scope and changed components

- `scripts/manual-test-runner.py`: simple GUI launch, display-free `--validate` and `--export`; concise Tk/display failure messages.
- `scripts/manual_testing/{__init__,model,storage,exporter,gui}.py`: native ttk interface, pure catalog/session/aggregation/filter/progress contracts, atomic JSON, human reports. Standard library only, no Python dependency/lockfile/database or network access.
- `docs/manual-testing/test-cases.json`: schema 1 /definition `baseline-2026-10-16.1`, **42 matrix tests + PI01** (seven detailed PI retest scenarios), **five suites**. Titles/platforms/steps/expected/history describe frozen behavior, including installed Transport Dial and refresh-only touch. All H01–06/A01–06/R01–07/K01–09/P01–06/D01–05/I01–03 IDs retained. Catalog source is the Stage 1 manual document, not future D022 behavior.
- `tests/manual-testing/test_runner.py`: headless unittest contracts, including exact source-row/PI-step comparisons. `.github/workflows/ci.yml` runs Python tests and validation in existing CI, without changing the release workflow.
- `docs/manual-testing/README.md`: architecture/schema/status/save/export/keyboard and platform setup, exact user smoke procedure. `docs/manual-results/README.md`: reviewed evidence policy; no dummy report committed.
- `.gitignore`: local sessions and Python bytecode ignored. README/current manual/status/requirements/handoff and D024 link the interface; historical hardware evidence remains intact. `docs/checkpoints/stage-01-5.md` points here for root checkpoint naming convention.

## GUI/session/report features

Five overlapping plans: detailed Windows PI routing, Stage 2 existing keys, Stage 3 H/A/R/D/I+PI, playlists, full matrix. Search/exact ID/status/platform/tag/suite filters; filtered test/scenario progress; resizable panes, scrolling instructions/expected/history/notes, native text status controls, keyboard navigation, Previous/Next/Next Not Run. Environment contains all requested fields with safe local Git/OS/time detection, optional installer hashing and editable values. Prior evidence never initializes a current Pass.

Per-scenario Not Run/Pass/Fail/Blocked/N/A, plus computed Partial; test-level and scenario actual/evidence notes. Fail takes priority, N/A is excluded, Blocked takes priority over unresolved Pass/Not Run, and Pass requires all applicable checks to pass. The guide records exact edge cases. Result fields retain notes across navigation.

New/open/resume local sessions under ignored `.manual-test-sessions/`; 350 ms debounced autosave plus explicit/navigation/close flushing. Same-directory temporary file, fsync then atomic replace; POSIX directory fsync best effort. Save failures remain visible and leaving after failure requires explicit discard. The last default-folder session auto-resumes. Saved schema/catalog version/hash and complete snapshot preserve old definition semantics; orphaned results are retained; unknown schemas are rejected without rewriting.

Failure/Blocked/Partial clipboard report includes public environment/revisions, steps/expected/actual/evidence and scenario details. Markdown export creates a new report, defaults under `docs/manual-results/`, includes selected-suite summary and all recorded tests across the session (even outside current suite/filter), N/A, unresolved results and Not Run list. Unknown secret fields are excluded via allowlists; free-form notes still require human review. Persistent on-screen secret warning; no log gathering, uploads or binary copying.

## Validation and results

- Python **3.14.7**: **39 unittest tests pass**, display-free. Covers schema/version/duplicate/suite/status rejection, catalog integrity, exact current Markdown steps/expected/PI-step preservation, no inherited passes, optional Git detection, Unicode save/load, atomic replacement and failure-before-replace, old snapshots/orphans, aggregation/Partial/N/A, filters/progress, export and failure reports, secret-field exclusion and display-free CLI paths.
- `python3 scripts/manual-test-runner.py --validate`: **Pass**, 42 matrix /43 total definitions /5 suites.
- Headless export: **Pass** via subprocess/temp session/report in the unittest suite; dummy files removed automatically and not committed. Validation/import tested with Tk unavailable.
- `npm run lint`: **Pass**, 22 TypeScript files /15 IDs, source/runtime boundaries and syntax.
- `npm run typecheck`: **Pass**, source and test types.
- `npm test`: **Pass**, 11 test files including source/localization/browser/client/action/settings checks. This runner summarizes at file granularity; no new hardware result follows.
- Python syntax compilation, **245 local Markdown links/anchors across 42 files**, `git diff --check` and unchanged protected-path comparison pass. Remote/PR state is verified after publication. No local full installer/package/audit rerun was required for standalone testing tooling; CI retains its existing package checks.

## GUI smoke status and limitations

**GUI runtime Not manually verified by Codex.** Tkinter imports, but `Tk()` cannot connect to display `:0` in this environment. The actual launch command exits with a concise explanation and no traceback. No visible GUI session or physical-device test was performed; unit tests are not a GUI acceptance claim.

User smoke procedure is in the [runner guide](../manual-testing/README.md#first-user-smoke-test-dummy-evidence-only): temporary session → Stage 2 suite → verify environment → dummy first K05 scenario status/notes → close/relaunch/resume → keyboard/filter/resize/scale checks → temporary Markdown export/inspection and clipboard → delete dummy session/report. Test on Windows and Nobara/Linux where available. Do not commit dummy evidence.

Known limits: desktop visual/scaling/focus/clipboard behavior requires that user check; Tk bindings/display must exist; local atomic replace is not a backup/multi-writer lock; use one app per session. Export allowlists are not a general free-text secret detector. Session snapshots intentionally do not silently acquire new definitions; start New after catalog updates. No auto-import into historical Markdown, auto log collection, evidence copying or hardware control. Data/schema migrations beyond version 1 are future explicit work.

## Exact commands and next action

Windows:

```powershell
py -3 -m tkinter
py -3 scripts\manual-test-runner.py
```

Linux:

```bash
python3 -m tkinter
# If Tk bindings are missing on Fedora/Nobara:
sudo dnf install python3-tkinter
python3 scripts/manual-test-runner.py
```

Headless:

```bash
python3 -m unittest discover -s tests/manual-testing -v
python3 scripts/manual-test-runner.py --validate
python3 scripts/manual-test-runner.py --export path/to/session.json --output /tmp/report.md
```

Publication: logical `feat: add manual acceptance test runner` commit, push only `origin/dev/pear-port`, compare local/remote/PR heads and confirm clean tree/unchanged master; PR #1 stays open/unmerged. Stop after Stage 1.5.

**Next roadmap action after user accepts the GUI: Stage 2 — Accept the currently implemented key actions.** No Stage 2 testing is started here. Existing corrected PI/auth/persistence retest, K04/K05/D01 missing scenarios, other platforms/native playlist acceptance all retain their original Pending/Not Run status.
