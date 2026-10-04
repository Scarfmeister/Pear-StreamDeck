# Implementation status

Current stage: **Stage 4 — Codex bootstrap and standard Stream Deck actions**.

State: **Stage 4 implemented and validated.** Commit references and remote verification are recorded in [the Stage 4 checkpoint](checkpoints/stage-04.md).

## Completed Stage 4 work

- Synced `origin/dev/pear-port`, confirmed a clean starting tree at `076b7f2e88408ebe957c13fadaf8c7f91164edb8`, reviewed Stages 1–3 documents/history, and created concise root `AGENTS.md` plus research/checkpoint directories.
- Activated all eleven standard keys through the existing shared session/client: Play/Pause, Next, Previous, Like, Dislike, Mute, Volume Down/Up, Track Info, Shuffle, and Repeat.
- Added shared typed command lanes, bounded volume serialization, confirmed-state displays, per-context render/settings caches, immediate appearance rendering, disappearance/shutdown cleanup, and no command replay or continuous polling.
- Play/Pause selects explicit play/pause from real Pear state, including stopped state. Mute uses the actual mute flag independently of volume zero. Volume steps default to 5%, honor stored integer `steps` 1–100, and clamp to 0–100.
- Verified native rating clearing and repeat order from pinned Pear/native website source. Ratings invoke their supported native operation once and perform a delayed fresh state read. Repeat sends one native iteration and renders distinct NONE/ALL/ONE images/labels.
- Shuffle has gray off/white on images and follows pushed state. Native server queues support the inspected toggle; unsupported legacy off transitions remain visibly on and report an unconfirmed command.
- Added bounded REST gap/confirmation reads protected against newer WebSocket fields. Targets and 204 dispatch responses never become confirmed displayed state.
- Track Info shows bounded title/artist text while paused, retains press-to-play/pause, and prepares five pure display formats for Stage 5. Artwork is deferred because the inherited helper lacks reliability safeguards.
- Kept Playlist explicitly blocked on D013, inherited encoder slots pending, and per-action PI editing for Stage 5. No Pear source, dependencies/lockfile, upstream/default branch, release, or final PR changes were made.
- Added 23 meaningful command/key/browser tests to the 39 existing tests, and updated the PI stage notice, README, decisions, research, and manual acceptance plan.

## Stage 4 validation

Environment: system Node `22.22.2`; required Node `24.21.0` and official CLI `1.10.1` installed under `/tmp` for verification. Locked TypeScript/esbuild/framework versions are unchanged. The normal suite passes on both Node versions; a Node 24 run with `--experimental-test-isolation=none` reports each individual assertion test in this sandbox.

| Check | Result |
| --- | --- |
| `npm ci` | Pass; 248 packages, unchanged lockfile. |
| `npm run typecheck` | Pass; plugin and test types, zero errors. |
| Complete `npm test` / Node 24 individual-test run | Pass; 62 tests, zero failures/cancellations/skips. |
| Build and manifest preparation | Pass; active Pear bundles, normalized `2.3.0.0` manifest. |
| Official CLI validate/pack | Pass; zero errors; existing intentional category/name warning; 48 packaged files. |
| Package inspection | UUID/version/entries, all new state SVGs, unchanged MIT license, no companion/Socket.IO/test runtime; see checkpoint for final inspection. |
| Production/full dependency audit | Production zero findings; full tree retains the same seven development-only findings (2 moderate, 5 high). No dependency changes. |
| Spec/license/history/whitespace | Original spec/license and upstream history preserved; see checkpoint for final validation. |
| Real Pear/Elgato/OpenDeck/hardware | Not run. Source findings and mocked tests do not establish live native/device acceptance. |

Artifact: `build/io.github.scarfmeister.pear-streamdeck.streamDeckPlugin`. It is a Stage 4 development package with eleven keys, not a complete port/release. Enable Pear 3.12.0's API Server at `127.0.0.1:26538` and approve the connector's first authorization request. The global connection PI remains English only. Per-action PI UI, dedicated dials, Linux override, final asset cleanup, and native playlist startup remain later work.

Current limitations: Pear's cold renderer caches can publish defaults; same-track external rating changes are not pushed and a slow native cache update can outlast the delayed read; legacy shuffle may not support off; silent half-open detection and real host token persistence remain unverified. No running Pear or physical device was available. Stage 4's source findings and remaining acceptance are in `research/like-dislike-behavior.md`, `research/repeat-behavior.md`, `research/standard-key-actions.md`, and `MANUAL_TESTING.md`.

