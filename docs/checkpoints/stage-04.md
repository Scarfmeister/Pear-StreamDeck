# Stage 04 — Codex bootstrap and standard Stream Deck actions

Repository: [Scarfmeister/Pear-StreamDeck](https://github.com/Scarfmeister/Pear-StreamDeck). Branch: `dev/pear-port`.

Starting commit: `076b7f2e88408ebe957c13fadaf8c7f91164edb8`. The branch was fetched, checked out, pulled with `--ff-only`, and confirmed clean before edits. Stages 1–3 documentation and recent history were reviewed; no earlier implementation defect required a repair.

## Scope and completed work

- Created concise root `AGENTS.md` and durable `docs/research/` / `docs/checkpoints/` directories.
- Implemented eleven standard key actions using the existing plugin-owned Pear session, one client/state model, and native REST/WebSocket integration.
- Added shared typed command lanes and a bounded, confirmed-state volume queue. Commands are sent once; disconnect/failure discards waiting input rather than replaying it.
- Corrected manifest Play/Pause and rating image mappings and disabled automatic state toggling. Mute follows true mute, volume steps default to 5%, and all displayed targets come from actual Pear state.
- Persisted native-source evidence for rating clearing, shuffle toggle boundaries, repeat order, stopped playback handling, and artwork reliability.
- Added distinct generic shuffle/repeat SVGs. Track Info displays title/artist while paused, retains press-to-play/pause, and prepares five display formats for Stage 5.
- Added 23 command/key/browser tests to the 39 existing tests. Updated README, PI stage notice, implementation status, decisions, and manual acceptance instructions.
- Kept Playlist explicitly blocked on the Pear extension, encoder slots pending, and per-action settings UI for Stage 5. No Pear source, dependency/lockfile, upstream/default branch, release, or final PR changes.

## Files and components changed

| Component | Files |
| --- | --- |
| Durable instructions | `AGENTS.md` |
| Shared commands/state integration | `src/pear/commands.ts`, `pear-client.ts`, `state.ts`, `rest-client.ts` |
| Key lifecycle, rendering, and settings | `src/actions/pear-key-actions.ts`, `src/pear-plugin.ts` |
| Host declaration and stage notice | `manifest.json`, `property-inspector.html` |
| Generic state assets | `icons/shuffle-off.svg`, `shuffle-on.svg`, `repeat-none.svg`, `repeat-all.svg`, `repeat-one.svg` |
| Automated coverage | `tests/pear-commands.test.ts`, `pear-key-actions.test.ts`, `browser-entry.test.ts` |
| Persistent documentation | `README.md`, `docs/IMPLEMENTATION_STATUS.md`, `DECISIONS.md`, `MANUAL_TESTING.md`, this checkpoint, the three research documents below |

## Tests and validation

Environment: Node `22.22.2` system runtime and Node `24.21.0` installed under `/tmp`; locked TypeScript/esbuild/framework unchanged; official Stream Deck CLI `1.10.1` under `/tmp`.

| Check | Result |
| --- | --- |
| `npm ci` | Pass; 248 locked packages. |
| `npm run typecheck` | Pass; full source and test types, zero errors. |
| `npm test` | Pass; all six test files on the system runtime. |
| Node 24 complete test run | Pass; 62 individual tests, zero failures/cancellations/skips. `node scripts/test.js` also passes under Node 24. |
| `npm run build` / `npm run prepare:streamdeck-cli` | Pass; both active browser bundles and normalized `2.3.0.0` manifest. |
| CLI `validate` / `pack` | Pass; zero errors, existing intentional category/name warning, 48 files, approximately 205.7 kB unpacked. |
| Production dependency audit | Pass; zero findings. |
| Full dependency audit | Seven unchanged development-only findings (2 moderate, 5 high), in legacy companion/hook tooling. No forced upgrades or dependency changes. |
| Original spec/license/dependencies/history | Pass; byte equality to the starting commit, recorded SHA-256 checks, unchanged package/lockfile, preserved upstream ancestor. |
| Package ZIP inspection | Pass; 48 files, correct UUID/version and entry points, all state SVGs, unchanged packaged MIT license, no companion/Socket.IO/test runtime. |
| Local documentation links | Pass; 22 local Markdown link paths. |
| Whitespace/commit message checks | `git diff --check` and the existing Husky/commitlint hook pass. No separate source-lint script is configured. |
| GitHub implementation CI | Pass; [run 37230247552](https://github.com/Scarfmeister/Pear-StreamDeck/actions/runs/37230247552), all install/type/test/build/validate/pack/upload steps successful. |
| Live Pear/Elgato/OpenDeck/device acceptance | Not performed. Mocked tests and pinned source tracing do not establish native/hardware operation. |

The sandbox's isolated test reporter summarizes whole files. To obtain the individual count without changing the runner, verification used Node 24 `--test --experimental-test-isolation=none dist/tests/*.cjs`. All 62 tests passed.

Automated coverage includes explicit stopped/playing transport choice, every standard action-to-client binding, all native rating transitions, zero-volume mute, volume clamping/serialization/failure/cancellation, both shuffle directions and unsupported off confirmation, all repeat modes, REST-vs-WebSocket races, no polling/replay, display-format preparation, duplicate/new/removed contexts, unknown/offline recovery, manifest image mapping, PI transport isolation, and host cleanup.

Artifact: `build/io.github.scarfmeister.pear-streamdeck.streamDeckPlugin`. It is a development package with eleven keys; it is not a complete port/release.

Artifact SHA-256: `3a5814d11e0a74b58d4905fb3d04a7832d0cdb62fd661da4a53781453a7a4103`. Original specification SHA-256: `798be8f52331034021c925dea263c7adba4b46c2b36e20b4309647e2dfd5436b`. Original MIT license SHA-256: `c823e8c0ab3d6e53682d42507552e9e959acd06d6f6cda5f04f4ec605c3313db`.

## Unresolved problems and manual testing still required

- Run [Stage 4 key acceptance](../MANUAL_TESTING.md#stage-4-standard-key-acceptance) with real Pear and Stream Deck/OpenDeck. Verify authorization persistence, external state updates, duplicate profiles, physical readability, native rating clearing, repeat, both shuffle directions, command failures, rapid volume input, and cleanup/reconnect.
- Pear's dynamic native website can change independently of its release. Legacy shuffle may only reorder; an unconfirmed off transition stays On and alerts. Repeat/rating may be disabled or unavailable for some content/accounts. These are explicit live acceptance limits.
- Pear 3.12.0 does not push same-track rating changes. One delayed refresh can still precede a slow native cache update. Cold renderer cache defaults, silent TCP half-open detection, and host global-settings persistence retain the earlier documented limitations.
- Artwork remains deferred; the inherited loader is not bounded or protected against stale-track/canvas errors. Track Info uses a static icon.
- Per-action PI UI, dedicated dials, Linux manifest override, final asset/development dependency cleanup, and native playlist startup remain later stages. The playlist extension stays in the separate Pear repository under D013; no fallback playback is introduced.

## Important research created

- [Like/Dislike behavior](../research/like-dislike-behavior.md): supported native same-state clearing, rating freshness, versions/source paths, and live boundary.
- [Repeat behavior](../research/repeat-behavior.md): verified native cycle and body, three-mode rendering, and live acceptance.
- [Standard key actions](../research/standard-key-actions.md): playback/shuffle/mute/volume contracts, host state/image rules, artwork decision, asset provenance, and unresolved questions.

## Commit and remote record

Bootstrap commit: [`d81e5646d10f764db45c78ccf63dfaa79329d97b`](https://github.com/Scarfmeister/Pear-StreamDeck/commit/d81e5646d10f764db45c78ccf63dfaa79329d97b), `chore: add durable coding agent instructions`.

**Final tested implementation commit SHA:** [`69bce200dafb20f09ece55e03750d251a0b56297`](https://github.com/Scarfmeister/Pear-StreamDeck/commit/69bce200dafb20f09ece55e03750d251a0b56297), `feat: implement state-aware Pear standard key actions`. Both logical commits are pushed. A fresh `git fetch origin` confirmed local HEAD and `origin/dev/pear-port` equal that full SHA. `origin/master` remains `8b0c3320ce59b741b3165a1c8ac3a54b66c2c97a`. The Pear audit checkout remains clean at its pinned 3.12.0 commit. Implementation CI and package evidence are recorded above.

The checkpoint/status bookkeeping commit follows that tested commit and changes documentation only. A tracked file cannot embed the hash of the commit containing its own final bytes; its commit is discoverable from this file's Git history. The final bookkeeping head is pushed and independently verified before stopping, and the stage report supplies that final remote branch-head SHA.

## Exact recommended next stage

**Stage 5 — Property Inspector and per-action settings.** Expose volume step and the five Track Info display formats using the existing plugin-owned session/settings architecture. Preserve the playlist capability requirement and keep Pear extension work separate. Start only after the user supplies Stage 5 authorization. Stop at Stage 4 after all commits are pushed and the remote head is verified.
