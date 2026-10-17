# Manual acceptance runner

This offline Python/Tkinter tool is the human execution interface for the **frozen implemented baseline**. [MANUAL_TESTING.md](../MANUAL_TESTING.md) remains durable history. The runner reads committed [test-cases.json](test-cases.json), not Markdown at startup. It does not control Pear/Stream Deck, collect logs, contact GitHub, upload evidence or open entered URLs.

The catalog contains **42 matrix tests plus PI01** (seven detailed corrected Windows PI-routing checks), in **five overlapping suites**: Windows PI routing retest, Stage 2 keys, Stage 3 connection/PI/persistence/Plus, playlist acceptance and full 42-row matrix. Existing Transport Dial, explicit Save, five Track Info formats/static imagery and refresh-only touch remain current expectations. D022 redesign requirements are not current tests.

## Launch and prerequisites

Run from the checkout; npm is not required. Python 3 with Tkinter is required for the GUI; the model, tests, validation and export need no Tk/display.

Windows PowerShell:

```powershell
py -3 -m tkinter
py -3 scripts\manual-test-runner.py
```

`py -3` chooses Python 3; `-m tkinter` opens the standard Tk sanity-check window. Close that window before launching the runner. If Python/Tk is missing, use a Python installation that includes Tcl/Tk support.

Nobara/Fedora-family Linux:

```bash
python3 -m tkinter
# Only if the Tk bindings are missing:
sudo dnf install python3-tkinter
python3 scripts/manual-test-runner.py
```

`sudo` runs the package installation with administrator privileges; `dnf install` installs a package; `python3-tkinter` supplies the Fedora/Nobara Python Tkinter GUI bindings. The runner never installs packages automatically. Ensure the `python3` you run is the interpreter with those bindings (a separate Conda/virtual environment may use its own Tk). A desktop display is also required: installing bindings alone does not fix an inaccessible DISPLAY/Wayland/X server. Initialization failure prints a short explanation without a default traceback.

## Workflow and keyboard

Use **New** for a distinct environment/run, then **Environment** to complete session/tester/time, OS product and numeric build, host app/version, device/firmware, plugin branch/commit/package SHA-256, Pear version/branch/commit, API endpoint/protocol/auth mode, host language and notes. Local Git branch/HEAD, local OS and date/time are detected opportunistically; correct them to the **installed binary**, which may differ from the current checkout. Installer hashing reads only the file you select. No token field exists.

Select a suite, select a test, read expected/steps/prerequisites/history, choose a scenario, type actual/evidence, mark its status, then advance. Each scenario is required unless explicitly Not Applicable. The dropdown shows scenario statuses. **Test-level notes** are separate from each scenario's notes; choosing it does not change scenario statuses. No row is automatically passed by running PI01 or by prior history.

- Ctrl+N: new session; Ctrl+O: open session; Ctrl+S: force save; Ctrl+F: search.
- Alt+Left / Alt+Right: previous / next filtered test; Alt+Down: next Not Run or Partial test, with the first Not Run scenario selected.
- Tab / Shift+Tab: move focus (including out of notes); arrow keys: list/combobox selection; Space: activate focused button. No single-letter global result bindings.
- Text search includes definitions/history; an exact ID such as K05 targets that ID. Combine suite, platform, tag and status filters. They do not change results or mark ineligible tests N/A.
- Progress reflects the selected suite **and active filters**, including test and scenario counts. “With execution” includes Pass/Fail/Blocked scenarios; N/A is a disposition, not proof of execution. A selected detail may remain visible when a result change removes it from a status filter.

The panes resize; long expected/steps/history and notes scroll. Read-only expected content appears first. All controls use text labels, system fonts and native ttk styling where practical; no meaning depends on color. No simultaneous mouse/key gesture is required. The tool is intended for Windows and Linux; actual visual/scaling/keyboard acceptance on those desktops remains a user smoke test.

## Status and aggregation rules