## Stage 3 repository and checkpoint history


- Repository: [Scarfmeister/Pear-StreamDeck](https://github.com/Scarfmeister/Pear-StreamDeck).
- Branch: `dev/pear-port`; default branch: `master`.
- Upstream: [XeroxDev/YTMD-StreamDeck](https://github.com/XeroxDev/YTMD-StreamDeck).
- Stage 3 starting commit: [`c2517df638486d359f1de4469d42f7d1dbd5c897`](https://github.com/Scarfmeister/Pear-StreamDeck/commit/c2517df638486d359f1de4469d42f7d1dbd5c897).
- Stage 3 tested documentation checkpoint SHA: [`382c9c43ea1038410b67ba855c4e9aa8e504eba6`](https://github.com/Scarfmeister/Pear-StreamDeck/commit/382c9c43ea1038410b67ba855c4e9aa8e504eba6).
- Stage 3 changes are documentation only. Client/runtime/tests remain at `060a2e376f23d65427fd045dc1106ab00ea399f7`.
- The follow-up status-record commit records that tested SHA and CI result. A file cannot contain the hash of the commit containing its own final bytes; the final report also identifies the final branch head.

The real fork/history and original MIT license remain intact. The default branch is unchanged from `8b0c3320ce59b741b3165a1c8ac3a54b66c2c97a`. The full original specification is unchanged, SHA-256 `798be8f52331034021c925dea263c7adba4b46c2b36e20b4309647e2dfd5436b`.

## Completed Stage 3 work

- Re-audited the full public control/queue/WebSocket paths at pinned Pear 3.12.0, commit `3f599b42724be827db51cd4689996dc3e48a9561`. Neither normal playlist start nor native Shuffle Play is exposed. Current queue insertion/shuffle do not satisfy the requirement.
- Read native public YouTube Music playlist data and its application script. Identified separate normal `watchEndpoint` and shuffle `watchPlaylistEndpoint` commands, their opaque parameters, the app's native action dispatcher, command-entity overrides, and fresh-queue shuffle reset. Recorded source revision/hash and the static/live evidence boundary in `PLAYLIST_API_SPIKE.md`.
- Reviewed open, unmerged Pear PRs #4615 and #4505 at pinned heads. Neither supplies the required native-shuffle contract; URL/first-track fallback is unsuitable.
- Selected the smallest contained Pear extension: one protected `POST /api/v1/play-playlist` route, strict `{playlistId, shuffle}`, API Server renderer adapter, and one bounded correlated IPC broker. D013 specifies success/error responses, native dispatch, cancellation/deadline rules, and no command replay.
- Named every planned Pear source change and the later extension test gate. The Pear audit clone remains clean; no Pear modification or PR was started.
- Specified later client URL/ID parsing and Always Normal / Always Shuffle / Follow state behavior, including unknown state and unsupported capability. No speculative playlist client method, parser, action, transport, or fallback was added because the public API is missing.
- Updated the manual native-start acceptance plan, project links, and architecture audit. Stage 2 runtime/build behavior remains the connection preview.

## Stage 3 validation

The baseline remains buildable. Stage 3 changed six Markdown files only. No new playlist implementation was made. The native command findings are source evidence, not a passed authenticated Pear playback test.

| Check | Stage 3 result |
| --- | --- |
| `npm ci` / `npm run typecheck` | Pass; 248 packages; full source/test checks, zero type errors. |
| `npm test` | Pass; all 39 existing client/host tests, zero failures/skips. |
| Build and manifest preparation | Pass; unchanged active Pear browser bundles and manifest version `2.3.0.0`. |
| Official CLI 1.10.1 validate/pack | Pass; zero errors, one existing intentional category/name warning; 43 files, 193.4 kB unpacked. |
| ZIP inspection | Pass; UUID/version/entry/icon paths, original MIT, no test files, companion transport, or new playlist runtime. |
| Dependency audit | Production: zero findings. Full tree: the same 7 development-only findings (2 moderate, 5 high); no dependency changes. |
| Documentation/preservation | Pass; 15 local Markdown links/anchors, authored whitespace, original spec byte equality/hash, original license hash, upstream ancestry. Default branch and Pear audit clone unchanged. |
| Native source/data consistency | Pass; one matching playlist header, distinct normal/shuffle command kinds and params, native router fields, recorded script hash. Static/read-only checks only; no playback. |
| Pear/host/device playlist tests | Not run; the extension and later client do not exist yet. Required tests are planned explicitly. |
| GitHub checkpoint CI | Pass; [run 37181074791](https://github.com/Scarfmeister/Pear-StreamDeck/actions/runs/37181074791), install/type checks/39 tests/build/manifest validation/pack/artifact upload. |

The connected GitHub integration pushed the investigation commit. Its tree exactly matched the local validated tree, `3d70853b7650975cd669644f505a9f858af0234f`. The local branch was synchronized only after clean-worktree/tree-equality checks. This final status-record commit records the tested checkpoint and successful CI; the final branch head is also supplied in the stage report. No upstream/default branch, Pear source, PR, or release was changed.

## Completed Stage 2 work

- Implemented framework-independent `PearClient` and modules for configuration, REST, auth, state, WebSocket parsing, timers, and reconnect.
- Default endpoint `http://127.0.0.1:26538`; centralized v1 routes and separate `/auth/{client-id}`. Validated bare hostnames/IPs, ports, and HTTP/HTTPS; IPv6 and WSS URL handling.
- REST bearer/JSON headers, empty 204 bodies, safe typed errors, 8-second timeout, abort, redirect rejection, and no automatic playback-command replay.
- AUTH_AT_FIRST first probe/approval, 120-second approval deadline, endpoint/client-bound token persistence under versioned Stream Deck global `pear` settings, and token reuse.
- Authentication-disabled connections without a prompt. Persisted denial/interrupted/invalid-token states require Reauthorize rather than repeating dialogs. 401/403 and WS 1008 halt the session and clear invalid credentials.
- One plugin-owned session/client. The PI sends host messages for settings/status/reauthorization and opens no Pear transport. Unrelated global fields are retained; delayed own settings echoes are ignored.
- Frozen normalized player/song snapshots, all seven Pear 3.12.0 WebSocket events, strict malformed-message handling, partial state merging, and accepted-snapshot readiness.
- One current socket generation/reconnect timer, startup-late/restart recovery, 15-second initial snapshot deadline, 1/2/4/8/16/30-second backoff with bounded jitter, and numeric 429 Retry-After handling.
- Bounded/coalesced rating reads on connection/video change, with old-track response protection. No constant polling of pushed state.
- Credential-free, coalesced logs; subscriber and diagnostic failures do not break recovery. Volume clamping and a shared request/volume-command foundation are tested.
- Switched active build/watch entry points to `pear-plugin.ts` / `pear-pi.ts`. Old action/PI source remains dormant; the connection preview marks actions pending and sends no playback commands.
- Added 39 Node test-runner tests with fake networking/timers and actual browser entry bundles in VM contexts. CI now type-checks and tests before packaging.
- Fixed all 14 inherited TypeScript errors with runtime narrowing. Updated Node types to 24 and removed unused test tooling. Companion is now a development-only type-check dependency, absent from active bundles and production dependencies.
- Updated README, architecture implementation map, D009–D012 decisions, and Stage 2 manual smoke checks.

## Stage 2 validation history

Environment: Node.js `24.19.0`, npm `11.9.0`, TypeScript `5.9.3`, esbuild `0.25.12`, Node types `24.19.1`, official Stream Deck CLI `1.10.1`.

| Check | Stage 2 result |
| --- | --- |
| `npm ci` | Pass; 248 packages installed after test-tool cleanup. |
| `npm run typecheck` | Pass; full source and test checks; zero errors, strictness retained. |
| `npm test` | Pass; 39 tests, zero failures/skips. |
| REST/auth tests | URL/method/body/header construction, 204/JSON/error responses, approval/denial/invalid responses, persisted/reused credentials, auth-disabled mode, timeout/abort and no prompt loops. |
| State/reconnect tests | All seven flat events, malformed/unknown input, partial updates, immutable snapshots, no polling, volume clamp, startup-late/restart, stale generations, one timer/socket, capped jitter, Retry-After, cleanup, and rating races. |
| Browser-entry VM tests | Plugin registration/global-settings messages, token-free PI status, host shutdown cleanup, dormant actions, and PI routing without Pear requests/sockets. |
| `npm run build` | Pass; active Pear browser bundles. |
| `npm run watch` | Pass; both initial builds and both rebuilds after touching `src/pear/config.ts`; stopped with Ctrl+C. |
| Manifest preparation | Pass; inherited version normalized to `2.3.0.0`. |
| Official CLI validation | Pass; zero errors, one intentional category/name warning. |
| Official CLI pack | Pass; 43 files, reported unpacked size 193.4 kB. |
| ZIP inspection | Pass; UUID/version, entry/icon paths, unchanged packaged MIT license, no test configs, no companion/Socket.IO/old-port runtime markers. |
| Production dependency audit | Pass; zero findings. Companion moved out of production dependencies. |
| Full dependency audit | 7 development-only findings: 2 moderate, 5 high; details below. |
| Spec/license/history/whitespace | Pass; source spec byte equality and SHA-256, unchanged original license, upstream ancestry, authored whitespace. Original spec EOF blank-line exception remains as recorded in Stage 1. |
| Physical Pear/Elgato/OpenDeck tests | Not run; acceptance steps remain in `MANUAL_TESTING.md`. |
| GitHub CI | Pass on the tested checkpoint; install, full type checking, all tests, build, manifest preparation/validation, pack, and artifact upload. |

GitHub CI passed: [run 37179146101](https://github.com/Scarfmeister/Pear-StreamDeck/actions/runs/37179146101). The connected GitHub integration uploaded the logical client and documentation commits. Their trees exactly matched the local tested trees (`644d8611b67e1b14936fbdc573a883e57458f46c` and `80c2026cf878caf6a47c555603721ff29a46eba9`). The local branch was synchronized only after clean-worktree/tree-equality checks. The final bookkeeping commit records this result. No upstream/default branch was changed and no PR was created.

CLI's warning says Category should match Name. The requested `Pear Desktop` category and `Pear Desktop Connector` name are retained. Package path: `build/io.github.scarfmeister.pear-streamdeck.streamDeckPlugin`. It is a connection foundation preview; it does not provide working playback actions.

The full dependency audit reports `engine.io-client` (moderate), `socket.io-parser`/`ws` (high) in the dormant development companion path, plus `ajv` (moderate) and `fast-uri`/`js-yaml`/`lodash` (high) in inherited development tooling. Moving the inactive package does not remove these findings from the full tree. Finish companion/source and hook-tool cleanup before release; no unrelated forced upgrades were applied.

## Retained Stage 2–3 limitations

The separate Pear playlist extension and signed-in native acceptance gate remain required. No normal/shuffle playlist-start capability exists in unmodified 3.12.0. D013 and `PLAYLIST_API_SPIKE.md` retain the contract and Pear source map; no Pear patch or playlist action transport was started in Stage 4.

Stages 2–3 did not establish physical approval, token persistence, WebView networking, or device operation. Global-settings writes still have no host acknowledgment, HTTPS uses normal certificate trust, and silent established TCP half-open detection remains limited. Final dependency/source/asset cleanup and the complete host/device release gate remain later work.

## Stage 2 history

Stage 2 implemented the shared client and connection preview, fixed inherited type errors, and added 39 deterministic tests. Its tested checkpoint is [`722ea0ba066c69384025fc591c4e4027fd10f90b`](https://github.com/Scarfmeister/Pear-StreamDeck/commit/722ea0ba066c69384025fc591c4e4027fd10f90b); its final status-record commit `c2517df638486d359f1de4469d42f7d1dbd5c897` is this stage's starting point. Both CI runs passed. The details above are retained as history, not new Stage 3 implementation.

## Stage 1 history

Stage 1 verified the fork/history/MIT license, saved the exact specification, chose limited framework modernization and UUID `io.github.scarfmeister.pear-streamdeck`, audited pinned Pear/OpenDeck/SDK source, repaired watch/packaging, and mapped the 12 keys/3 dials. Its tested checkpoint is `12e820e1c0221ad0ed6b1220f134b59e41f180a4`; its status record is the Stage 2 starting commit above. Stage 1 had 14 inherited type errors and 3 production dependency findings. Both production/type-check situations are now resolved; dormant development findings are stated separately.

## Next stage and stop point

**Stage 5 — Property Inspector and per-action settings.** Complete the per-action settings UI, including volume step and Track Info display-format choices, using the existing plugin-owned connection and settings messages. Playlist settings must preserve the explicit D013 capability requirement; its Pear extension and native acceptance remain separately authorized work.

Stage 4 stops after its commits are pushed and the remote `dev/pear-port` head is verified. Do not start Stage 5, a Pear patch, dedicated dials, final PR, or release automatically. Read `AGENTS.md` and the current specification/status/decisions/research/checkpoint before the next stage.
