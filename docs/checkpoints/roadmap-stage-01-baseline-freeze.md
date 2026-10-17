# New roadmap Stage 1 — pre-redesign baseline freeze

Date: **2026-10-16 (America/Chicago)**. Purpose: freeze the existing plugin and combined Pear integration before the new sequential roadmap's redesign. Historical implementation stages 1–9 are a separate sequence. **Planned redesign has not started.** Only Markdown documentation changed; no runtime, metadata, dependency, installer, Pear source, branch merge or release change.

## Repository revisions

Both repositories fetched all configured remotes, checked out their required integration branches, pulled fast-forward-only, inspected recent commits and confirmed clean trees before edits. Fetch/checkouts initially met the filesystem sandbox's read-only Git metadata restriction; approved escalated retries succeeded. No local work was discarded.

| Repository | Branch | Starting SHA | End SHA |
| --- | --- | --- | --- |
| Scarfmeister/Pear-StreamDeck | `dev/pear-port` tracking `origin/dev/pear-port` | `7a843269dc8b327adbbc9646b75ab3259ab80f23` | The documentation commit containing this checkpoint, resolved exactly by the command below; runtime baseline remains unchanged. |
| Scarfmeister/pear-desktop | `feature/streamdeck-api-extensions` tracking the same origin branch | `a9ea223c99ede0876343db5898b944ea5170ad1f` | `a9ea223c99ede0876343db5898b944ea5170ad1f` (no files changed, no commit needed) |

A commit cannot include its own hash. Resolve the full plugin end SHA after fetch with:

```sh
git log -1 --format=%H --grep='^docs: freeze roadmap stage 1 pre-redesign baseline$' origin/dev/pear-port
```

The completion report supplies that full SHA; the containing commit is also directly identifiable with `git log --diff-filter=A --format=%H -- docs/checkpoints/roadmap-stage-01-baseline-freeze.md`.

