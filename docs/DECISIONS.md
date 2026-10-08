# Decisions

Initial audit: 2026-10-04 UTC / 2026-10-03 America/Chicago. Final Stage 9 review: 2026-10-06 UTC / 2026-10-05 America/Chicago. Earlier decisions retain their historical evidence; D019 records the final corrections.

## D001 — Scope, requirements, and Git

`PROJECT_SPEC.md` preserves the supplied specification byte-for-byte. Its SHA-256 is `798be8f52331034021c925dea263c7adba4b46c2b36e20b4309647e2dfd5436b`.

Stages 1–8 completed the audit/client/keys/settings/dials, separate Pear playlist extension, assets/localization and distribution checks. Stage 9 explicitly authorizes the complete requirement/diff audit, scoped corrections, clean validation, fork PR into master and durable handoff. Keep real host/native acceptance unverified until performed. Stop after the closing documentation commit, push and PR-head verification. No merge, public release, new stage or upstream Pear PR is authorized.

Work in `Scarfmeister/Pear-StreamDeck` on `dev/pear-port`. `origin` is the fork; `upstream` is `XeroxDev/YTMD-StreamDeck`. Preserve the default branch, upstream history, and original MIT license. Never push to upstream.

## D002 — Retain the framework with limited modernization

Keep `streamdeck-typescript` 3.3.4, TypeScript, the HTML plugin entry point, esbuild browser bundles, and manifest `SDKVersion: 2`. Add a small local Stream Deck adapter for touch-event typing and common rendering behavior when needed. Stage 4 uses explicit images for the three repeat modes because the documented host protocol only promises numeric states 0 and 1; see D014.

The existing framework handles dial rotation/press events, `setFeedback`, and `setFeedbackLayout`. OpenDeck 2.14.0 handles those messages and `touchTap`, renders the layouts, launches HTML plugins in a webview, and injects `connectElgatoStreamDeckSocket`. These features cover the required dials.

The existing artwork and Property Inspector code use browser APIs. Pear supports browser REST access and query-token WebSocket authentication. Moving to Node.js would change entry points, artwork handling, lifecycle, and build targets at the same time as the API port. OpenDeck's Node launcher also requires host Node.js, including `flatpak-spawn --host node` for Flatpak. Retaining HTML avoids this extra setup requirement.

The official `@elgato/streamdeck` 3.0.1 improves action types, settings, logging, and lifecycle support. Its required media/dial operations use the same wire messages. These benefits do not yet justify a larger migration. This is not a claim that the official SDK is incompatible with OpenDeck: OpenDeck launches Node plugins and supplies the expected registration arguments. Actual compatibility would still require tests.

Distinguish package version, manifest `SDKVersion`, and host application version. The official package declares Node `>=20.5.1`; current setup guidance recommends Node.js 24 and Stream Deck 7.1. SDK 2 manifests can declare encoders. Do not enable Marketplace DRM for this direct-distribution plugin.

Reconsider a migration if the adapter cannot handle a required feature or browser networking fails on a supported host. First prove the replacement against the same OpenDeck and Stream Deck Plus tests. Do not require new resource, key-logic, or dynamic-trigger APIs for the requested controls. See `ARCHITECTURE_AUDIT.md` for pinned evidence.

## D003 — Stable project identity

| Item | Value |
| --- | --- |
| Plugin UUID | `io.github.scarfmeister.pear-streamdeck` |
| Display name | `Pear Desktop Connector` |
| Category | `Pear Desktop` |
| Planned Pear authorization client ID | `io.github.scarfmeister.pear-streamdeck` |
| Plugin directory | `io.github.scarfmeister.pear-streamdeck.sdPlugin` |

The namespace identifies the GitHub owner and project. All action UUIDs use this prefix. Preserve existing suffixes inside the new namespace. Add `volume-dial`, `transport-dial`, and `playlist-selector` in the relevant later stage.

Stage 1 applies the namespace to the manifest, action constants, localization keys, package metadata, and CI/build paths. Historical and original-specification references remain intact. The fork will not replace the original YTMD plugin or silently import its settings.

## D004 — One client, state store, and authorization owner

The plugin owns one `PearClient`, shared by all actions. Property Inspectors send host messages to the plugin; they must not open their own Pear sockets or authorization requests. Separate the client into REST commands, authentication, WebSocket parsing, normalized state, and reconnection modules.

Apply validated partial WebSocket updates without clearing omitted fields. Render the current snapshot on every `willAppear` and release each context's subscription on `willDisappear`. Keep display and encoder-selection state per context. A `204` only confirms IPC dispatch. It does not confirm a player state change. Pending command targets remain separate from confirmed display state.

Default to `127.0.0.1:26538`, HTTP/WS, and automatic auth detection. An unauthenticated API probe that succeeds supports Pear `NONE` without a prompt. A `401` starts one first-run `POST /auth/{id}` attempt. Store its `accessToken` in global settings and reuse it. Do not reuse old YTMD tokens.

Use REST `Authorization: Bearer <token>` and WebSocket `/api/v1/ws?token=<encoded-token>`. The query value is the token alone. Never log credentials, headers, or token-bearing URLs. Show status without exposing the token.

Version the settings schema. Bind tokens to the configured endpoint and clear/reauthorize on endpoint changes. Serialize authorization. Denial, invalid tokens, or close `1008` must not cause approval loops. Provide Reauthorize. Pear 3.12.0 issues tokens without `exp`; still handle `401` and revocation.

Reconnect at 1, 2, 4, 8, 16, and at most 30 seconds, with bounded jitter. Keep one reconnect timer and one current socket generation. Cancel old requests on host changes and ignore old-generation callbacks. Authorization needs a longer cancellable timeout than ordinary commands. Coalesce repeated log errors.

## D005 — State and command rules

Use WebSocket for playback, song, position, volume/mute, shuffle, and repeat. Use bounded REST reads on connection, track change, and commands to confirm state or fill gaps. Do not continuously poll fields Pear pushes.

