# Manual verification 03 — Pear API volume correction

Recorded **2026-10-07**. Documentation/manual acceptance only; no runtime change, rebuild, release or PR #1 merge. Starting connector head: `76a5a9c` on `dev/pear-port`, fetched/pulled with clean working tree. Runtime implementation remains `23cf3daa14d45a27310551d7ee727bdfaceba587`; exact installed plugin binary revision/hash was not supplied for this report.

## Tester, platform and revisions

Tester: repository owner/user reporting real Windows tests, not a Codex hardware session. Earlier repository record: Windows 11 Pro 25H2, numeric 10.0.26200, Stream Deck 7.4.2.22730, API 127.0.0.1:26538, AUTH_AT_FIRST. The new report establishes Windows keys and real Stream Deck Plus Volume Dial; firmware, ordinary key-device model and exact test timestamp were not supplied. Earlier setup fields are context, not new authentication verification.

Pear tested branch: **Scarfmeister/pear-desktop / `feature/streamdeck-api-extensions`**. Retrieved pushed SHA **`a9ea223c99ede0876343db5898b944ea5170ad1f`** using `git ls-remote https://github.com/Scarfmeister/pear-desktop.git refs/heads/feature/streamdeck-api-extensions`. The user identified the built branch; an independently captured binary SHA was not provided. Historical playlist-only branch/commit: **`feature/streamdeck-playlist-api` / `b5f13f65c71ca8890c08f52c7d7becde5d855be9`**.

## Manual results

- Default Pear direct POST → GET, in order: **75→47, 50→20, 75→47, 25→6, 100→100, 95→86, 60→29, 90→74**. This reproduces the nonlinear API defect without Stream Deck. Default-build exact SHA was not supplied.
- Corrected Pear direct PowerShell API: **Pass**, all tested requested values round-trip correctly with immediate visible player feedback. No exact patched value list was supplied; no additional values are claimed.
- Real Volume Down/Up keys: **Pass for observed behavior**, both directions and successive step changes, immediate Pear feedback, resulting confirmed Stream Deck displays, no previous large jumps or valid-command warning overlays.
- Real Plus Volume Dial: **Pass for observed behavior**, both directions, step behavior, rapid/sequential changes and confirmed display updates; previous jumps/warnings are gone.
- Mute: continues working. Complete zero-volume/external/duplicate-context mute checks remain unverified.

The plugin sends absolute requested volume and follows confirmed Pear state. Default API reproduction and the corrected API/device passes establish that the root cause was **Pear's player-bar write/read scale mismatch**, not the Stream Deck plugin's command logic. Pear now writes through the player API scale; no Stream Deck inverse/log correction or optimistic update was added. Sources: [#4458](https://github.com/pear-devs/pear-desktop/issues/4458), [#4672](https://github.com/pear-devs/pear-desktop/pull/4672), [Pear investigation](https://github.com/Scarfmeister/pear-desktop/blob/a9ea223c99ede0876343db5898b944ea5170ad1f/docs/streamdeck-volume-investigation.md).

## Scope, validation and remaining acceptance

Updated MANUAL_TESTING, HANDOFF, IMPLEMENTATION_STATUS, REQUIREMENTS_STATUS, README and Pear integration research; added this checkpoint. Earlier bug-fix checkpoints remain unchanged historical evidence. This is user-supplied manual acceptance, not a rerun of the historical 129 automated tests or a new installer.

Documentation validation: review scoped Pass labels and historical SHAs, check local Markdown targets/anchors, `git diff --check`, and verify only Markdown paths changed before commit. Runtime/build/package gates do not apply to this documentation-only change; no new runtime result is claimed.

K05/D01/K04 pass only observed portions on this Windows/Pear configuration. Bounds, all custom steps/invalid edits, persistence, zero-unmuted mute, PI retest/auth strategies, OpenDeck/macOS/other devices, reconnect/lifecycle, touch ordering, unrelated controls and signed-in playlist acceptance remain pending/not run. Next action: complete only authorized remaining manual scenarios and record their evidence; no new stage starts automatically. Stop after committing/pushing this documentation update; leave PR #1 unmerged and publish no release.

Final documentation SHA is retrievable after fetch with `git log -1 --format=%H --grep='^docs: record Windows volume acceptance with corrected Pear API$' origin/dev/pear-port`; the final response reports it.