Scenario statuses are **Not Run**, **Pass**, **Fail**, **Blocked**, **Not Applicable**. **Partial** is computed at test level, never directly stored as a scenario status.

Order of precedence:

1. Any Fail → Fail.
2. All N/A → Not Applicable.
3. Exclude N/A from required checks. If all remaining checks are Not Run → Not Run.
4. Any remaining Blocked → Blocked (including a mixture of Pass/Blocked/Not Run).
5. All remaining checks Pass → Pass.
6. A mixture of Pass and Not Run → Partial.

A prerequisite preventing execution is recorded as Blocked on affected scenarios, with a reason. Explicitly irrelevant scenarios are N/A, also with a reason. Prior evidence is read-only context and initializes no result. K05/D01/K04 historical subsets remain partial repository evidence; this session starts at Not Run.

## Sessions and autosave

Default files: `.manual-test-sessions/YYYY-MM-DD-<UUID>.json`, ignored by Git. A new session is saved immediately. Results, actual/evidence notes, environment and suite changes autosave after **350 ms** of inactivity; navigation/new/open/close/exports flush notes, and explicit Save writes immediately. A save failure remains visibly flagged; leaving offers a discard warning only after saving fails. Keep the window open and retry Ctrl+S if storage is unavailable.

Writes use a same-directory temporary file, flush/fsync, then atomic `os.replace`; POSIX directory fsync is attempted. This minimizes corruption, but it is not a backup service or a multi-writer lock. Open a session in one runner at a time; use a local filesystem. Keep backups for important long runs.

The last session in the default folder automatically resumes at next launch. **Open** or `--session path/to/session.json` resumes another file. To stop resuming a temporary run, create another session or delete its JSON after closing; a stale resume pointer is harmless. Raw sessions include notes and are never automatically committed or uploaded.

Sessions store schema version 1, definition version/hash and a complete **catalog snapshot**. Opening after a catalog update shows a notice and keeps the saved definitions/results unchanged; deleted definitions remain available as historical/orphaned results, and extra orphan results are retained/exported. There is no silent migration. Start a new session for current definitions. Unsupported session schemas or broken snapshot hashes are rejected without rewriting the file. Compatible older definition versions remain readable.

## Evidence, failure reports and export

**Do not include access tokens, token-bearing URLs, passwords, or other secrets in test evidence.** This warning remains on screen. Evidence accepts typed text, local screenshot/log paths and manually entered issue/URL references. “Insert local file path” stores a path only: no binary copy, collection or upload.

For a Fail, Blocked or Partial row, **Copy Failure Report** copies environment, steps, expected, test/scenario actual and evidence to the clipboard for a bug-fix request. Linux clipboard ownership can require keeping the app open until pasted. Unknown/imported secret fields are excluded through an environment/result field allowlist. Free-form notes are **not** a secret scanner: review them and all exports before sharing.

**Export Markdown** writes a new file (by default under [manual-results](../manual-results/README.md)); it does not rewrite MANUAL_TESTING.md. Reports include environment/revisions, definition version/hash, selected suite counts, scenario counts, all recorded tests (even outside the selected suite), their expected/steps/actual/evidence, N/A dispositions, unresolved Fail/Blocked/Partial results and the selected suite's Not Run list. Filters do not silently drop recorded evidence. Untouched tests in other suites remain in the session JSON. No Pass is invented. Review and commit genuine reports separately, then reference them from MANUAL_TESTING.md in an authorized evidence update. Never commit dummy smoke reports as hardware evidence.

## Headless validation, tests and export

```bash
python3 scripts/manual-test-runner.py --validate
python3 -m unittest discover -s tests/manual-testing -v
python3 scripts/manual-test-runner.py --export .manual-test-sessions/SESSION.json --output /tmp/manual-report.md
```

