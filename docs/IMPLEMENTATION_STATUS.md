# Implementation status

Current stage: **Stage 2 — Pear client foundation**.

State: **Implemented and validated locally; preparing the pushed checkpoint.**

## Repository and checkpoint

- Repository: [Scarfmeister/Pear-StreamDeck](https://github.com/Scarfmeister/Pear-StreamDeck).
- Branch: `dev/pear-port`; default branch: `master`.
- Upstream: [XeroxDev/YTMD-StreamDeck](https://github.com/XeroxDev/YTMD-StreamDeck).
- Stage 2 starting commit: `3846894e10ee50bde729887395a1e0afd0a1b2c1`.
- Stage 2 tested implementation/docs checkpoint SHA: to be recorded after upload and CI verification.
- The follow-up status-record commit will record that tested SHA. A file cannot contain the hash of the commit containing its own final bytes; the report will also identify the final branch head.

The real fork/history and original MIT license remain intact. The default branch is unchanged from `8b0c3320ce59b741b3165a1c8ac3a54b66c2c97a`. The full original specification is unchanged, SHA-256 `798be8f52331034021c925dea263c7adba4b46c2b36e20b4309647e2dfd5436b`.

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

## Validation

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
| GitHub CI | To be recorded after push. |

CLI's warning says Category should match Name. The requested `Pear Desktop` category and `Pear Desktop Connector` name are retained. Package path: `build/io.github.scarfmeister.pear-streamdeck.streamDeckPlugin`. It is a connection foundation preview; it does not provide working playback actions.

The full dependency audit reports `engine.io-client` (moderate), `socket.io-parser`/`ws` (high) in the dormant development companion path, plus `ajv` (moderate) and `fast-uri`/`js-yaml`/`lodash` (high) in inherited development tooling. Moving the inactive package does not remove these findings from the full tree. Finish companion/source and hook-tool cleanup before release; no unrelated forced upgrades were applied.

## Behavior limits and remaining work

No Stage 2 implementation blocker remains. Physical approval/token-persistence and WebView networking on Elgato/OpenDeck are unverified. Stream Deck global-settings writes have no acknowledgment in this framework; restart tests must confirm real persistence. The preview connection UI is English only. HTTPS relies on the host's normal certificate trust.

An accepted API snapshot is not proof the renderer has populated Pear's startup caches. No unsupported heartbeat or constant REST polling is added, so silent established TCP half-open detection remains limited. Same-track external rating changes can stay stale on unmodified Pear 3.12.0, which does not push a rating event.

The full action set, per-action settings, dedicated dials, Linux manifest override, final icons, and complete installation instructions remain later work. Native playlist startup is not implemented. Pear 3.12.0 still needs the separately planned native playlist/Shuffle Play extension; shuffle-off and repeat-cycle semantics need live verification. OBS export remains excluded.

## Stage 1 history

Stage 1 verified the fork/history/MIT license, saved the exact specification, chose limited framework modernization and UUID `io.github.scarfmeister.pear-streamdeck`, audited pinned Pear/OpenDeck/SDK source, repaired watch/packaging, and mapped the 12 keys/3 dials. Its tested checkpoint is `12e820e1c0221ad0ed6b1220f134b59e41f180a4`; its status record is the Stage 2 starting commit above. Stage 1 had 14 inherited type errors and 3 production dependency findings. Both production/type-check situations are now resolved; dormant development findings are stated separately.

## Next stage and stop point

Next proposed stage: port the normal key actions and their settings to the one shared client, with confirmed-state rendering and action-specific tests. Dedicated dials and native playlist startup must follow their authorized stage prompts.

Stage 2 stops at the pushed foundation checkpoint. Do not begin action/playlist implementation, change Pear, or create/merge a final PR. Resume only after the user supplies the next stage prompt. Before changes, read `PROJECT_SPEC.md`, this file, and `DECISIONS.md`.