Pear 3.12.0 does not send like state through the API WebSocket. Read `/like-state` on connection, video change, and rating commands. External rating changes on the same track can remain stale on unmodified Pear; document this limit. A later optional Pear `LIKE_CHANGED` event can close the gap. Do not claim this event exists in 3.12.0.

Pear calls the native `updateLikeStatus('LIKE'|'DISLIKE')` method. Stage 4's pinned native-source tracing establishes same-state clearing to INDIFFERENT. Send the same like/dislike endpoint once, including when active; let the native renderer select the transition. Do not invent an unlike endpoint. See `research/like-dislike-behavior.md` for evidence and the live acceptance boundary.

Default all volume steps to 5%. Apply the configured step and signed dial ticks to confirmed/current volume, clamp to 0–100, and serialize/coalesce rapid commands. Do not display command targets as confirmed state. Mute uses `/toggle-mute` and Pear's `muted` flag, including when volume is zero.

The source-verified repeat cycle is `NONE → ALL → ONE → NONE`. Pear accepts `{ "iteration": 1 }` and clicks the native repeat control. Serialize commands and confirm with `REPEAT_CHANGED`; the live cycle remains a hardware/Pear acceptance check. It has no public target-mode setter. See `research/repeat-behavior.md`.

`POST /shuffle` calls `queue.shuffle()`. Stage 4 traced the inspected native server-queue path: it toggles real shuffle state in both directions. The legacy queue path may only reorder items. Confirm actual updates and alert on an unsupported/unconfirmed transition. If a live supported installation cannot turn shuffle off, a small explicit operation belongs in the separate Pear extension. Never show a false off state. See `research/standard-key-actions.md`.

## D006 — Native playlist start stays in Pear

The plugin resolves URL/ID and `Follow Shuffle State`/`Always Normal`/`Always Shuffle` into one request. The default is `Follow Shuffle State`, based on confirmed Pear state.

Proposed additive route: `POST /api/v1/play-playlist` with `{ "playlistId": "...", "shuffle": true|false }`. This route does not exist in 3.12.0. Stage 3 fixes the proposed contract in D013. The open upstream `playPlaylist` proposals have no native-shuffle selector and do not satisfy this contract.

Pear must resolve and invoke the exact operation behind YouTube Music's native Normal Play or Shuffle Play control before playback begins. Preserve its endpoint parameters. Do not guess an undocumented shuffle parameter, start normally then shuffle/skip, or fall back to normal playback when Shuffle Play fails. Return a clear unsupported/error result.

Keep the extension and its tests in a separate Pear fork branch such as `feat/api-playlist-start`. Do not copy Pear or YouTube Music source into this repository. Stage 3 reviewed Pear PRs #4615 and #4505; both are open and unmerged at the audit date. See `PLAYLIST_API_SPIKE.md` for pinned evidence, native dispatch details, and the exact source change map.

## D007 — Playlist Selector uses one encoder

Configure a list of names, URLs/IDs, start modes, and optional images. Rotation changes a per-context selection. Press starts that entry. Show name, index/count, and status through an ordinary feedback layout. Rotation alone does not start playback.

The audited APIs do not establish a portable way to replace a host-managed Dial Stack dynamically with this list. OpenDeck's `StackColor` metadata is not a stack-management API. A single encoder selector is the reliable equivalent. Duplicate selector contexts remain independent.

Stage 6 rechecked the exact retained framework and pinned OpenDeck inbound commands before implementing this equivalent. It occupies one host action; ordinary rotation selects a saved list entry, rather than creating one host-stack action per playlist or invoking host stack switching. The technical evidence and limits are in [Stream Deck Plus SDK research](research/stream-deck-plus-sdk.md) and D016.

## D008 — Build, packaging, and assets

Derive the output directory from the manifest UUID. Copy the unchanged MIT `LICENSE` into it. Repair watch mode with `esbuild.context().watch()`. Pin CLI 1.10.1, use Node.js 24 in CI, and run CI for pushes to `dev/pear-port`.

The canonical manifest retains Elgato's supported Windows/macOS entries. Stage 8 supplies `manifest.linux.json` for OpenDeck, which merges the override before runtime selection. Validate the canonical package and merged OpenDeck view separately. Do not add Linux to the canonical manifest and bypass schema errors. The configuration is now verified automatically; installed Linux/OpenDeck/device operation remains unverified. See D018.

Generic inherited icons were retained for baseline verification, without separate per-asset provenance. Stage 8 replaces them with project-created MIT geometry and removes the old PSD/promotional thumbnail from the current tree, preserving history/attribution. Do not copy YouTube/Google marks. Source SVGs stay editable in Git; only PNG renditions/notice enter distribution. See D018 and the asset audit.

OBS export stays excluded. The inherited `2.3.0` version remains a baseline identifier; select the first Pear release version during release preparation.

## D009 — Stage 2 runtime boundary

Build/watch now use `src/pear-plugin.ts` and `src/pear-pi.ts`. One plugin-owned `PearSession` creates one `PearClient`. It waits for Stream Deck global settings, merges credential writes into that record, and routes PI connection/status/reauthorize messages. The PI creates no Pear client, HTTP request, or socket. Status payloads contain no credentials. The host socket is distinct from the one Pear socket.

At Stage 2, the twelve inherited action classes and old PI classes remained dormant; keys showed “Actions pending”. Stage 4 replaces that active preview handler with `PearKeyActions` and shared `PearCommands` for the eleven standard keys. The inherited classes remain dormant reference source, including unported playlist/PI/dial code, and neither active bundle imports them. The connection panel was English only at that stage. Stage 5 adds action UI; Stage 8 supplies English/German/French active UI under D018.

Historical Stage 2 decision, superseded by D019: keep the companion package temporarily as a **development-only** dependency to type-check that dormant source. This is not its complete removal from the lockfile. Remove it and `legacy-guards.ts` when the source port no longer needs those types. The guards use real runtime narrowing and fix all 14 inherited TypeScript errors without lowering compiler strictness. Production bundles and the production dependency graph exclude the companion and Socket.IO.