Plugin default/base `master` stays at `8b0c3320ce59b741b3165a1c8ac3a54b66c2c97a`. Origin is the Scarfmeister fork; upstream is XeroxDev/YTMD-StreamDeck. Original MIT notices, XeroxDev attribution and Git ancestry are preserved. [Fork PR #1](https://github.com/Scarfmeister/Pear-StreamDeck/pull/1) was queried: **OPEN**, `mergedAt: null`, `dev/pear-port` → `master`, initial head equal to the starting SHA. Verify final remote/PR head after publication; no merge is authorized.

Pear origin is Scarfmeister/pear-desktop. Package repository points to pear-devs/pear-desktop; fork `origin/master` and merge-base are `a8830222afffb4af98aaa9b19287ebc24952605b`. Combined integration extends that base through historical native-playlist commit `b5f13f65c71ca8890c08f52c7d7becde5d855be9`, corrected-volume implementation `1816966795ba025cce9afd179e028d5d814fdbb0`, then documentation head `a9ea223c99ede0876343db5898b944ea5170ad1f`. Historical branch **feature/streamdeck-playlist-api** remains evidence; it is not the recommended combined baseline. The Pear investigation's reviewed upstream SHA `66bab974ad47d3374bf3108473d0d45b2edd22d6` is historical research, not a claim to have checked current upstream compatibility here. No upstream Pear PR or integration merge was performed.

## Versions, host metadata and artifact

| Item | Frozen value / boundary |
| --- | --- |
| Plugin package | `io.github.scarfmeister.pear-streamdeck.sdplugin`, **2.3.0** |
| Manifest | Version **2.3.0.0**, UUID `io.github.scarfmeister.pear-streamdeck`, SDKVersion **2** |
| Stream Deck software minimum | **6.4**, metadata only; minimum-host operation unverified |
| OS metadata | Windows minimum **10** (NT semantics; covers Windows 11 numeric 10.0), macOS minimum **13** |
| Linux | Separate `manifest.linux.json` native-HTML override for OpenDeck; actual Linux/Flatpak/hardware Pending |
| Framework / build tools | Locked streamdeck-typescript **3.3.4**; development Node **24+**, historically validated official CLI **1.10.1** |
| Existing installer | `build/io.github.scarfmeister.pear-streamdeck.streamDeckPlugin` (ignored, present locally) |
| Existing installer SHA-256 | `00b598c005aa3f2938219ae926d689da19ceb4611af00dbe63a35ccd595068ac`, rehashed in Stage 1; matches PI checkpoint |
| Installer provenance | Historical implementation `23cf3daa14d45a27310551d7ee727bdfaceba587`, 59 files /381,053 unpacked bytes as previously documented; **no new build** in Stage 1 |
| Pear application package version | **3.12.0**; use SHA to distinguish stock/playlist-only/combined builds |
| Pear Electron | **42.5.0**, directly pinned in package devDependencies |

## Existing implementation and dependencies

The plugin already implements 12 keys, Volume Dial, the dial currently labelled Transport Dial (future **Control Dial**), and Playlist Selector Dial. It retains one plugin-owned Pear client/session/state, REST plus WebSocket, endpoint-bound authentication/global settings, confirmed-state commands, bounded reconnect and no automatic command replay. PI communicates through the plugin. Track Info currently has five text formats and a static generic image; PI forms currently require explicit Save. Selector wraps a local list rather than dynamically rebuilding a host Dial Stack. See [requirements matrix](../REQUIREMENTS_STATUS.md) and [handoff](../HANDOFF.md) for individual boundaries.

Required live setup: Pear API Server enabled, player loaded, matching localhost endpoint (connector default `127.0.0.1:26538`), AUTH_AT_FIRST approval or explicitly configured NONE. Standard API v1 controls target reviewed Pear 3.12.0. Later versions require compatibility checks.

The combined Pear build supplies:

- **Native playlist start:** authenticated `POST /api/v1/play-playlist`, strict playlist ID and boolean shuffle; renderer resolves and dispatches the supplied native Play/Shuffle Play command once. No normal-start → shuffle → skip workaround. HTTP dispatch acknowledgment is not audio confirmation. Unsupported controls and unsafe shuffled same-playlist legacy normal reuse fail safely; unknown outcomes never replay.
- **Correct API volume writes:** shared finite inclusive 0–100 validation, integer rounding, precise-volume routing where enabled, standard direct player `setVolume` plus slider synchronization. GET/WS use that same player scale; 204 remains dispatch-only. No plugin inverse-scale compensation or optimistic state update.

Sources: [Pear extension research](../research/pear-playlist-api-extension.md), [Pear integration README](https://github.com/Scarfmeister/pear-desktop/blob/a9ea223c99ede0876343db5898b944ea5170ad1f/src/plugins/api-server/README.md), [volume investigation](https://github.com/Scarfmeister/pear-desktop/blob/a9ea223c99ede0876343db5898b944ea5170ad1f/docs/streamdeck-volume-investigation.md). Pear package/source inspection confirms the combined branch, route documentation, volume schema, shared controls and direct renderer helper. These pinned records retain assumptions, unresolved native/live cases and implementation effects.

## Already-fixed bugs and real-device evidence

These are existing corrections, not Stage 1 discoveries:

1. **Windows manifest:** initial minimum `11` rejected Windows 11 reporting NT `10.0`; existing fix `25e63d4906519ea57a1ea2d4bb73eb905284d65e` uses minimum `10`. [Windows checkpoint](stage-09-windows-version-fix.md) and D020 retain original validation and superseded artifact history. Do not regress this metadata.
2. **PI context routing:** Windows 11 Pro 25H2 /10.0.26200 and Stream Deck **7.4.2.22730** installed actions and connected the backend/Pear API, but PI stayed `Waiting for plugin / Checking`. Host rejected PI getSettings/setSettings/sendToPlugin wrong-context messages. Existing fix `23cf3daa14d45a27310551d7ee727bdfaceba587` restores locked framework PI registration UUID/context, retaining separate action identity. [PI checkpoint](manual-bugfix-02-pi-context.md) and [routing research](../research/property-inspector-context-routing.md) record five automated regressions. **Full corrected manual retest remains Pending.** Independent prompted API diagnostics do not prove plugin authorization/persistence.
3. **Pear volume scale:** stock/default direct POST → GET reproduced **75→47, 50→20, 75→47, 25→6, 100→100, 95→86, 60→29, 90→74**. Combined Pear correction removes the player-bar scale mismatch. [Volume checkpoint](manual-verification-03-volume-api.md) records user-reported direct API round-trip success and immediate visible Pear changes; Volume Up, Volume Down, real Plus Volume Dial both ways, sequential/rapid stepping and resulting display updates worked; mute continued working; prior nonlinear jumps/warnings disappeared. Exact installed binaries/hashes and full corrected value list were not supplied. This is scoped Windows evidence, not full K05/D01/K04 passes.

## Automated evidence and explicit Pending areas

Historical plugin validation at the PI-corrected runtime: **129 tests /11 files**, zero failed/skipped/canceled; source/type checks, en/de/fr **204 leaves /136 runtime strings each**, HTTP integration with simulated native state, build/official validation/pack/archive passed. CLI had one intentional category/name warning; dependency audit had zero findings **at that checked date**. Stage 1 does not rerun or refresh those runtime/security claims.

Historical combined Pear validation: **49 focused tests** plus **1 Electron smoke test** passed across two runs; types/lint/build passed with documented inherited warnings. Aggregate format check still failed on **17 unchanged files**; changed TS formatting passed. These are existing limitations, not a Stage 1 regression or new clean-suite claim.

Still **Pending / Not run**, except the precise observed subsets above:

- Full corrected Windows PI routing retest; initial settings/status, Save Connection, plugin-mediated Reauthorize/approval, saved step readback and host restart/token/settings persistence.
- Denial/interrupted/revoked authorization, NONE, endpoint/protocol changes, shared/independent settings and other authentication strategies.
- Full K05/D01 volume bounds, all custom steps/invalid edits/persistence/external changes; full K04 zero-volume/unmuted/external/duplicate-context mute cases; precise-volume enabled/disabled native UI/HUD/saved-state acceptance.
- Other state-aware keys, Control Dial's existing transport behavior, selector entries/images/wrap/persistence, touch/down/up ordering, aliases, duplicates/lifecycle/reassignment, reconnect/API/player/host restart and no replay.
- Signed-in native Normal/Shuffle Play, same/different playlist and prior shuffle states, first audible track/queue semantics, unknown Follow, unsupported/private/empty controls and cancellation before/after permit.
- macOS, Windows 10, minimum Stream Deck 6.4, OpenDeck/Linux/Flatpak/other hardware and architectures; metadata/source support is not a host pass.
- Language/native-speaker review, Unicode/glyph/artwork-image decoding/custom overrides and actual display readability. All unexecuted matrix rows stay Not run.

## Stage 0 authority and roadmap reconciliation

[D022](../DECISIONS.md#d022--stage-0-productux-authority-for-the-new-sequential-roadmap) durably records **all 13 Stage 0 decisions**, including Control Dial naming/gesture hints/presentation, Track Info independent artwork and Album Name/No Text choices, independent short/long touch, playlist defaults/icons, PI immediate editing policy, Queue carousel/accessibility/Move no-op, Seek Dial, track-bound duplicate-aware Add to Playlist feedback, and configured Play Music scope. Accepted future requirements do not become implementation or manual Pass claims.

No complete edited sequential roadmap file exists in the repository. Do not reconstruct it from memory: the external roadmap is the scheduling source. Future stage descriptions, Gate B and regression checklists must use **Control Dial / Control Dial touch action / Control Dial long-touch action**, preserve stage numbers/dependencies, distinguish key from touch-strip interactions, and follow D022. Existing code, original specification and historical evidence may retain legacy labels with the new authority overlay. Relevant research and current spec/status/requirements/manual/handoff/README now link that authority.

## Manual-test usability issue and exact next action

[D023](../DECISIONS.md#d023--manual-test-usability-prerequisite): before Stage 2, create a small usability stage/tool to make executing and recording the large matrix substantially easier in place of cumbersome Notepad++/Kate editing. Preferred investigation: cross-platform **Python/Tkinter manual-test runner**, or at minimum reorganized/generated tests. `docs/MANUAL_TESTING.md` stays durable repository evidence but need not be the primary interactive interface. **No GUI, runner or document-generation tool implemented in Stage 1.**

Next action: **manual-test tooling/usability stage before Stage 2**, unless the user explicitly elects direct Stage 2. Then Stage 2 prioritizes the [Windows PI routing retest](../MANUAL_TESTING.md#windows-pi-routing-retest), auth/persistence/recovery, missing volume cases, remaining keys/dials, signed-in native playlist and available-host matrix tests. Record exact commits/binary hashes, environment, per-scenario expected/actual results and sanitized evidence. No future implementation/test gate is checked off here. Stop after Stage 1; PR #1 stays open/unmerged, no release/upstream Pear PR.

## Stage 1 changed components and validation

Updated README, PROJECT_SPEC authority overlay, IMPLEMENTATION_STATUS, REQUIREMENTS_STATUS, DECISIONS D022/D023, MANUAL_TESTING and HANDOFF; added this checkpoint and the legacy-stage-number compatibility pointer. Added supersession notices to relevant Track Info/dial/PI/playlist research. Historical bug-fix records are retained.

Validation: `git diff --check`; local Markdown file/anchor resolution; source consistency (`npm run lint`); metadata/history/artifact hash inspection and Markdown-only changed-path check. No dedicated documentation-check script exists in package scripts. No dependencies installed, runtime tests rerun or installer built. Publication verifies local/remote integration-head equality, clean trees, unchanged default branches and open/unmerged PR #1. Results: source audit passed (22 TypeScript files /15 UUIDs); all **230 local Markdown links/anchors across 38 files** resolved; whitespace and Markdown-only scope checks passed. Final SHA and publication verification are reported at completion.
