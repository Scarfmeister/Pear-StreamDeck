# Implementation status

Current stage: **Stage 3 — Playlist capability investigation and API spike**.

State: **Stage 3 complete and locally validated; GitHub checkpoint pending.**

## Repository and checkpoint

- Repository: [Scarfmeister/Pear-StreamDeck](https://github.com/Scarfmeister/Pear-StreamDeck).
- Branch: `dev/pear-port`; default branch: `master`.
- Upstream: [XeroxDev/YTMD-StreamDeck](https://github.com/XeroxDev/YTMD-StreamDeck).
- Stage 3 starting commit: [`c2517df638486d359f1de4469d42f7d1dbd5c897`](https://github.com/Scarfmeister/Pear-StreamDeck/commit/c2517df638486d359f1de4469d42f7d1dbd5c897).
- Stage 3 tested documentation checkpoint SHA: pending validation/commit.
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
| GitHub checkpoint CI | Pending push; record the run after it completes. |

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

## Behavior limits and remaining work

No Stage 3 investigation blocker remains. Playlist implementation is blocked on the separate Pear extension and its signed-in native acceptance gate. This environment has no running signed-in Pear session or Stream Deck hardware; native dispatch, private playlists, the first audible track, same-playlist normal startup, and listening metrics remain unverified. Static/public-site source evidence is documented explicitly.

Physical approval/token-persistence and WebView networking on Elgato/OpenDeck remain unverified. Stream Deck global-settings writes have no acknowledgment in this framework; restart tests must confirm real persistence. The preview connection UI is English only. HTTPS relies on the host's normal certificate trust.

An accepted API snapshot is not proof the renderer has populated Pear's startup caches. No unsupported heartbeat or constant REST polling is added, so silent established TCP half-open detection remains limited. Same-track external rating changes can stay stale on unmodified Pear 3.12.0, which does not push a rating event.

The full action set, per-action settings, dedicated dials, Linux manifest override, final icons, and complete installation instructions remain later work. Native playlist startup is not implemented. Pear 3.12.0 needs the D013 extension; shuffle-off and repeat-cycle semantics also need live verification. OBS export remains excluded.

## Stage 2 history

Stage 2 implemented the shared client and connection preview, fixed inherited type errors, and added 39 deterministic tests. Its tested checkpoint is [`722ea0ba066c69384025fc591c4e4027fd10f90b`](https://github.com/Scarfmeister/Pear-StreamDeck/commit/722ea0ba066c69384025fc591c4e4027fd10f90b); its final status-record commit `c2517df638486d359f1de4469d42f7d1dbd5c897` is this stage's starting point. Both CI runs passed. The details above are retained as history, not new Stage 3 implementation.

## Stage 1 history

Stage 1 verified the fork/history/MIT license, saved the exact specification, chose limited framework modernization and UUID `io.github.scarfmeister.pear-streamdeck`, audited pinned Pear/OpenDeck/SDK source, repaired watch/packaging, and mapped the 12 keys/3 dials. Its tested checkpoint is `12e820e1c0221ad0ed6b1220f134b59e41f180a4`; its status record is the Stage 2 starting commit above. Stage 1 had 14 inherited type errors and 3 production dependency findings. Both production/type-check situations are now resolved; dormant development findings are stated separately.

## Next stage and stop point

Next dependency: the separately authorized Pear API extension stage, following D013 and `PLAYLIST_API_SPIKE.md`, then its real native-start acceptance and later shared-client/parser/mode tests. The user supplies the next stage prompt; other key/dial/action work remains outside this stage.

Stage 3 stops at the pushed investigation checkpoint. Do not begin the Pear patch, action/playlist implementation, or create/merge a final PR. Resume only after the user supplies the next stage prompt. Before changes, read `PROJECT_SPEC.md`, this file, and `DECISIONS.md`.
