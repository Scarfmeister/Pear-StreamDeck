# Stage 05 — Property Inspectors, settings, and Play Playlist action

Repository: [Scarfmeister/Pear-StreamDeck](https://github.com/Scarfmeister/Pear-StreamDeck). Branch: `dev/pear-port`.

Starting commit: `15bb236f17c69e49ee6002c004f992e4d1ae5f8e`. Fetched origin, checked out the development branch, pulled with `--ff-only`, reviewed all required documents/Stage 3 playlist evidence/Stage 4 checkpoint/relevant research/recent history, and confirmed a clean worktree before edits. No earlier-stage defect materially blocked Stage 5. The small PI routing adapter and invalid-input retention are Stage 5 settings work.

## Scope and work completed

- Retained centralized global host/port/protocol, token-free authentication and connection/retry status, and Reauthorize. Defaults remain `127.0.0.1:26538` HTTP. Invalid connection edits remain editable until the plugin accepts a save.
- Added per-action Volume Up/Down integer step editors (1–100%, default 5%), all five Track Info display formats (Title + Artist default), and Play Playlist URL/ID plus Follow/Always Normal/Always Shuffle controls (Follow default).
- Shared tolerant legacy/default readers and strict Save validation preserve unrelated per-action fields. Early settings responses are cached; incoming status/settings retain unsaved input. Writes are scoped to the action; globals stay with the session. No automatic migration write occurs just by opening a PI.
- Implemented D013 parsing and canonical playlist ID storage. Explicit Save removes a legacy URL, preserves case, and never falls back from an invalid URL to a stale ID.
- Added the documented framework action/context message adapter, without replacing SDK/package/runtime integration or creating PI transports.
- Implemented the shared Stage 7 playlist interface: one active operation, captured known Follow shuffle, one bounded unknown-state read, generation cancellation, one protected request, strict matching dispatch result, safe error reporting, and no replay/fallback/optimistic player update.
- Missing/unsupported route/native control shows the Stage 7 requirement in the PI/key and alerts. Both execution modes remain blocked on unmodified Pear 3.12.0. No Pear-side modification, live native startup, or forbidden normal→shuffle→skip workaround was implemented.
- Added 20 automated tests to the existing 62 and updated README/status/decisions/manual testing/research. Dedicated dials, artwork, Linux/release cleanup, final PR, and later stages remain separate.

## Files and components changed

| Component | Files |
| --- | --- |
| Active PI/forms and plugin messaging | `property-inspector.html`, `src/pear-pi.ts`, `src/pear-plugin.ts` |
| Shared settings/parser/modes | `src/streamdeck/action-settings.ts`, `src/pear/playlist.ts` |
| Guarded playlist client/REST response contract | `src/pear/pear-client.ts`, `src/pear/rest-client.ts` |
| Key playlist/settings/render lifecycle | `src/actions/pear-key-actions.ts` |
| Automated tests | `tests/action-settings.test.ts`, `tests/pear-playlist.test.ts`, `tests/browser-entry.test.ts`, `tests/pear-key-actions.test.ts` |
| Persistent docs | `README.md`, `docs/IMPLEMENTATION_STATUS.md`, `DECISIONS.md`, `MANUAL_TESTING.md`, `PLAYLIST_API_SPIKE.md`, this checkpoint, the three research files below |

## Tests and validation performed

Environment: system Node `22.22.2`; Node `24.21.0` and official CLI `1.10.1` installed under `/tmp` in Stage 4; unchanged locked TypeScript/esbuild/framework.

| Check | Result |
| --- | --- |
| Clean `npm ci` | Pass; 248 locked packages. |
| `npm run typecheck` | Pass; full source/test checking, zero errors. |
| Full `npm test` and Node 24 runner | Pass; eight files. Individual Node 24 `--test --experimental-test-isolation=none` run: **82 tests, zero failures/cancellations/skips**. |
| `npm run build` / `npm run prepare:streamdeck-cli` | Pass; both active browser bundles, normalized version `2.3.0.0`. |
| CLI `validate` / `pack` | Pass; zero errors, retained intentional category/name warning, 48 files, approximately 217.8 kB unpacked. |
| Production audit / clean-install audit | Zero production findings; seven retained development-only findings (2 moderate, 5 high). No package/lockfile changes. |
| Package/preservation/docs/whitespace | Pass; ZIP has 48 expected files, UUID/version/entries/state assets/original MIT, no test or companion runtime; spec/license/dependencies/AGENTS byte equality, upstream ancestry, 31 local Markdown paths, `git diff --check`, existing Husky/commitlint hook. No separate source-lint script is configured. |
| GitHub implementation CI | Pass; [run 37234585004](https://github.com/Scarfmeister/Pear-StreamDeck/actions/runs/37234585004), all install/type/test/build/validate/pack/upload steps successful. |
| Remote implementation verification | Pass; fresh fetch confirms local/origin development head equality at the exact SHA below; default branch unchanged. |
| Pear/Elgato/OpenDeck/device/manual acceptance | Not performed. Fake dispatch fixtures are not current Pear capability or native-playback proof. |

Coverage includes integer-step bounds/defaults; all Track Info choices; valid raw IDs/five URL hosts/decode-once input; malformed URLs/encoding/credentials/paths/duplicate lists; explicit-save legacy migration; default/unknown/Always/Follow modes; one POST; captured shuffle; bounded read/push race; strict 200 dispatch vs 204/mismatched results; 404/501/other errors/auth/timeouts; busy/cancellation/no replay; context disappearance/host closure; actual browser PI initialization/save/routing/dirty-input behavior; and token-free status/PI transport isolation. All retained client/state/standard-key tests pass.

Artifact: `build/io.github.scarfmeister.pear-streamdeck.streamDeckPlugin` (development package), 217,779 unpacked bytes. SHA-256: `56f5d52e0e4114d58aa204db383e8cd8f5f1e67930b807c567e4f79343484145`. Original spec SHA-256: `798be8f52331034021c925dea263c7adba4b46c2b36e20b4309647e2dfd5436b`. Original MIT license SHA-256: `c823e8c0ab3d6e53682d42507552e9e959acd06d6f6cda5f04f4ec605c3313db`.

## Unresolved problems and manual testing still required

- Both normal and native Shuffle Play require the separate **Stage 7 Pear extension** under D013. No compatible Pear build/native/signed-in first-track/queue/metrics result is claimed. The exact interface is ready, but current Pear 3.12.0 responds unsupported.
- Run [Stage 5 PI/settings acceptance](../MANUAL_TESTING.md#stage-5-property-inspectors-and-settings) on real hosts/devices: fields/validation, restart persistence, independent contexts, first authorization/revocation, global save repair, legacy settings, and one/two/three-line readability/custom-title visibility.
- Host settings write/readback has no disk-persistence acknowledgment. Physical restart is required. SDK title settings/wide glyphs can affect readability; artwork remains deferred.
- Existing Stage 4 cold-cache/rating freshness/legacy shuffle/half-open/host networking limitations remain. Seven development audit findings, dedicated dials, Linux override, inherited asset/source cleanup, and full release gate remain later work.
- A 501 can represent an installed extension's unavailable native controls. A matching 200 means dispatched only; 502/504/transport failures are conservatively unconfirmed without server-body exposure. No automatic retry is sent after an ambiguous result.

## Important research documents created

- [Property Inspector SDK](../research/property-inspector-sdk.md): official protocol and locked framework routing/readiness, settings architecture, physical persistence limit.
- [Track Info display](../research/track-info-display.md): title/font/layout/custom-title limits, bounded format policy, manual readability.
- [Playlist settings](../research/playlist-settings.md): Stage 3 contract review, parser policy, legacy normalization, client boundary, Stage 7 capability/evidence limit.

## Commit and remote record

**Final tested implementation commit SHA:** [`633d8bfbbedb73c2cc5e3dcd98f11924052050cc`](https://github.com/Scarfmeister/Pear-StreamDeck/commit/633d8bfbbedb73c2cc5e3dcd98f11924052050cc), `feat: add action settings and guarded playlist startup`. Committed with the passing commitlint hook and pushed to origin. A fresh `git fetch origin` confirmed local HEAD and `origin/dev/pear-port` equal this full SHA. `origin/master` remains `8b0c3320ce59b741b3165a1c8ac3a54b66c2c97a`; upstream ancestry and the clean pinned Pear audit checkout are preserved. Implementation CI and package evidence are above.

The closing documentation-only bookkeeping commit records these results. A tracked checkpoint cannot contain the hash of the commit containing its own final bytes; it records the tested implementation SHA, while the final bookkeeping head is independently pushed/verified and supplied in the stage report. Its exact head is also discoverable from this file's Git history. No required Stage 5 implementation or automated validation remains; manual/native work is explicitly listed above.

## Exact recommended next stage

**Stage 6 — Stream Deck Plus encoder actions.** Implement dedicated Volume and Transport dials and the playlist selector/settings using shared Pear state, validated action settings, and the Stage 5 playlist interface. Keep playlist execution gated on the separately authorized Stage 7 Pear extension and native acceptance. Start only after the user's explicit Stage 6 request. Stop at Stage 5 after committing, pushing, and verifying the remote head.