## D010 — Versioned settings and explicit approval recovery

Store settings under the global `pear` key with `schemaVersion: 1`, host, numeric port, protocol, and an optional `credential` containing `accessToken`, endpoint origin, and client ID. Preserve unrelated global fields. Never import legacy top-level YTMD credentials. Normalize localhost to `127.0.0.1`; accept bare hostnames, IPv4, or IPv6, and reject embedded credentials, URLs, paths, and invalid ports. HTTP is the default; HTTPS uses WSS and the host's normal certificate trust.

Probe `GET /api/v1/song`, a fast cached route that can return 204 before playback. Without credentials, success means no token is required. An unauthorized probe starts one `POST /auth/io.github.scarfmeister.pear-streamdeck`. Validate `{accessToken}`, persist a token bound to that exact endpoint/client, and confirm it through another protected probe. A successful token-bearing probe confirms that credential works; it cannot establish whether the server has since disabled auth.

Persist an `authBlocked: interrupted` marker before sending an approval request. Clear it on success. Denial, malformed approval, interrupted/timeout approval, saved-token 401/403, or WS close 1008 requires explicit Reauthorize. This prevents repeated dialogs even across host restarts. Aborting a local request cannot dismiss Pear's outstanding dialog; a late response is ignored. Repeated Reauthorize while approval is pending is a no-op. Endpoint changes clear the old credential and block marker; saving the same endpoint preserves them.

Stream Deck's global-settings write has no persistence acknowledgment in this framework. The adapter submits the write immediately and handles synchronous failures; physical restart tests must verify host persistence. It ignores up to 16 pending own-write echoes so a delayed in-progress marker cannot undo a completed approval. No token, response body, header, or token-bearing URL enters diagnostic logs or PI status messages.

## D011 — Confirmed state, bounded networking, and failure behavior

REST routes are constrained to `/api/v1`; `/auth/{id}` is separate. Requests omit ambient browser credentials, reject redirects, attach bearer headers only when a token is available, send JSON only for bodies, and accept empty 204 responses. Errors carry a safe code/status instead of raw server/native error text. Ordinary REST timeout: 8 seconds. Approval timeout: 120 seconds. WS initial snapshot timeout: 15 seconds.

Opening a socket is insufficient. Require a valid flat `PLAYER_INFO` before connected/ready. Validate the seven audited events, finite numeric ranges, boolean fields, song metadata, and repeat enum. Reject malformed/oversized messages and ignore unknown event types. Snapshots and song records are frozen. Omitted fields do not erase prior metadata. Disconnection marks state unready; the next attempt starts with unknown fields and accepts no old-generation callbacks.

`ready` means an accepted API snapshot, **not** independently verified renderer readiness. Pear's startup cache defaults remain an upstream limitation. Do not interpret REST 204 as a confirmed state change. `request` and clamped `setVolume` provide the client foundation; volume-step queues and higher-level action semantics remain later work.

Reconnect uses one timer and one current socket generation: 1/2/4/8/16/30 seconds, ±20% jitter, at most 30 seconds. Reset the retry count only on a valid snapshot. A numeric probe `Retry-After` for 429 can extend the wait to at most 300 seconds. Stop, endpoint changes, and auth failure cancel requests/timers and close the socket. Playback commands are sent once and never automatically replayed. A failed ordinary request leaves confirmed state intact; unauthorized requests halt the session.

There is no continuous REST polling or invented heartbeat. A browser close/error path and the initial deadline drive recovery. A silent established TCP half-open connection cannot be promptly detected without a supported heartbeat; test normal restarts and disconnects on each host.

Read like state once after a snapshot and on video changes, with an explicit refresh method for future rating commands. Coalesce concurrent reads, discard responses for old tracks, and leave missing/malformed rating data unknown without breaking the socket. Same-track external rating changes remain a Pear 3.12.0 gap. Coalesce outage, malformed-message, command-error, and subscriber-error logs; position events do not log.

## D012 — Test runner and release limits

Use Node.js 24's built-in `node:test` with the existing esbuild to bundle TypeScript tests. No new runtime transport or test framework is needed. Update Node type declarations to 24 and remove unused Mocha/Chai/nyc/jsdom/ts-node/esm tooling. CI now checks all source and test types and runs the suite before packaging.

Use injected fetch/socket/settings/timer implementations to exercise approval, cancellation, state, commands, and backoff without real sleeps. Execute the actual browser entry bundles in isolated VM contexts to check host registration, token persistence messages, PI routing, key behavior, manifest image mapping, and cleanup. These tests do not establish real Pear, Elgato, OpenDeck, WebView, certificate, or hardware behavior.

Stage 2 has no client implementation blocker. Full dependency audit still has development-only findings in old companion and commit-hook tooling. Production audit is clear; this does not mean the whole dependency tree is clear. Keep the remaining development cleanup and physical acceptance in the release gate. No release, final PR, or next-stage action work is authorized here.

## D014 — Stage 4 standard key commands and confirmed displays

`PearClient.commands` owns one `PearCommands` instance for all eleven standard key actions. `PearKeyActions` keeps one shared snapshot subscription and separate render/settings caches for visible contexts. Appearance renders immediately; disappearance drops that context; host closure disposes the subscription, command waits, and pending input. Position-only events do not resend unchanged key displays. The existing framework, settings owner, UUIDs, and browser build remain intact.

Play/Pause chooses `/play` or `/pause` from confirmed `isPlaying`, so stopped state uses Play despite Pear's narrow `/toggle-play` implementation. Next/Previous send one ordinary transport request. Track Info retains the inherited press-to-play/pause behavior. Stateful host toggling is disabled in the manifest; index 0 means inactive/Play/unmuted and index 1 means active/Pause/muted.

Mute, shuffle, repeat, and playback accept one command per lane while confirmation is outstanding; overlapping activation alerts as busy. Volume has one shared lane with at most sixteen waiting inputs. Each input computes its clamped target from the latest confirmed volume, awaits a real update before advancing, and does not send a redundant bound command. Failures/cancellation discard waiting volume input. No playback command is automatically retried or replayed.

