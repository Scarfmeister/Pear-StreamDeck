# Decisions

Audit date: 2026-10-04 UTC / 2026-10-03 America/Chicago.

## D001 — Scope, requirements, and Git

`PROJECT_SPEC.md` preserves the supplied specification byte-for-byte. Its SHA-256 is `798be8f52331034021c925dea263c7adba4b46c2b36e20b4309647e2dfd5436b`.

Stage 1 authorized the audit and bootstrap. The current Stage 2 instruction authorizes the shared Pear client, host settings integration, and client tests. It excludes the full action port and playlist startup. The original instruction to finish the port and prepare a final PR applies to later work. Do not change Pear or open a PR at this checkpoint.

Work in `Scarfmeister/Pear-StreamDeck` on `dev/pear-port`. `origin` is the fork; `upstream` is `XeroxDev/YTMD-StreamDeck`. Preserve the default branch, upstream history, and original MIT license. Never push to upstream.

## D002 — Retain the framework with limited modernization

Keep `streamdeck-typescript` 3.3.4, TypeScript, the HTML plugin entry point, esbuild browser bundles, and manifest `SDKVersion: 2`. Add a small local Stream Deck adapter for touch-event typing, numeric repeat states, and common rendering behavior when needed.

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

Pear calls the internal `updateLikeStatus('LIKE'|'DISLIKE')` method. Same-state toggle behavior is not proven here. Until a clear operation is verified, pressing an active rating will be a client no-op after a fresh state read. Do not invent an unlike endpoint.

Default all volume steps to 5%. Apply the configured step and signed dial ticks to confirmed/current volume, clamp to 0–100, and serialize/coalesce rapid commands. Do not display command targets as confirmed state. Mute uses `/toggle-mute` and Pear's `muted` flag, including when volume is zero.

The intended repeat cycle is `NONE → ALL → ONE → NONE`. Pear accepts `{ "iteration": 1 }` and clicks the native repeat control. Verify the live cycle order, serialize commands, and confirm with `REPEAT_CHANGED`. It has no public target-mode setter.

`POST /shuffle` calls `queue.shuffle()`. Source alone does not establish an off transition. Verify both directions. If it only shuffles, a small explicit state/toggle operation belongs in the separate Pear extension. Never show a false off state.

## D006 — Native playlist start stays in Pear

The plugin resolves URL/ID and `Follow Shuffle State`/`Always Normal`/`Always Shuffle` into one request. The default is `Follow Shuffle State`, based on confirmed Pear state.

Proposed additive route: `POST /api/v1/play-playlist` with `{ "playlistId": "...", "shuffle": true|false }`. This route is planned; it does not exist in 3.12.0. Align its name with reviewed upstream work if appropriate.

Pear must resolve and invoke the exact operation behind YouTube Music's native Normal Play or Shuffle Play control before playback begins. Preserve its endpoint parameters. Do not guess an undocumented shuffle parameter, start normally then shuffle/skip, or fall back to normal playback when Shuffle Play fails. Return a clear unsupported/error result.

Keep the extension, tests, and patch/PR plan in a separate Pear fork branch such as `feat/api-playlist-start`. Do not copy Pear source into this repository. Pear PR #4615 is open and unmerged at the audit date; review it later without assuming its broader controls meet native Shuffle Play.

## D007 — Playlist Selector uses one encoder

Configure a list of names, URLs/IDs, start modes, and optional images. Rotation changes a per-context selection. Press starts that entry. Show name, index/count, and status through an ordinary feedback layout. Rotation alone does not start playback.

The audited APIs do not establish a portable way to replace a host-managed Dial Stack dynamically with this list. OpenDeck's `StackColor` metadata is not a stack-management API. A single encoder selector is the reliable equivalent. Duplicate selector contexts remain independent.

## D008 — Build, packaging, and assets

Derive the output directory from the manifest UUID. Copy the unchanged MIT `LICENSE` into it. Repair watch mode with `esbuild.context().watch()`. Pin CLI 1.10.1, use Node.js 24 in CI, and run CI for pushes to `dev/pear-port`.

The canonical manifest retains Elgato's supported Windows/macOS entries. A later `manifest.linux.json` override will add Linux for OpenDeck, which merges the override before runtime selection. Validate the canonical package and merged OpenDeck view separately. Do not add Linux to the canonical manifest and bypass schema errors. Linux support is not claimed at this checkpoint.

Generic inherited icons remain for baseline verification. No separate per-asset provenance list was found. Final icons need generic media symbols and documented redistribution rights. Do not copy YouTube/Google marks. The old PSD and promotional thumbnail are not approved as final assets here.

OBS export stays excluded. The inherited `2.3.0` version remains a baseline identifier; select the first Pear release version during release preparation.

## D009 — Stage 2 runtime boundary

Build/watch now use `src/pear-plugin.ts` and `src/pear-pi.ts`. One plugin-owned `PearSession` creates one `PearClient`. It waits for Stream Deck global settings, merges credential writes into that record, and routes PI connection/status/reauthorize messages. The PI creates no Pear client, HTTP request, or socket. Status payloads contain no credentials. The host socket is distinct from the one Pear socket.

The twelve inherited action classes and old PI classes remain dormant source for the action-port stage. Neither active bundle imports them. Keys show “Actions pending” and presses give an alert; there are no playback handlers or playlist startup. The preview connection panel is English only. Action settings and translated Pear UI belong to the later action/UI work.

Keep the companion package temporarily as a **development-only** dependency to type-check that dormant source. This is not its complete removal from the lockfile. Remove it and `legacy-guards.ts` when the source port no longer needs those types. The guards use real runtime narrowing and fix all 14 inherited TypeScript errors without lowering compiler strictness. Production bundles and the production dependency graph exclude the companion and Socket.IO.

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

Use injected fetch/socket/settings/timer implementations to exercise approval, cancellation, state, and backoff without real sleeps. Execute the actual browser entry bundles in isolated VM contexts to check host registration, token persistence messages, PI routing, dormant-action behavior, and cleanup. These tests do not establish real Pear, Elgato, OpenDeck, WebView, certificate, or hardware behavior.

Stage 2 has no client implementation blocker. Full dependency audit still has development-only findings in old companion and commit-hook tooling. Production audit is clear; this does not mean the whole dependency tree is clear. Keep the remaining development cleanup and physical acceptance in the release gate. No release, final PR, or next-stage action work is authorized here.