On Windows substitute `py -3` and a suitable output path. `--validate` validates catalog contracts and required matrix/PI coverage; `--export` reads a saved session's definitions without Tk or a display. `--output` selects a new `.md` report path; canonical MANUAL_TESTING.md and JSON output targets are rejected. `--definitions PATH` selects an alternate catalog for validation/new GUI sessions. An export always uses its saved snapshot.

## Catalog and session schema

Catalog schema version **1**:

- `schema_version`: integer 1 (format contract); `definition_version`: nonempty string, increment on content changes; `source`: provenance string; `context`: shared setup/limitations string array.
- `suites`: array of unique `id`, `name`, `description`, `tests` (unique references to existing test IDs). Tests can appear in multiple suites.
- `tests`: unique `id`, `title`; `platforms`, `tags`, `prerequisites`, `steps`, `expected` as string arrays (`platforms`/`steps`/`expected` nonempty); optional `platform_notes` string; `prior_evidence` string or null; nonempty `scenarios` array of unique local `id` and `title` strings.

Session schema version **1**:

- `session_id`, `definition_version`, canonical-JSON SHA-256 `definition_sha256`, full `catalog_snapshot`.
- `environment`: editable string fields named in `model.ENV_FIELDS`; no secret/credential fields are collected. Unknown imported fields are retained locally but not exported.
- `suite_id`, `selected_test`; `results` keyed by test ID. Each result has `actual`, `evidence`, and `scenarios` keyed by local scenario ID, each containing `status`, `actual`, `evidence`. Unknown historical test/scenario results are retained, not deleted. Aggregate statuses are calculated.

To add future tests, edit the JSON directly, use stable IDs (never reuse an ID for a different meaning), increment `definition_version`, add suite references and run validation/tests. Update human manual documentation in the same change. The one-time baseline extraction was checked against the Markdown matrix; the GUI never parses Markdown. Update the integrity test deliberately when an authorized feature changes the matrix. New future functionality must exist before it becomes a baseline expectation.

Architecture: `scripts/manual-test-runner.py` handles CLI/GUI launch; `manual_testing/model.py` validates catalogs/sessions and computes statuses/filters/progress; `storage.py` handles atomic files; `exporter.py` renders reports; `gui.py` supplies the Tk interface. Non-GUI modules never import Tk or access the network. Tests use standard-library unittest and temporary directories, including crash-before-replace, snapshot/orphan, secret-field exclusion and exact matrix/PI-step integrity cases.

## First user smoke test (dummy evidence only)

GUI runtime is **Not manually verified by Codex**: Tk imported but could not connect to display `:0`. No hardware test was run.

1. Launch; choose **New**, name it `TEMP GUI SMOKE — NOT HARDWARE EVIDENCE` in Environment, and note its saved JSON path.
2. Choose **Stage 2 — Existing key actions**. Verify/edit environment fields; confirm detected checkout SHA is not presented as an installed-binary assertion. Optionally hash an installer.
3. Select K05 and its first scenario; mark Pass **as dummy UI data only**, then enter `DUMMY — GUI smoke only` in actual and evidence. The row should be Partial, with the remaining checks Not Run.
4. Close and relaunch. Confirm default-folder auto-resume, environment, selected test, notes and result. Select the first scenario to inspect it; reopening selects the first scenario, not a stored scenario cursor.
5. Use Tab/Shift+Tab, Ctrl+F, Alt+Left/Right/Down and status buttons; check suite filters/progress, resizing, scrollbars and display scaling on your desktop.
6. Export Markdown to a **temporary location outside docs**; inspect environment, Partial/scenario results, expected/actual/evidence and Not Run counts. Try Copy Failure Report for Partial, then paste into a temporary editor (do not submit it as a real bug).
7. Close, delete that temporary JSON and Markdown, and create a fresh session on next launch. Do not commit these dummy results. Report real GUI usability defects separately.

After the user accepts the GUI, next is **Stage 2 — Accept the currently implemented key actions**. Stage 1.5 does not begin Stage 2.