Commands wait up to two seconds for expected pushed state. Volume/mute/shuffle/repeat can then perform one bounded REST confirmation read. Malformed or stale reads cannot overwrite newer pushed fields. An unconfirmed command alerts and retains actual state. Like/Dislike always invoke the native supported toggle once, then do one delayed fresh rating read; unknown/stale rating limits remain explicit. REST dispatch acknowledgment alone never updates a displayed target.

Repeat uses mode-specific generic SVGs and labels through `setImage`/`setTitle`; it does not rely on undocumented state index 2. Shuffle has gray off and white on manifest images. These five SVGs are original MIT-licensed geometric assets; the final inherited asset audit remains later work.

Track Info defaults to title + artist, with up to twelve Unicode code points per line and ellipsis. A pure formatter supports the five requested formats for Stage 5, preserving full song/album/image metadata in the model. The existing artwork helper lacks timeout, race protection, and proven WebView CORS behavior, so Stage 4 uses its static icon. Per-action settings UI and artwork hardening are deferred. `steps` accepts integer percentages 1–100, default 5; stored settings are already honored and settings updates affect the next activation.

Playlist shows an explicit Pear API requirement and sends no start request. Inherited encoder declarations remain guarded/pending until the dedicated dial stage. No Pear code, package dependency, release, or final PR changes are part of Stage 4. The native-source findings and assumptions are persisted in the three Stage 4 research documents; real Pear/host/device acceptance remains required.

## D013 — Stage 3 playlist extension contract

**Decision: extend Pear in Stage 7.** Pinned Pear 3.12.0 (`3f599b42724be827db51cd4689996dc3e48a9561`) exposes neither playlist-start operation. `POST /queue` accepts one video; `POST /shuffle` operates on the current queue. No REST or WebSocket command accepts a playlist ID for startup. Stage 3 deferred a speculative client method. The user's Stage 5 scope now explicitly authorizes the guarded interface, settings, and fake-contract tests; these must expose missing capability without implying native operations already exist.

