# Manual bugfix 04 — Test Environment provenance and corrected Windows evidence

Date: 2026-10-16 (America/Chicago). Stage 1.5 bug-fix/evidence micro-stage only. Repository Scarfmeister/Pear-StreamDeck; branch `dev/pear-port`; starting SHA **`a6f89eefc707d999478abce8c9e5ca8245381b09`**. Fetched all remotes, checked out integration branch, pulled fast-forward-only and inspected recent commits. Tracked tree was clean; the only untracked path was the explicitly supplied evidence input `docs/manual-testing/2026-10-16-windows-baseline-acceptance-corrected.md`. Reported that condition before editing; no unrelated local work existed or was discarded. No Pear checkout touched.

Final SHA is the commit containing this checkpoint. After fetch resolve its full value with:

```sh
git log -1 --format=%H --grep='^fix: separate manual test and runner provenance$' origin/dev/pear-port
```

The completion report supplies the exact final SHA. Root instructions, Stage 1 and 1.5 checkpoints, manual runner guide/source/tests, decisions, current evidence/status/requirements/handoff/spec were reviewed. Original MIT/XeroxDev attribution/history and default branch are preserved.

## Defect and confirmed root cause

The Stage 1.5 runner initialized `environment.plugin_branch/plugin_commit` from checkout Git and Test OS from its current machine. It also stored `.manual-test-sessions/last-session.txt` inside the checkout. Copying the Nobara checkout/session directory through a network share allowed Windows testing to resume Linux-origin metadata, repeating stale environment fields in exported test blocks. Checkout HEAD was not proof of the installed plugin. The corrected user report explicitly normalizes the actual Windows test environment after export; this stage does not pretend the original export was correct.

## Source changes and migration

- `model.py`: separate privacy-minimal **Runner Environment** (OS system/product/build, Python version, checkout branch/HEAD) from authoritative **Test Environment** (`environment`, existing editable fields). New installed plugin branch/commit and Test OS are blank. Detect no username/hostname/IP/serial/path. Explicit OS-only Use Current Machine and confirmed checkout-copy actions are separate pure functions. On open compare saved/current runner diagnostics; warn on material changes without modifying Test Environment/results; preserve previous diagnostics as history.
- Session **schema 2**, catalog schema still **1** and definition content/hash unchanged. Schema 1 migrates additively in memory; old environment, complete results/statuses/notes/evidence, catalog snapshot/version/hash and unknown historical entries are preserved. Add runner diagnostics/history and legacy provenance review flag. Unknown future schemas reject without rewriting. No result conversion or hardware rerun required. Old runner cannot read schema 2; back up important files if older-tool access matters. GUI shows a review warning and autosaves migrated schema; headless export migrates in memory without rewriting source JSON.
- `storage.py`: machine/user-local state directory, pointer remember/read helpers. Windows `%LOCALAPPDATA%/PearStreamDeck/manual-testing/` (fallback `~/AppData/Local/...`); Linux `$XDG_STATE_HOME/pear-streamdeck/manual-testing/` or `~/.local/state/pear-streamdeck/manual-testing/` when unset/relative. New default sessions use `sessions/` there; Open/`--session` accepts existing local/shared JSON anywhere. The copied checkout-local pointer is ignored, not deleted or imported. Old checkout JSON remains manually openable. Operational resume paths remain local state, never exported diagnostics.
- `gui.py`: independently labelled Test/Runner Environment, material-change/legacy review warnings, explicit **Use Current Machine as Test Environment** (OS product/build only), confirmed **Copy checkout revision to installed plugin fields**, existing explicit local installer hash, and **Done (Test Environment reviewed)**. Session loading preserves authoritative environment. Copying source alone cannot activate its old pointer on a fresh machine. Source can still run from a share; no unreliable share detection.
- `exporter.py`: Markdown separately labels authoritative Test Environment and diagnostic Runner Environment; failure reports use only authoritative Test Environment. Allowlisted fields exclude unknown/private runner metadata. Free-form notes still require secret review. Headless exports show last saved runner association; they do not silently retag hardware evidence with the export machine.
- New `test_provenance.py` tests migration/cross-machine persistence/warnings/explicit actions/state paths/export privacy and corrected-report integrity. Existing 39 catalog/storage/report tests retained. Guide, MANUAL_TESTING, IMPLEMENTATION_STATUS, REQUIREMENTS_STATUS, HANDOFF, D025/D026, report index and Stage 1.5 checkpoint updated with current evidence/supersession.

