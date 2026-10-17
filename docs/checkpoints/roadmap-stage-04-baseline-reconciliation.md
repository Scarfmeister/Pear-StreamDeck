# New roadmap Stage 4 — bounded baseline reconciliation

Date: 2026-10-16 (America/Chicago). Phase A question: does the currently implemented baseline work as claimed, and which corrections/evidence are needed before Stage 5? This is classification and work-queue establishment only. No reproduction packet below was executed; no runtime change, new hardware acceptance, redesign, package build, merge, release or upstream Pear PR.

## Starting state and accepted evidence

Fetched all configured remotes in both repositories, checked out required branches, pulled fast-forward-only, inspected recent commits and confirmed both working trees clean before edits. Expected heads matched:

| Repository | Branch | Starting SHA | End state |
| --- | --- | --- | --- |
| Scarfmeister/Pear-StreamDeck | dev/pear-port | `913715482ffd558742a3d5ff75fa0efd7900e200` | Documentation reconciliation commit containing this checkpoint; full SHA in completion report and retrieval below |
| Scarfmeister/pear-desktop | feature/streamdeck-api-extensions | `a9ea223c99ede0876343db5898b944ea5170ad1f` | Same SHA, read-only, no commit |

Plugin default branch remains `8b0c3320ce59b741b3165a1c8ac3a54b66c2c97a`; Pear origin/master remains `a8830222afffb4af98aaa9b19287ebc24952605b`. Plugin version 2.3.0 /manifest 2.3.0.0 unchanged. Original MIT/XeroxDev attribution and ancestry preserved. [PR #1](https://github.com/Scarfmeister/Pear-StreamDeck/pull/1) stays open/unmerged. Final plugin SHA is retrievable after fetch:

```sh
git log -1 --format=%H --grep='^docs: reconcile stage 4 baseline findings$' origin/dev/pear-port
```

Canonical Stage 2/3 Windows acceptance evidence is the [corrected 2026-10-16 report](../manual-results/2026-10-16-windows-baseline-acceptance.md), SHA-256 **d7077c24c39cdfb43b095495ff828ec7270a9f9f73d9e999783a8111a4c4338a**. Windows 11 Pro 25H2 /build 26200.9457; Elgato Stream Deck 7.4.2.22730; Stream Deck Plus /firmware 2.0.3.7; HTTP 127.0.0.1:26538, AUTH_AT_FIRST, English; reported installed plugin `a6f89eefc707d999478abce8c9e5ca8245381b09`, Pear integration SHA above. Installer hash and installed Pear application version **not supplied**, not inferred. Provenance was normalized after export as disclosed in the report; it is not retroactively claimed correct at original generation.

Unchanged matrix: **Pass 14 /Fail 4 /Blocked 4 /Partial 3 /Not Run 17 /N/A 0**. Scenarios: **Pass 49 /Fail 4 /Blocked 4 /Not Run 52 /N/A 0**. Pass IDs: H01 H02 A01 A02 R01 R02 R07 K01 K02 K03 K05 K08 D01 D02, only their recorded scenarios on this host. No whole Stage 2/3 completion, full PI01, other platform or unexecuted variant is inferred. Historical reports are byte-identical in this pass.

Read root instructions, Stage 1/1.5/provenance checkpoints, canonical report, manual/spec/status/requirements/decisions/handoff and relevant mute/volume, Track Info, native playlist, Plus/selector and PI research. Detailed source inventory and all 503 branches are in [Stage 4 source diagnosis](../research/stage-04-baseline-findings.md). That pinned record supplies conditions/contracts and reproducible source paths for the table below.

## Finding classification

Exactly one primary category per row. “Insufficient evidence” is a triage conclusion, not dismissal of an observed failure. No confirmed plugin defect, confirmed Pear defect or incorrect expectation can yet be established from these particular observations alone. Candidate owner identifies who must diagnose next, not a verdict. No row status changes or automatic passes.

| ID / current status | Primary classification | Owner /confidence | Exact evidence and expected baseline | Source /next action |
| --- | --- | --- | --- | --- |
| K04 Fail | **Insufficient evidence — reproduction needed** | Pear native-player/API semantics first, plugin state comparison second; high confidence in evidence gap | Normal mute/restore Pass; at zero Pear icon changes and unmute restores 5%. Expected actual mute flag, independent zero if reachable. No synchronized API flag captured. | Pear song-info-front, renderer onVolumeClick, control/WS; plugin state.ts/commands.ts/key display. S4.3 native/API/UI comparison; source does not prove intended zero coupling or restore policy. |
| K06 Fail | **Insufficient evidence — reproduction needed** | Plugin Track Info/controller/host rendering; high | Five formats Pass; pause Fail has blank useful Actual/Evidence; other scenarios unrun. Expected metadata retained while paused. | Key formatter/display and pear-key-actions pause harness support intended retention. S4.4 short external-pause vs key-press repro; no invented symptom. |
| P01 Fail | **Insufficient evidence — reproduction needed** | Pear API renderer/broker first; plugin diagnostics if needed; high on missing branch, medium on candidate readiness cause | Start failed /HTTP 503 on public/unlisted/private; expected one supported native startup or honest specific rejection. Response body/guard unknown. | REST→client→route→broker→adapter readiness→resolver. S4.1 capture safe code/outcome and readiness guard; not enough to assign a Pear/plugin defect. |
| P02 Blocked | **Blocked by another defect** | Shared playlist path /high | Always Normal first check Blocked; remaining comparison unrun. Expected native Normal or documented safe unsupported rejection. | P01 startup failure dependency as reported; after S4.1 fix packet, targeted Normal signed-in retest in S4.6. |
| P03 Blocked | **Blocked by another defect** | Shared playlist path /high | Always Shuffle first check Blocked; baseline/repeated trials unrun. Expected native Shuffle Play, no normal→shuffle→skip. | Same P01 dependency; native Shuffle semantics retest S4.6. |
| P04 Blocked | **Blocked by another defect** | Shared playlist path /high | Follow first check Blocked; external/unknown sub-checks unrun. Expected captured real shuffle, honest unknown-state rejection. | Same P01 dependency; Follow off/on/unknown targeted retest S4.6. |
| D03 Blocked | **Insufficient evidence — reproduction needed** | Plugin host settings/selector + tester clarification /high | “Save 0, 1, several and 16 selector entries” Blocked with blank Actual/Evidence; remaining sub-checks unrun. Expected local validated save independent of playback. | Editor→savePlaylistSelector→host settings does not call Pear. S4.5 image-free save/reopen/rotate/restart; do not attribute to P01/D04. |
| D04 Fail | **Insufficient evidence — reproduction needed** | Plugin PI/selector + Windows host settings/rendering /high | “When saving the action settings, the image file entry is cleared.” Expected saved embedded image/preview/icon persists, not a restored file-picker path. | Save recreates input but row.image→serialized image→preview/dial path exists. S4.2 distinguish empty picker from lost data at submitted/readback/restart boundary. UI ambiguity likely; actual loss not established. |
| H06 Partial | **Not Run — still an acceptance gap, not a defect** | Stream Deck host/encoder aliases /high | s1 Pass: absent in Multi Action/Multi Action Switch/Random Action; present Key Logic/Dial Stack/Action Wheel/Action Trigger. s2 aliases Not Run. | SupportedInMultiActions=false matches exclusion; no manifest prohibition on other named host categories. Presence alone proves neither violation nor full compatibility. Keep H06 unchanged; aliases with S4.6 D05. |
| R06 Partial | **Not Run — still an acceptance gap, not a defect** | Plugin shared lifecycle/command queues + host /high | Profile/PI switching Pass, rapid rotation/remove/disconnect Not Run. Expected bounded cleanup/no stale feedback or replay. | pear-session/key/dial controllers and command cancellation. Remaining target-host check S4.6. |
| K07 Partial | **Known limitation / defer** | Pear legacy queue/native shuffle /high | Normal toggle Pass; legacy queue Not Run. Expected safe alert/actual On if legacy off unsupported. | Existing standard-key research/confirmed shuffle handling. Conditional check when a legacy queue is available; no new implementation or Stage 5 block solely for its absence. |

**Runtime code now: no for every row. Manual definition now: no for every row.** Source proves the API carries a separate native mute flag and the PI rebuilds its file picker, but neither disproves the intended native mute/image-persistence assertions. Therefore catalog content/definition version remain unchanged. Historical Fail/Blocked/Partial are not silently converted to Pass. Detailed K04 six-question answers, K06/D03/D04 user procedures and 503 observability inventory are linked above.

## Phase A closure requirements

No complete external sequential roadmap file is stored here; this bounded gate implements the present Stage 4 request and preserves later stage ordering. It does not claim to rewrite an unavailable roadmap or require every platform in the 42-row matrix before architecture work.

### Must resolve before Stage 5

- Establish P01's exact failing boundary, then separately authorize the smallest owning-repository fix if needed; obtain supported native Normal/Shuffle startup and Follow evidence (P02–P04) without fallback/replay. Diagnostic success alone does not clear functional startup acceptance. If a real upstream limitation remains, it needs explicit bounded disposition, not a false pass.
- Resolve D04 stored-data vs empty-picker distinction; if actual data loss, separately fix and verify saved image/readback/restart/dial. Resolve D03 local list save/select/wrap/persistence independently.
- Resolve K04 reachable native/API mute semantics and whether the definition or implementation must change. Resolve K06 pause reproduction, and representative baseline metadata/title behavior; defects require scoped fixes/retests, not speculation.
- On the target Windows/Plus configuration, complete relevant A03–A06, R03/R04 and R06 remaining cleanup, K09, P05/P06 safety, D05/H06 aliases and I01 settings/draft/persistence checks. Retest affected passes after any runtime fix. Full PI01 need not duplicate every already-passed A01/A02/R02 step, but untested Save Connection/Reauthorize/settings/log routing portions need evidence.
- Record a coherent limitation/bug disposition and final full applicable automated regression gate at exact final plugin/Pear SHAs; run build/package/manifest validation if later runtime changes affect them. User reviews Phase A evidence before separately authorizing Stage 5. No new architecture, state API, artwork, Queue/Seek/Add-to-Playlist, Control Dial or autosave redesign is part of this closure.

### Can remain pending until release/platform testing

- H03/H04 Linux/OpenDeck/Flatpak and other hardware/macOS/Windows 10 evidence: optional for this Windows Phase A closure, required before making corresponding verified-release claims.
- H05 minimum 6.4/other-host checks before certifying declared compatibility for release; current Windows host observations do not pass the whole row.
- I02 German/French native-language review and I03 exhaustive icon/glyph/brightness checks before broad release claims. Basic Windows action availability/layout observations already exist, not exhaustive certification. K03 stronger filled thumbs feedback remains future D022 visuals, not a functional Phase A blocker.
- R05 controlled half-open diagnostic: safely deferred, with explicit acknowledged stale-state/no-heartbeat limitation; no continuous liveness detection is claimed. Not Run stays Not Run. Known legacy-queue K07 conditional scenario can remain pending when unavailable; do not fake Off or require a legacy queue hunt.
- Full stress/locale/platform variants of K06 metadata and duplicate native account/layout cases can remain release evidence if core retained-metadata and supported native startup are established and unavailable cases are documented explicitly. No unavailable case is marked Passed or “superseded by redesign.”

### Each current Not Run ID and scheduling disposition

All have primary category **Not Run — still an acceptance gap, not a defect**; automated coverage does not complete them. None is superseded by later design.

| ID | Disposition | Required evidence /reason |
| --- | --- | --- |
| H03 | Platform-specific optional Phase A evidence; before Linux release claims | Actual same-package OpenDeck import/runtime. |
| H04 | Platform-specific optional Phase A evidence; before Flatpak claims | Actual WebView/loopback/auth/persistence permissions. |
| H05 | Required before release compatibility claims | Declared minimum host and other claimed hosts; keep current-host sub-observations separate. |
| A03 | Required before Phase A close | Denial/interruption, explicit recovery, no duplicate prompt/loop. |
| A04 | Required before Phase A close | Revoked token recovery, no replay/leak. |
| A05 | Required before Phase A close | Explicit NONE on target Windows; no stale accepted token inference. |
| A06 | Required before Phase A close | Valid/invalid endpoint changes and origin-bound credential clearing; HTTPS subcase only if available/claimed. |
| R03 | Required before Phase A close | API disable/re-enable, honest state/no replay. |
| R04 | Required before Phase A close | Observable socket failure/reconnect, fresh snapshot and duplicate updates. |
| R05 | Safely deferred with known limitation | Controlled silent socket test; documented stale-until-failure behavior, not a demanded heartbeat implementation. |
| K09 | Required before Phase A close | Failed/unconfirmed state-aware commands never fabricate state/replay. |
| P05 | Required before Phase A close, relevant target-host cases | Stock missing route and safe unsupported/unavailable errors; unavailable accounts/layout variants remain documented release gaps. |
| P06 | Required before Phase A close, targeted controlled cases | Single active startup, pre-/post-permit cancellation and unknown no-replay safety. |
| D05 | Required before Phase A close | Current refresh-only touch/down/up semantics and retained aliases; combine H06 s2. |
| I01 | Required before Phase A close | Independent settings/save/readback/restart, drafts and corrected PI routing. |
| I02 | Required before release locale claims | Native-language/glyph/translation review; English observation is not de/fr acceptance. |
| I03 | Required before release visual certification | Full generic state/readability checks; future icon feedback does not erase baseline evidence gap. |

## Ordered Stage 4 micro-stage queue

Sequential packets; each requires separate authorization. Codex source ownership, ChatGPT Work evidence orchestration and User hardware work are distinguished. Stop and scope a fix packet if diagnosis changes the owning repository; never expand into redesign or multiple unrelated fixes.

| Packet | Owner | Exact goal /inputs | Stop condition | Manual verification |
| --- | --- | --- | --- | --- |
| **S4.1 P01 HTTP 503 diagnostic** | Codex: bounded diagnostic/source work; User: signed-in Windows measurement; ChatGPT Work: capture/report | This checkpoint + research inventory + reported revisions. Capture safe response code/outcome and actual renderer readiness/lifecycle booleans for one controlled supported Normal start. | Identify reproducible failing branch and owner, or document precise missing measurement. **No speculative runtime fix**; then define separate P01-only fix/regression packet if justified, before moving to native acceptance. | User records native player ready/normal baseline, safe HTTP body and whether any audio/queue change occurred. No automatic replay, tokens or native payload dumps. |
| **S4.2 D04 image diagnosis /conditional fix** | Codex: PI/settings boundary; User: Windows readback/icon checks; Work: evidence | Valid ≤24 KiB PNG/JPEG; source tests and exact runtime revision. Compare preview/icon/data before/after Save, reopen and restart; filename alone is insufficient. | Empty picker with persistent data: record UI ambiguity/disposition, no persistence fix. Actual loss: isolate boundary and authorize only that persistence fix with failing regression, then scoped retest. | Preview/dial + returned image presence/hash; local file not shared; restart proves host persistence. |
| **S4.3 K04 zero/mute semantics** | Codex: Pear API mapping; User: native/API/WS measurements; Work: contract disposition | Exact native/UI/GET/WS comparison at nonzero, zero and mute/unmute. Current synthetic zero/false test is not reachability proof. | Decide achievable expectation vs native semantics vs real defect. Definition-only correction if proved; runtime change requires own packet/repository authorization. | Record volume+isMuted/muted for each step, native icon and restoration value; no claim from UI alone. |
| **S4.4 K06 pause reproduction** | User: exact symptom; Codex: controller/state diagnosis; Work: evidence | Title+Artist, custom title cleared, known track; external pause separate from pressing Track Info. | Clear expected/actual at pause/resume; if repeatable defect, define smallest regression/fix. If cannot reproduce, record limitation/evidence without fabricating a mechanism. | Screenshot/text before/paused/resumed, both input routes, exact revisions; remaining variants separately. |
| **S4.5 D03 selector clarification/retest** | User: blocker explanation/save tests; Codex: local validation/settings; Work: evidence | Disposable image-free list 0/1/several/16; no playback prerequisite. | Actual save/validation failure localized or required list/wrap/persistence passes recorded. Do not inherit P01/D04 cause. | Save/reopen each size, rotate without press, edit/remove/reorder and restart/duplicates as available. |
| **S4.6 Required Windows gaps + dependent playlist acceptance** | User: hardware; Work: small evidence batches; Codex: only later authorized defects | Latest fixed SHAs and all preceding dispositions. Split auth/PI (A03–06/I01), lifecycle/state (R03/04/R06/K09), Plus aliases/touch (D05/H06), native playlist (P02–06) into individual runs. | Target-host Phase A requirements evidenced or explicitly escalated; do not execute the entire cross-platform matrix in one session. | Each scenario separately Pass/Fail/Blocked/Not Run with actual/evidence; preserve conditional K07/R05 and platform gaps. |
| **S4.7 Phase A full automated regression gate** | Codex: automated/build gate; Work/User: evidence review | Final plugin/Pear fix SHAs, scoped hardware reports and disposition queue. | Applicable full tests/types/lint, cross-repository contract and any runtime-required build/package checks pass; record inherited Pear warnings separately. Evidence review, then stop for explicit Stage 5 authorization. | User signs off scope/remaining release gaps; automation never substitutes for pending native/host acceptance. |

### Next single Codex prompt

```text
Stage 4.1 — Diagnose P01 playlist-start HTTP 503 only. On Scarfmeister/Pear-StreamDeck dev/pear-port and Scarfmeister/pear-desktop feature/streamdeck-api-extensions, fetch/pull and confirm clean heads. Read docs/checkpoints/roadmap-stage-04-baseline-reconciliation.md and docs/research/stage-04-baseline-findings.md plus canonical Windows evidence. Follow the 503 branch inventory; coordinate one controlled signed-in Windows reproduction to capture only HTTP status, allowlisted error code/dispatch and renderer/player readiness/lifecycle booleans. Prioritize measuring the actual #movie_player identity/isReady predicate, but do not assume it is defective. If existing diagnostics cannot locate the branch, prepare only a narrowly scoped privacy-safe diagnostic change with tests, preserving startup behavior. Stop once the failing guard/owner is established or the exact missing measurement is documented, and propose the next P01-only fix packet. Do not fix other findings, remove readiness guards blindly, add fallback/replay, change native Shuffle Play, begin Stage 5, merge, release or open an upstream Pear PR.
```

This prompt is the next proposed authorization, not work performed in this pass.

## Documentation changes and validation

Added this checkpoint and pinned source diagnosis; updated MANUAL_TESTING, IMPLEMENTATION_STATUS, REQUIREMENTS_STATUS and HANDOFF to use classifications and bounded Phase A gate. Root `stage-04.md` already records the historical implementation stage: do not overwrite it with the new-roadmap sequence. No new architectural decision: D022/D024/D025/D026 remain in force, so DECISIONS unchanged. Catalog/definition version and canonical reports unchanged; no test-expectation correction proved.

Validation results:

- `python3 -m unittest discover -s tests/manual-testing -v`: **62 tests pass**, including catalog/PI/evidence/provenance integrity.
- `python3 scripts/manual-test-runner.py --validate`: **Pass**, 42 matrix /43 total definitions /5 suites.
- `npm run lint`: **Pass**, 22 TS files /15 action IDs and source/syntax/runtime boundaries.
- `npm run typecheck`: **Pass**, source and test types.
- `npm test`: **Pass**, **11 test files**, source/localization checks included. Existing runner reports file granularity; no new physical/native acceptance claim.
- Local Markdown file/anchor check: **288 links across 46 files pass**; `git diff --check`: **Pass**.
- Protected-path comparison: runtime/tooling/tests/manifests/package/dependencies/license/AGENTS/DECISIONS/catalog/canonical reports unchanged; canonical report SHA-256 matches. Pear source tree clean and unchanged; both default heads match starting records.
 No TS/Pear runtime changes, installer rebuild, dependency install or package version change. Push only plugin dev/pear-port; verify remote/PR head equality and PR OPEN/unmerged, unchanged defaults and clean trees. Stop after this reconciliation; S4.1 is not started automatically.