Stage 7 implements this contract in the separate Pear branch at `b5f13f65c71ca8890c08f52c7d7becde5d855be9`. Stock Pear remains unsupported. [D017](#d017--stage-7-contained-native-playlist-extension) and [extension research](research/pear-playlist-api-extension.md) record the implementation, conservative native-normal limitation, tests, and outstanding signed-in acceptance. The original Stage 3 investigation remains historical evidence.

### HTTP contract

Add one route, `POST /api/v1/play-playlist`, to the existing authenticated Hono API. Keep its existing JWT/authorized-client guards and `NONE` behavior. The request is strict JSON:

```json
{ "playlistId": "PL_example", "shuffle": true }
```

Both fields are required. `shuffle` must be a boolean. `playlistId` must match `^[A-Za-z0-9_-]{1,256}$`; do not require a guessed playlist prefix. Reject extra fields, URLs, whitespace, empty IDs, and non-JSON bodies with 400. IDs are case-sensitive. A syntactically valid ID can still be unavailable. The API accepts an ID only; URL parsing and startup-mode selection stay in the shared Stream Deck client.

On success return **200**, `application/json`:

```json
{ "playlistId": "PL_example", "shuffle": true, "status": "dispatched" }
```

This means the requested native command resolved and a native handler accepted dispatch. It does not mean sound started, a player state changed, or listening metrics were recorded. Do not return 204 immediately after sending IPC. Keep the existing player/queue/shuffle WebSocket events unchanged. Confirm playback through those events and manual evidence; do not add a new playlist-success event at this stage.

Extension errors use `{ "error": { "code": "...", "dispatch": "not_dispatched" } }`. `dispatch` can be `unknown` only after a dispatch permit was granted. Keep messages/logs free of tokens, account data, raw browse responses, and tracking payloads.

| HTTP | Code / meaning | Dispatch result |
| --- | --- | --- |
| 400 | `INVALID_PLAYLIST_REQUEST` | `not_dispatched` |
| 401 | Existing Pear authorization guard; retain its existing response format | No playlist work begins. |
| 409 | `PLAYLIST_START_BUSY`; one request is already active | `not_dispatched` |
| 422 | `PLAYLIST_UNAVAILABLE`; explicit inaccessible/empty/unplayable result from YouTube Music | `not_dispatched` |
| 501 | `NATIVE_PLAYLIST_CONTROL_UNAVAILABLE` or `NATIVE_PLAYLIST_DISPATCH_UNAVAILABLE`; missing, ambiguous, or unsupported native structure/handler | `not_dispatched` |
| 502 | `PLAYLIST_RESOLUTION_FAILED`; browse request failed | `not_dispatched` |
| 502 | `PLAYLIST_DISPATCH_FAILED`; failure after permitting native dispatch | `unknown` |
| 503 | `PLAYER_NOT_READY`; renderer/player/API adapter is not ready, or its generation was canceled | `not_dispatched` before a permit, otherwise `unknown` |
| 504 | `PLAYLIST_START_TIMEOUT`; five-second server deadline expired | `not_dispatched` before a permit, otherwise `unknown` |

Register request/success/error schemas in Pear's existing OpenAPI `/doc`; no extra capability endpoint is needed. Unmodified 3.12.0 returns 404 for this path. The later client must report that the Pear extension is required and send no alternative command. An unrelated camel-case `playPlaylist` route is not this capability. Document the required Pear extension commit/build before enabling playlist actions.

### Native resolution and dispatch

Use an **API Server plugin renderer adapter** and one correlated IPC broker. Pear already supports plugin renderer `start`, `onPlayerApiReady`, and `stop` hooks. This keeps the new behavior inside `src/plugins/api-server` and avoids new handlers in the global renderer or unrelated song controls.

1. In the signed-in Pear renderer, require the loaded player and `ytmusic-app.networkManager`. Resolve the requested playlist through that manager's `/browse` request with `{browseId: 'VL' + playlistId}`. Do not use a plugin-side YouTube request, a second login, or full-page navigation. The `VL` prefix belongs to the internal browse ID, not the public input.
2. Select only the requested playlist's header: responsive, detail, or editable-detail layouts. Normal start uses its native play control. Shuffle start uses its native shuffle button or the header menu's `MUSIC_SHUFFLE` item. Support the observed responsive `buttons[].musicPlayButtonRenderer.playNavigationEndpoint` and `buttons[].menuRenderer.items[].menuNavigationItemRenderer.navigationEndpoint` structures. Read supported legacy header equivalents explicitly. Do not recursively score all endpoints: track rows, related shelves, mix/radio, queue insertion, and download controls are not startup controls.
3. Modern controls can refer to command entities. Resolve the control's actual command from its entity data as YouTube Music does, including `musicShuffleButtonRenderer.button` and play-command overrides. If that relation cannot be resolved safely, return 501. Select by renderer kind and icon fields, never translated text. Require one unambiguous startup command for the requested ID; reject a command for a different playlist.
4. Preserve the complete command object, including `watchEndpoint` / `watchPlaylistEndpoint`, opaque `params`, `clickTrackingParams`, `loggingContext`, music configs, and native command wrappers. Do not replace it with a watch URL, first-video ID, guessed shuffle constant, or a handmade queue. The public-site investigation observed distinct Normal Play and Shuffle Play commands for the same playlist.
5. Dispatch once through the native app action router. The inspected website routes `yt-watch-endpoint` and `yt-watch-playlist-endpoint` to `handleNavigationEndpoint`, then `navigator.navigate`. Its `yt-action` event detail has `actionName`, `optionalAction`, `args`, and mutable `returnValue`. For the supported leaf commands, emit that event from `ytmusic-app` with the complete endpoint as the first argument, the app as the source argument, `optionalAction: false`, and an empty `returnValue`. Use `bubbles: true` and `composed: true`. A nonempty handler return list is dispatch acknowledgment even if its entry is `undefined`; zero handlers is 501. A native `commandExecutorCommand` must go through `yt-command-executor-command` intact after validating its startup leaves, rather than being unpacked into guessed operations. Do not call the minified constructors or string-only `app.navigate(page)` with an endpoint object.
6. Resolve and validate everything before granting dispatch. Never perform normal start, post-start shuffle, skip, or fallback playback for a shuffle request. Never interpret a random first-track match as failed shuffle. The website is loaded dynamically; the dispatch envelope and both mode semantics must pass the live Pear acceptance gate below before shipping this extension.

The website's fresh-queue path resets the previous shuffle state before loading the native queue. This supports normal-start feasibility from an old shuffled queue, but is static-source evidence only. A same-playlist normal control can reuse an existing queue. Test both cases. If a captured native normal command cannot enforce normal startup, resolve the native playlist-start/clear-state command before playback; fail unsupported rather than adding a post-start workaround or claiming Always Normal passed.

### IPC lifetime and cancellation contract

Use plugin-owned channels. Main-to-renderer `peard:api-playlist-start` carries `{requestId, generation, deadlineUnixMs, playlistId, shuffle}`. The main process creates the correlation ID and a five-second absolute deadline, below the client REST timeout of eight seconds. The renderer resolves but does not yet dispatch.

Renderer-to-main `peard:api-playlist-permit` is an invoke request `{requestId, generation}` returning `{allowed: boolean}`. Grant only the active, unexpired request, from this window's main frame, with the API enabled and the client still authorized. Record that native dispatch may now occur. Before emitting the native event, the renderer rechecks its generation, cancellation flag, readiness, and absolute deadline. There must be no further asynchronous work between that check and dispatch.

Renderer-to-main `peard:api-playlist-result` carries `{requestId, generation, status: 'dispatched'}` or `{requestId, generation, status: 'failed', code}`. Main validates the sender, correlation, generation, and payload. A successful native handler acknowledgment resolves the HTTP success; it is not a playback confirmation. Main-to-renderer `peard:api-playlist-cancel` carries `{requestId, generation}` on abort, timeout, API stop/rebind, or window reload/destruction. A late browse promise must never obtain a permit or start playback.

Keep one active operation and reject overlapping requests with 409; do not queue playlist starts. Ignore duplicate/stale results. Own and remove the exact Electron IPC listeners/permit handler on plugin stop. Use a new generation on API/window restarts. Cancel pending work on HTTP abort and server/config/window changes. Re-enabling the plugin after the player is already loaded must restore readiness through the existing lifecycle hook and runtime guards.

There is an unavoidable interval after the permit when native dispatch can occur before an abort/result is observed. In that case the outcome is `unknown`, not a promise that playback did not start. No automatic HTTP, reconnect, or IPC replay is allowed. Already accepted YouTube Music playback/network work cannot be undone by canceling the REST request.

### Later client interface and required mode tests

The later shared client will expose `startPlaylist(input, mode)` and send exactly one request after parsing input and resolving the mode. No action or PI opens its own transport. Its successful result means dispatched only. Capture Follow's confirmed shuffle value at activation; do not change it during endpoint resolution.

| Startup mode | Confirmed shuffle at activation | Request `shuffle` |
| --- | --- | --- |
| Always Shuffle | Either value or unknown | `true` |
| Always Normal | Either value or unknown | `false` |
| Follow Shuffle State (default) | `true` | `true` |
| Follow Shuffle State (default) | `false` | `false` |
| Follow Shuffle State | Unknown/unready | No start. Allow one bounded state refresh; otherwise report state unavailable. |

Parse a trimmed raw ID or an HTTP(S) YouTube Music/YouTube playlist or watch URL with exactly one valid `list` query value. Allow exact hosts `music.youtube.com`, `youtube.com`, `www.youtube.com`, `m.youtube.com`, and `youtu.be` (a shared watch URL with `list`). Reject embedded credentials, other hosts/subdomains, unsupported paths, missing/duplicate `list`, malformed encoding, invalid IDs, and unsafe schemes. Decode once, ignore unrelated query fields, preserve case, and do not take `v`, a short-link video path, or a browse ID as a substitute for `list`.

Stage 5 adds parsing, both Always modes, Follow off/on/unknown, request construction, missing-capability, and no-replay tests against the proposed contract, as explicitly requested. Their mocked dispatch result is not a claim of current Pear capability. Stage 3 added no client call; native operation and signed-in acceptance still require Stage 7. The exact Pear source map and extension test gate are in `PLAYLIST_API_SPIKE.md`; physical checks are in `MANUAL_TESTING.md`.

## D015 — Stage 5 shared action settings and guarded playlist interface

Retain the active HTML PI and framework. Stage 5's local outbound action-context overrides were incorrect and are superseded by **D021**: inherited methods use the PI registration UUID as context, retaining the action UUID in `sendToPlugin`. Cache settings that arrive before setup, render only the relevant section, preserve unrelated per-action fields, and keep unsaved input through status/settings updates. Common host/port/protocol/authentication/reauthorize controls continue using the plugin-owned `PearSession`; tokens never enter status, input fields, or logs. A plugin save-confirmation message lets invalid connection edits remain visible for correction. Neither PI nor action opens another Pear transport.

`src/streamdeck/action-settings.ts` centralizes volume and Track Info validation for the PI/key layer. Old integer/string `steps` 1–100 stay compatible; invalid/missing values use 5%. Explicit invalid edits do not write. Track Info defaults to TITLE_ARTIST and exposes all five formats. Keep the existing bounded formatter/centered 10-point title/static image; custom host titles and wide glyphs remain manual acceptance. No new action schema version is needed for these additive flat settings; migration occurs on explicit Save rather than rewriting unrelated contexts.

Playlist settings store `playlistId` and `startupMode` (FOLLOW_SHUFFLE_STATE default, ALWAYS_NORMAL, ALWAYS_SHUFFLE). Save parses URL/raw ID, removes legacy `playlistUrl`, and retains unrelated settings. Legacy nonempty URL wins over an old ID; malformed URL does not silently start the old playlist. D013's parsing/mode contract is implemented in one pure module with conservative URL/input limits documented in `research/playlist-settings.md`.

`PearClient.startPlaylist(input, mode)` is the Stage 7 client interface. One active request, captured known Follow state, one bounded nullable-state read, generation cancellation, and exactly one protected POST prevent guessed startup or automatic replay. Always modes work without a known shuffle flag. Require a matching HTTP 200/ID/boolean/`dispatched` response; a 204 or mismatched response is not success. No response changes the player/song/shuffle model. Missing route/native capability reports Stage 7; ambiguous failures remain unconfirmed. No alternate route, normal→shuffle→skip sequence, or fake playback is used. Without the extension, all configuration/validation/persistence and standard keys remain usable; both playlist execution modes remain blocked.

Research is saved in `research/property-inspector-sdk.md`, `track-info-display.md`, and `playlist-settings.md`. The complete automated suite exercises actual browser bundles plus fake client/server boundaries. Live Pear/Elgato/OpenDeck/device operation and host disk persistence remain unverified. Stage 5 makes no Pear source, dependency/lockfile, upstream/default-branch, dedicated-dial, release, or final-PR changes.

## D016 — Stage 6 encoder behavior and compatibility boundary

Retain D002's browser runtime, locked `streamdeck-typescript` 3.3.4, SDKVersion 2, and minimum host 6.4. Add `.volume-dial`, `.transport-dial`, and `.playlist-selector` as Encoder-only actions. Keep inherited `.volume-up` and `.play-pause` encoder declarations as compatible aliases for already placed profiles, routed to the same handlers; their Keypad behavior is unchanged. A typed local decorator registers `touchTap` through the framework's real event manager. Act once on `dialUp`, ignore `dialDown`, guard the visible action/controller, refresh on short touch, and ignore hold. Touch sends no playback or mute command.

One `PearDialActions` subscription observes the existing plugin-owned client. Volume consumes signed ticks × the shared validated step (1–100, default 5) through the existing bounded confirmed-volume queue; targets never enter feedback. No new timer/coalescing or independent volume model is needed. Transport sends one next/previous per signed detent; at most sixteen ticks wait per context, oversized batches are rejected, and error/disconnect/disappearance/replacement discards unsent work. Already dispatched commands cannot be undone; nothing is replayed. Press uses shared true mute or confirmed play/pause logic.

Volume uses `$B1`; transport/selector use bundled `dial-layout.json`, 200×100, with bounded title/detail/status text and plugin-owned icons. Unknown/offline volume disables the indicator, and mute/playback remain explicitly unknown until real state exists. Position-only updates do not resend feedback. Embedded PNG/JPEG selector images are bounded to 24 KiB and checked for encoding/signature/size; invalid stored images use the default icon. Full decoding/readability remains host acceptance. Custom host title/icon overrides can take precedence.

D007's selector equivalent supports at most sixteen ordered entries. Each explicit save validates a 1–64 character name and URL/ID, stores canonical ID and startup mode (Follow default), and keeps unrelated context settings. Invalid saved name/ID slots stay visible and cannot execute; invalid old modes default to Follow. Rotation wraps a per-context index and writes ordinary action settings, even while offline. Empty selection is zero, invalid/negative indices default to zero, and oversized indices clamp on appearance/settings/list shrink. Input-event settings cannot rewind local selection; `didReceiveSettings` remains authoritative. During PI edits, incoming selector writes update the saved index without erasing the draft; Save preserves that latest index, then clamps to the edited list. Reordering/removal retains position, not an inferred playlist identity. Late startup results do not mark a different selection or disappeared context as failed.

Selected press calls the same `PearClient.startPlaylist` as the key. Follow uses actual shuffle at activation; stock Pear still requires Stage 7 in all modes. No independent queue/playback state, host-stack API, alternative route, or normal→shuffle→skip is introduced.

Pinned OpenDeck 2.14.0 and its locked renderer accept these events, layouts, object indicators, and embedded rasters. Automated browser/wire/layout tests and official CLI validation verify plugin behavior and schema. Source tracing supports expected OpenDeck compatibility; it is not a running-host/device pass. Linux manifest/installation work remains later under D008. Elgato/OpenDeck hardware, host write persistence, WebView networking, rendering, and native playback remain explicit checks in `MANUAL_TESTING.md`. Evidence: [Stage 6 SDK research](research/stream-deck-plus-sdk.md).

## D017 — Stage 7 contained native playlist extension

Committed project evidence still required a Pear change. Use the separate fork `Scarfmeister/pear-desktop`, branch `feature/streamdeck-playlist-api`, based on the reviewed fork/upstream master `a8830222afffb4af98aaa9b19287ebc24952605b`. The implementation commit is `b5f13f65c71ca8890c08f52c7d7becde5d855be9`. No dependency or lockfile changes, copied Pear source, global renderer/song-controls patch, upstream PR, or default-branch work is needed.

Retain D013's one protected `POST /api/v1/play-playlist` and existing authentication. A plugin-owned broker/renderer adapter resolves the requested header control through the signed-in network manager, validates bounded command/entity relations, preserves its complete opaque command, and emits one acknowledged native event. Keep one active operation, the five-second deadline, main-window/main-frame checks, correlation/generation/permit gating, exact owned main-listener disposal, and cancellation on abort/configuration/rebind/stop/reload/destruction. SPA navigation does not invalidate the request. API re-enable uses the existing player-ready hook and a local runtime identity/readiness guard. No native success event or optimistic player state is added.

Native normal watch commands can reuse queue items. Reject a normal video command when current native shuffle is true and the requested playlist can be reused, or when its queue context is unverified. Do not manufacture a clear-state wrapper or claim an existing clear-state feature flag restores normal order. A supplied native watch-playlist startup uses the fresh-queue path. Unknown website variants, ambiguous controls, partial/missing entity relations, and missing handlers fail safely. This is an explicit limitation: Always Normal in a shuffled same-playlist queue is not established for legacy watch commands. Signed-in normal/shuffle/audio/queue semantics remain a manual gate, including modern and localized layouts.

The shared Stream Deck interface already matched the final endpoint. Add only bounded error-contract handling: consume at most 1,024 error-body bytes for this POST, retain only known code/status/dispatch combinations, and discard arbitrary native/server text. A missing/unknown extension shows Update Pear; an identified native 501 shows Unavailable. Known pre-dispatch failures remain rejected; any recognized unknown outcome, including cancellation's HTTP 503 after a permit, stays unconfirmed with no replay. Keys and selector share the same error/state behavior and connection.

Pear's 39-test suite includes 33 new HTTP/resolver/broker/adapter tests and its existing Electron launch smoke test. Source/test type checks, builds, changed-file formatting, and new API lint pass; 17 unrelated base formatting failures and 17 existing lint warnings remain. The Stream Deck suite has 105 tests. A reproducible loopback integration script uses the actual Pear route/broker/adapter and shared client with synthetic native state; it also validates optional freshly fetched anonymous browse data. These are automatic contract/source-shape checks, not signed-in playback or hardware acceptance. Full evidence and upstream considerations are in [extension research](research/pear-playlist-api-extension.md).

## D018 — Stage 8 assets, localization and distribution validation

Replace all inherited bitmaps with original generic MIT geometry rather than asserting undocumented per-asset provenance. Remove the unproven PSD and YTMD/Elgato promotional thumbnail from the current tree while preserving upstream history and the unchanged MIT notice. Commit 23 editable SVG sources and 46 PNG renditions; package only PNGs/notice so extensionless image references are unambiguous and OpenDeck feedback remains raster. Dynamic Repeat uses explicit PNGs with distinct off/all/one symbols. Artwork remains deferred. See [asset research](research/assets-and-licensing.md).

Keep every inherited locale (en/de/fr); en.json is canonical. Reuse unchanged upstream translations, translate final Pear UI/metadata fallback/status/help/error wording, and preserve programmatic identifiers and actual metadata. The audit corrects the earlier broad English-replacement note: most German/French content survived, but the root description/new active forms needed correction. A bundled host-language adapter reads the same resources without adding state/connection/settings owners. Require full manifest/action/state/encoder/key/parameter parity and explicit per-leaf identical-term exceptions in normal tests and both CI/release build gates. Complete authored translations still need native-speaker and device readability review. See [LOCALIZATION.md](LOCALIZATION.md).

Retain streamdeck-typescript 3.3.4, browser entry points, SDKVersion 2, CLI 1.10.1 and Node 24. Current official manifest/layout schemas 0.5.1 validate this architecture. Canonical Version is 2.3.0.0 and the unsupported URL field is removed at source; preparation now checks source/build parity. Keep category Pear Desktop under D003 despite its one CLI warning. Current host targets are Windows 11 (64-bit Intel/AMD) and macOS 13+; the numeric manifest minima are Windows **10** / macOS **13** under the later D020 correction. Windows 11 reports OS version 10.0, so the Stage 8 minimum of 11 was wrong. Retain software feature minimum 6.4 and test actual host versions rather than asserting hardware support. No SDK 3/Node runtime/DRM migration is needed. See [tooling research](research/elgato-build-and-packaging.md).

Use an explicit runtime build allowlist and ship manifest.linux.json (RFC 7396 merged Linux OS + CodePathLin action.html) with identical action IDs/layouts. Validate the official canonical view and package-local merged OpenDeck view separately. The Python ZIP audit checks real packaged contents, references, PNG dimensions/state distinctions and original MIT; source SVGs/dormant examples/dev files are excluded. Extend existing CI, including release gates, rather than adding redundant workflows. Build the ignored development installer; do not commit it, publish a release or open a final/upstream PR in Stage 8.

122 plugin tests, locale parity, official validation and archive checks are automatic evidence. OpenDeck 2.14.0 source supports expected events/import/WebView behavior; it is not a physical pass. Host install/auth/settings persistence, keys/Plus/touch/language rendering, Flatpak/WebView networking, signed-in normal/native Shuffle Play, and declared minimum-host behavior remain manual release gates. Known state/rating/legacy-shuffle/native-reuse/half-open limits and seven development dependency findings are documented, without unrequested dependency/source cleanup. Stage 8 stops after its checkpoint, commits, pushes and remote verification.

## D019 — Stage 9 final audit and conservative capability claims

Review the complete default-to-development diff and every substantive spec requirement rather than assuming earlier completion. Keep the retained framework/HTML/SDK 2 architecture: the shared session/client/state, central PI messaging, confirmed commands, dedicated/alias encoders and local selector remain suitable. Remove 25 dormant companion/action/PI/interface/helper/example files and the unused companion/intl dependencies; this supersedes D009's earlier retention for development type checking while preserving original history and MIT.

Ordinary key releases must match a visible current context/action and controller, as dial events already do. Ignore absent/disappeared/reassigned/Encoder/Multi Action contexts. Remove dead Dials pending feedback. Two meaningful key regressions plus existing shared-client/browser tests cover the change; hardware lifecycle ordering remains manual R07.

Do not advertise Multi Actions until explicit requested-state semantics and compatible host lifecycle are implemented. All action manifest flags are false, and Multi Action input is rejected. The original specification asks for normal keys and the dedicated dials; extra inherited timing/hold-repeat/layout variables/library dropdown remain outside this scope. Artwork stays deferred under D014/D018. Preserve encoder aliases and requested ordinary behavior.

Keep conventional commits, replace deprecated Husky 3/commitlint with pinned Husky 9.1.7 /commitlint 21.2.3, and require Node 24 for build/tests. The tracked hook uses local commitlint `--edit`; the prepare script initializes Husky. The inherited dot-directory ignore rule needs an explicit `.husky/` exception. Source validation checks the actual hook/prepare presence after the first code commit omitted those files. Full dependency audit is now zero, superseding the seven earlier development findings in D012/D018. No framework/compiler/bundler upgrade or new style formatter is needed.

Run the source/JavaScript repository audit as `npm run lint` and before normal tests, alongside source/test types, all 124 tests, locale/browser checks, clean build and current official CLI/real archive validation. Static guards cover important known invariants, not arbitrary correctness. Safe diagnostics and no replay remain architectural invariants. Update fork issue/debugger ownership while preserving original attribution.

Open only the explicitly authorized Scarfmeister fork PR into master, then close durable matrix/status/handoff/checkpoint records and verify the pushed PR head. Tested final implementation is `5589784ca877ab49c1dacce2323c04345594d279`; PR is [#1](https://github.com/Scarfmeister/Pear-StreamDeck/pull/1). No merge/release/upstream Pear PR or next automated stage follows. Real host/device/auth persistence/native audio remain unrun; Pear extension remains `b5f13f65c71ca8890c08f52c7d7becde5d855be9` in its separate repository. Research: [final audit/dependencies](research/final-audit-and-dependencies.md); exact results/next action: [Stage 9](checkpoints/stage-09.md), [matrix](REQUIREMENTS_STATUS.md), [handoff](HANDOFF.md).

## D020 — Authorized Windows manifest version correction

The post-Stage-9 user request explicitly authorizes correcting Windows `MinimumVersion` to **`10`**, associated documentation/research, a full rerun and a new package. This is a scoped correction to Stage 9, not an automatically started Stage 10. Windows 11's reported OS version is 10.0, and the official Elgato manifest examples use Windows minimum 10. D018's earlier translation of the product name into numeric minimum 11 was incorrect.

Keep Windows 11 as the intended current host target, distinguish metadata admission of Windows 10/11 from verified host/device support, and keep macOS minimum 13/software minimum 6.4/runtime/action identities unchanged. Correct the source manifest, rebuild and inspect the real installer; no SDK migration, new unit test for the literal, dependency or Pear change is necessary. Existing full tests/types/lint/official validation/archive checks must pass again. Add Windows-version acceptance to H01 and keep all unrun hardware rows unverified.

Research and reproduction: [packaging correction](research/elgato-build-and-packaging.md#windows-os-version-correction-after-stage-9), [followup checkpoint](checkpoints/stage-09-windows-version-fix.md). Push logical correction/documentation commits to `dev/pear-port`, verify PR #1 includes them, and stop. No merge, release, upstream Pear PR or additional stage is authorized.

## D021 — Manual acceptance PI context correction

The user explicitly authorizes this post-Stage-9 bug fix, not another stage. Windows 11 Pro 25H2 / numeric 10.0.26200 with Stream Deck 7.4.2.22730 installed the corrected package and connected its backend, but rejected PI `getSettings`, `setSettings` and `sendToPlugin` as originating from the wrong context. Pear's authenticated API endpoint was independently reachable; the PI controls were blocked by host routing before reaching the plugin.

Use the locked `streamdeck-typescript` 3.3.4 implementations of `requestSettings`, `setSettings` and `sendToPlugin`; remove the local overrides. Outbound PI context is **`this.uuid`**, the PI registration UUID, distinct from the action UUID and action instance context. `sendToPlugin` preserves **`actionInfo.action`**. Incoming action settings still match **`actionInfo.context`** and the action UUID. This supersedes only D015's routing inference; validation, settings/drafts, shared Pear REST/WebSocket/state/auth architecture and SDK remain unchanged. No manually obtained token is used.

Five browser-bundle regressions simulate actual PI registration with distinct identifiers and verify initial settings, action Save/readback, status, connection Save and Reauthorize messages. All five failed against the old implementation while the previous 124 passed; all 129 pass after correction. Full locked install/lint/types/tests/build/official validation/pack/archive/audit and existing cross-repository integration pass. Source: [context-routing research](research/property-inspector-context-routing.md); exact commits/package: [manual bug-fix checkpoint](checkpoints/manual-bugfix-02-pi-context.md).

Record the initial Windows connection/authentication PI failure; keep the corrected Windows retest **Pending** and other hardware/runtime gates unverified. Push only `dev/pear-port`, verify PR #1 automatically includes the fix, and stop. No merge, release, Pear modification, SDK migration or additional stage is authorized.