Use one process per session, closing before opening on the other machine. Prefer local raw sessions and backups; network filesystems may have different atomic/durability semantics. Markdown can be exported to the shared/project directory. This is not a backup, multi-writer locking or network-share detection service. Privacy-minimal matching diagnostics cannot distinguish otherwise identical machines.

## Corrected Windows evidence and provenance

Durable canonical report: [2026-10-16-windows-baseline-acceptance.md](../manual-results/2026-10-16-windows-baseline-acceptance.md). The supplied temporary file was moved out of `docs/manual-testing/`; only trailing whitespace/line endings were normalized for repository checks. Text, observations, duplicated empty notes, aggregate/scenario statuses and the supplied metadata-correction note were retained. No raw active Windows JSON was supplied or reconstructed.

- Supplied input SHA-256: `34c757a7917301d77920cd6aad88baefa1b6abd539cdd601f354a47be096799f`.
- Durable whitespace-normalized SHA-256: `d7077c24c39cdfb43b095495ff828ec7270a9f9f73d9e999783a8111a4c4338a`.
- Session **Windows baseline acceptance — 2026-10-16**, Scarfmeister, `2026-10-16T20:39:25-05:00`; Windows 11 Pro 25H2 /build **26200.9457**; Elgato Stream Deck **7.4.2.22730**; Stream Deck Plus /firmware **2.0.3.7**; plugin `dev/pear-port` /`a6f89eefc707d999478abce8c9e5ca8245381b09`; Pear `feature/streamdeck-api-extensions` /`a9ea223c99ede0876343db5898b944ea5170ad1f`; HTTP `127.0.0.1:26538`, AUTH_AT_FIRST, English. Installer SHA-256, Pear version and other blank fields remain unknown; no binary hash/version is inferred.

| Result | Count | IDs |
| --- | --- | --- |
| Pass | 14 | H01 H02 A01 A02 R01 R02 R07 K01 K02 K03 K05 K08 D01 D02 |
| Fail | 4 | K04 K06 P01 D04 |
| Blocked | 4 | P02 P03 P04 D03 |
| Partial | 3 | H06 R06 K07 |
| Not Run | 17 | H03 H04 H05 A03 A04 A05 A06 R03 R04 R05 K09 P05 P06 D05 I01 I02 I03 |
| Not Applicable | 0 | None |

Scenarios: **Not Run 52, Pass 49, Fail 4, Blocked 4, N/A 0**. Integrity test confirms touched-row Not Run 19 plus untouched-row scenarios 33 = 52. The summary is not recomputed to a different outcome. H06 s1 is Pass and s2 Not Run → Partial. Pear actions are excluded from Multi Action/Multi Action Switch/Random Action, present in Key Logic/Dial Stack/Action Wheel/Action Trigger; later evaluation of those categories remains separate. R06 profile/PI switching passed but rapid rotation/remove/disconnect is unrun; K07 normal toggle passed but legacy queue is unrun.

These are reported scenario results on one Windows environment. No other host/device/minimum-version pass is inferred. A01/A02/R02 now have scoped approval/restart evidence, but A03/A06/I01 and full PI01 are not automatically passed. This stage records user evidence; Codex performed no new hardware tests.

## Findings deliberately not fixed

1. **K04:** normal mute/restore passes; zero distinction fails. Pear's own icon changes at 0, and unmuting sets 5%. Investigate intended Pear mute semantics, deliberate zero=mute behavior and the test expectation before assigning a plugin bug. Keep the recorded Fail/expectation unchanged here.
2. **K06:** formats pass; pause Fail has no useful actual/evidence explanation; remaining scenarios unrun. Focused reproduction before code changes; no invented failure mechanism.
3. **P01:** Start failed /`Pear request failed (HTTP 503)` with public, unlisted and private playlists. **P02–P04 are dependent Blocked**, not independent failures. Investigate startup availability/dispatch error before a separately authorized fix.
4. **D03:** s1 “Save 0, 1, several and 16 selector entries” Blocked with blank Actual/Evidence; cause absent. Do not attribute it to P01 or D04 without evidence. Remaining sub-checks unrun.
5. **D04:** “When saving the action settings, the image file entry is cleared.” Future PI/selector persistence bug candidate; other sub-checks unrun.
6. **K03 Pass /UX backlog:** filled active thumbs-up/down preferred over outline color changes/hearts. D026 associates this with future D022 visuals/Control Dial work, not a failed test. No icon change.

No plugin runtime/action/UUID/manifest/dependency/version change, Pear code, installer rebuild, redesign, Stage 2 development, branch merge, PR merge or release.

## Validation and user verification

- Python **3.14.7**, `python3 -m unittest discover -s tests/manual-testing -v`: **62 tests pass** (39 existing +23 provenance/evidence checks). Covers both cross-OS directions, target persistence, material-change warning, explicit OS-only action, checkout-vs-installed separation, migration/result preservation including unknown historical entries, Windows/XDG/fallback paths, old checkout-pointer ignore/manual JSON reopen, export labels/authoritative failure reports/privacy, and exact corrected matrix/scenario totals. Existing definition/matrix/PI integrity retained.
- `python3 scripts/manual-test-runner.py --validate`: **Pass**, 42 matrix /43 total /5 suites. Python syntax compilation passes. No catalog/expectation modification.
- `npm run lint`: **Pass** (22 TS files /15 IDs); `npm run typecheck`: **Pass** (source and test types); `npm test`: **Pass**, all **11 test files**, source/localization checks included. No local Stream Deck packaging/build needed for runner-only source changes.
- `git diff --check`: **Pass**; **262 local Markdown links/anchors across 44 files** resolve; protected runtime/metadata/license/dependency/catalog byte comparison passes. Remote/local/PR-head equality and open/unmerged PR #1 checked after push.
- Updated GUI itself **Not manually verified by Codex**; no usable display. Pure tests do not imply desktop acceptance. Existing user report proves prior runner use on Windows, not acceptance of these new controls.

User verification: Windows `py -3 scripts\manual-test-runner.py`; Linux `python3 scripts/manual-test-runner.py`. Use a temporary session: confirm installed fields initially blank and checkout revision separate; enter distinctive target fields/results; save/close. Open the same JSON on the other machine, verify review warning plus unchanged Test Environment/results and refreshed Runner Environment; export and inspect separate labels. Repeat in reverse with only one process open. On a fresh machine, copied checkout `last-session.txt` alone must not resume. Open schema-1 JSON manually and confirm review warning/preserved statuses/notes. In dummy data only, Use Current Machine must change only OS product/build; checkout-copy requires confirmation. Delete dummy outputs after checking. Existing real evidence does not need rerunning.

## Exact next action and stop

Recommend the first separately authorized small **P01 HTTP 503 playlist-start reproduction/diagnosis micro-stage**, because it blocks P02–P04. Capture sanitized API/plugin status/error and installed revisions; distinguish the failing boundary before any fix. Keep K04 semantics, K06 pause, D04 image persistence, D03 clarification and remaining blocked/partial/Not Run cases queued. Do not start that investigation now. Stop after this provenance/evidence commit/push and remote verification; PR #1 stays open/unmerged, no release.
