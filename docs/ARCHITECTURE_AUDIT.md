# Stage 1 architecture audit

Audit date: 2026-10-04 UTC / 2026-10-03 America/Chicago. Findings below come from source inspection. Proposed behavior is labeled as planned. No physical Stream Deck or running Pear application was available for this audit.

## Source versions and fork evidence

| Source | Audited reference | Evidence |
| --- | --- | --- |
| Fork and YTMD upstream | `8b0c3320ce59b741b3165a1c8ac3a54b66c2c97a` | GitHub reports `fork: true`; both `parent` and `source` are `XeroxDev/YTMD-StreamDeck`. Both default heads were identical, with 192 reachable commits and an empty tree diff before this stage. |
| Pear Desktop | tag `v3.12.0`, commit `3f599b42724be827db51cd4689996dc3e48a9561` | Read the tag's API config, backend guards, auth/control/WebSocket routes, schemas, song controls, renderer, and frontend state observers. |
| OpenDeck released version | tag `v2.14.0`, commit `b2d09ca60089cea38ffea7eef191270ffefdf851` | Read manifest loading, runtime selection, registration info, encoder events, feedback handlers, and layout definitions. Latest release returned by GitHub at the audit date. |
| OpenDeck main cross-check | `ca78774c62e528be7b331b48c4f6487288545414` | Initial source inspection; the relevant compatibility paths were then checked against released 2.14.0. |
| Framework | `streamdeck-typescript` 3.3.4 | Read the installed package's handler, event manager, decorators, dial events, and feedback methods. |
| Official SDK / CLI | `@elgato/streamdeck` 3.0.1 / `@elgato/cli` 1.10.1 | Read current official docs, npm metadata, SDK connection/dial code, and exercised CLI validation and packing. |

The fork's original `LICENSE` matches upstream exactly. It retains `Copyright (c) 2021 Dominic "XeroxDev" Ris`. SHA-256: `c823e8c0ab3d6e53682d42507552e9e959acd06d6f6cda5f04f4ec605c3313db`. The fresh clone has `origin` on the fork and `upstream` on the original. Development is on `dev/pear-port`; `master` is unchanged.

## Existing YTMD structure

| Area | Source | Finding and planned treatment |
| --- | --- | --- |
| Plugin entry | `src/ytmd.ts`, `action.html` | An HTML/browser runtime. Creates one `CompanionConnector`, connects before global settings arrive, and registers 12 key actions. Replace the companion initialization after settings are ready. |
| Action base | `src/actions/default.action.ts` | Injects the old REST/socket clients. Keep action lifecycle structure; inject the shared Pear client instead. |
| Actions | `src/actions/*.ts` | Most stateful actions attach/remove per-context listeners. Several display/tick fields are shared across contexts and can suppress updates or mix dial input. Convert display caches and selection to per-context data. |
| Property Inspector | `src/ytmd-pi.ts`, `src/pis/features/*`, `property-inspector.html` | Uses Stream Deck settings and an existing HTML form. Retain useful UI structure; add Pear status, start modes, Track Info formats, and selector entries. |
| PI service | `src/pis/services/companion-singleton.ts` | Creates another companion client. Remove it; route PI requests to the one plugin-owned Pear client. |
| Auth/settings | `global-settings.pi.ts`, global settings interface | Old port `9863`, PIN-code authorization, token-required UI, and another socket. All need replacement. |
| Build | `scripts/build.js`, `scripts/watch.js` | esbuild browser IIFEs work. Upstream watch mode uses removed `build({watch})` options; Stage 1 repairs this with a context. |
| Manifest | `manifest.json` | SDK 2, HTML code path, 12 keys; Play/Pause and Volume Up also declare Encoder. Their names hide the two dial roles. Add dedicated dials later. |
| Localization | `en.json`, `de.json`, `fr.json` | Retain the translation system. Namespace keys are updated now. PIN/companion strings need Pear replacements later. |
| Automation | `.github/workflows`, release-please files | Builds and packs, but does not type-check. Stage 1 pins CLI, updates Node, and adds development-branch CI. No release or PR is created. |

Important inherited behaviors to replace: mute sets volume to zero instead of using real mute state; key and dial volume defaults differ; volume updates are optimistic; encoder commands wait for companion state ticks; Shuffle has one visual state; Repeat calls the old target-mode API; Track Info replaces metadata with “Paused” and uses a fixed scrolling format; playlist PI fetches the old user's playlist library. Pear 3.12.0 has no equivalent playlist-library endpoint.

## Pear REST and authentication contracts

API base is `/api/v1`; default port is `26538`. The API Server plugin starts disabled. Pear's default bind address is `0.0.0.0`, not localhost. Local-only use is supported by setting Pear's bind address to `127.0.0.1`; the connector will default to that address.

`POST /auth/{id}` is outside the `/api/*` JWT guards. `AUTH_AT_FIRST` prompts through an Electron allow/deny dialog unless the ID is already authorized. Approval returns `{ "accessToken": "<JWT>" }`; denial returns 403. The token contains `id` and `iat`, without `exp`. Protected REST requests require a bearer token and an ID in `authorizedClients`. Strategy `NONE` bypasses these checks.

The WebSocket bypasses the REST guard and performs its own query-token check after opening. Missing, invalid, or revoked tokens close it with code `1008` and reason `Unauthorized`. A WebSocket open callback alone does not establish authorization: wait for `PLAYER_INFO`.

| Method and path | Request / response | Action implication |
| --- | --- | --- |
| `POST /toggle-play`, `/play`, `/pause` | No body; 204 | Send transport command; display confirmed `isPlaying`. |
| `POST /next`, `/previous` | No body; 204 | Standard transport. |
| `GET /like-state` | `{ state: "LIKE"|"DISLIKE"|"INDIFFERENT"|null }` | Separate rating state read. |
| `POST /like`, `/dislike` | No body; 204 | Renderer calls `updateLikeStatus(status)`; clearing/toggling is not proven here. |
| `GET /shuffle` | `{ state: boolean }` | IPC state query; apply a client timeout if the renderer does not reply. |
| `POST /shuffle` | No body; 204 | Calls native `queue.shuffle()`; verify that repeated calls can turn shuffle off. |
| `GET /repeat-mode` | `{ mode: "NONE"|"ONE"|"ALL"|null }` | Actual observed mode. |
| `POST /switch-repeat` | JSON `{ iteration: number }`; 204 | Clicks the native repeat button this many times. No target-mode body. |
| `GET /volume` | `{ state: number, isMuted: boolean }` | REST field names differ from WebSocket names. |
| `POST /volume` | JSON `{ volume: number }`; 204 | Client validates/clamps 0–100; schema itself only requires a number. |
| `POST /toggle-mute` | No body; 204 | Preserve true mute independently of volume. |
| `GET /song` | Song object; 204 with no body when absent | Contains title, artist, album, imageSrc, isPaused, songDuration, elapsedSeconds, videoId, optional playlistId. |
| `GET /queue` | Queue response with items and queue metadata | State query, not playlist start. |
| `POST /queue` | `{ videoId, insertPosition? }`; 204 | Adds one song; default insertion is `INSERT_AT_END`. Not playlist Shuffle Play. |
| `POST /search` | `{ query, params?, continuation? }` | Proxies the signed-in renderer's search API. No playlist start. |

REST commands return 204 after dispatching renderer IPC. The client must handle empty response bodies. A later state event/read is the confirmation. REST volume defaults to `{state:0,isMuted:false}` if its backend cache is absent; the WebSocket uses different startup defaults. Treat missing readiness and fallback snapshots carefully instead of displaying false certainty.

HTTPS/custom certificates are supported by Pear's API configuration. This stage chooses local HTTP/WS defaults; optional TLS support needs a later explicit plan if required. Do not require LAN exposure for ordinary setup.

## Pear WebSocket contract

Messages are flat JSON objects, such as `{ "type": "VOLUME_CHANGED", "volume": 40, "muted": true }`. There is no nested `data` envelope and no Socket.IO protocol. State events are partial updates.

| Event | Fields sent |
| --- | --- |
| `PLAYER_INFO` | `song?`, `isPlaying`, `muted`, `position`, `volume`, `repeat`, `shuffle` |
| `VIDEO_CHANGED` | `song`, `position: 0` |
| `PLAYER_STATE_CHANGED` | `isPlaying`, `position` |
| `POSITION_CHANGED` | `position` |
| `VOLUME_CHANGED` | `volume`, `muted` |
| `REPEAT_CHANGED` | `repeat` |
| `SHUFFLE_CHANGED` | `shuffle` |

`PLAYER_INFO` is sent once to each accepted socket. Startup fallback values can be volume 100, muted false, repeat NONE, and shuffle false before renderer updates populate the cache. The frontend observers already emit a `peard:like-changed` signal, but the WebSocket route does not expose a rating event. That is the basis for bounded like-state REST reads and a possible small optional event extension.

Validate known field types and repeat values. Ignore unknown future message types safely. Do not erase metadata on position-only messages. Reconnection starts a new state generation and must not accept delayed callbacks from the old connection. See D004/D005.

## Playlist start and native Shuffle Play

**Verified gap:** the 3.12.0 control routes and `getSongControls` have no playlist-start operation. Queue insertion and search cannot meet the requirement. The renderer uses `ytmusic-app.networkManager.fetch()` for signed-in search and queue requests. Pear's type definitions include `playNavigationEndpoint`, `watchEndpoint`, and `watchPlaylistEndpoint` with endpoint parameters. These are useful extension points, not proof of a working Shuffle Play command.

**Stage 3 extension decision:** one validated playlist-start route, a correlated IPC broker, and an API Server plugin renderer adapter. This refines the original global song-control/renderer bridge proposal and keeps the feature inside the API plugin. In the signed-in renderer, resolve the playlist's native Normal Play or Shuffle Play command from YouTube Music's browse/header/menu and command-entity data, then invoke the same native app action path. Keep endpoint parameters intact. Select controls by structural fields/icon identifiers rather than translated labels. Resolve the command before playback starts.

Candidate request: `POST /api/v1/play-playlist` with `{playlistId, shuffle}`. This name is proposed, not available today. Return a bounded success/error result after dispatch/resolution. Unsupported markup or an unavailable native shuffle endpoint must fail without normal-start fallback. Keep the change in a separate Pear fork branch, with its own tests and eventual PR plan.

Stage 3 source evidence, public native command investigation, reviewed upstream PRs, exact Pear file map, and later test gate are in [`PLAYLIST_API_SPIKE.md`](PLAYLIST_API_SPIKE.md). The fixed proposed HTTP/IPC contract and startup-mode/parser rules are in [D013](DECISIONS.md#d013--stage-3-playlist-extension-contract). No Pear source or Stream Deck playlist method was changed in this stage.

Pear [PR #4615](https://github.com/pear-devs/pear-desktop/pull/4615) was open/unmerged when inspected. Head: `b65e9835fbecb73f892ec73bd6e2f28ffa518f9a`. It proposes `playPlaylist` and other controls, with watch-URL startup. It is not part of audited 3.12.0, and its description does not prove native Shuffle Play. Review it in the extension stage before selecting the final contract.

**Still unverified:** the exact live YouTube Music endpoint payload and dispatcher, normal-vs-shuffle queue semantics, playback metrics, and the off transition for the existing shuffle route. These need an authenticated running Pear session in the relevant stage. Do not claim them from TypeScript compilation or guessed parameters.

## Elgato and OpenDeck compatibility

The current official SDK package is Node.js/ESM and uses a `ws` connection with `-port`, `-pluginUUID`, `-registerEvent`, and `-info` launch arguments. Its dial commands are ordinary `setFeedback`/`setFeedbackLayout` protocol messages. The official docs cover SDK 2 encoder manifests, built-in/custom layouts, rotate/press/touch events, and current SDK 3 features. SDK library version 3 does not require claiming manifest SDK 3 solely for the requested dials.

| Required host feature | Existing framework | OpenDeck 2.14.0 | Plan |
| --- | --- | --- | --- |
| HTML plugin registration | Global `connectElgatoStreamDeckSocket` | Hidden webview and injected connection call | Retain. |
| Key/dial events | Key events; `dialDown`, `dialUp`, `dialRotate` | Dispatches these events | Use once per actuation, with controller guards. |
| Touch events | `touchTap` omitted from the typed action-event union; generic event dispatch exists | Dispatches `touchTap` including position/hold | Add a small typed adapter; no full framework rewrite. |
| Touch strip display | `setFeedback`, `setFeedbackLayout` | Handles both; renders built-in and custom layouts | Start with `$B1` for volume and `$A1` for selector/transport. |
| Repeat's third state | Wrapper's `StateType` names only two states | Protocol state is a numeric index | Adapter sends validated numeric states, including index 2. |
| Global/per-action settings and PI messages | Supported | Supported handlers | Keep host settings, with one Pear owner. |
| Dynamic trigger/resource APIs | Not needed for requested controls | Not present in audited inbound event list | Use manifest trigger descriptions and ordinary settings/images. |
| Linux runtime selection | Canonical manifest has only mac/windows | Reads OS selection, including Windows fallback; merges `manifest.linux.json` | Add an explicit Linux override in a later implementation stage. |
| Node plugin execution | Would require a new entry point | Uses host Node >=20; Flatpak invokes host node | Possible future migration, with extra deployment testing. |
| Dial Stack | Existing `StackColor` metadata | Metadata exists; no portable dynamic stack API established | Use one playlist selector dial. |

OpenDeck 2.13.0 release notes introduced rendered encoder feedback and `touchTap`; 2.14.0 adds incremental rendering. Use 2.14.0 as the planned tested baseline. Older installations need an update for these display features. Source inspection does not establish physical-device or Flatpak webview networking success.

Elgato's canonical OS schema permits mac/windows, not linux. OpenDeck applies platform manifest overrides before OS/runtime selection. Its Windows fallback can still launch a shared HTML entry point in a native webview; HTML launch occurs before the Wine executable branch. A future explicit Linux override removes reliance on that fallback while keeping the base manifest valid. Browser HTTP/WS access, artwork CORS, touch rendering, and feedback image format still need manual host tests.

## Concrete action and module implementation map

All UUID suffixes below use `io.github.scarfmeister.pear-streamdeck`.

| Action / suffix | Existing implementation | Planned Pear client operation | State/UI work |
| --- | --- | --- | --- |
| Play/Pause / `.play-pause` | `play-pause.action.ts`, companion `playPause/play/pause` | `togglePlay/play/pause` → matching REST routes | `isPlaying` drives Play/Pause; disable automatic host state toggling. Separate transport dial. |
| Next / `.next` | `next-prev-action.ts`, `next` | `next()` → `/next` | Standard key command and error feedback. |
| Previous / `.prev` | Same class, `previous` | `previous()` → `/previous` | Preserve key behavior. |
| Like / `.like` | `like-dislike.action.ts`, `toggleLike` | `getLikeState`, then `like()` when needed | Match LIKE; bounded refresh; verified same-state behavior only. |
| Dislike / `.dislike` | Same class, `toggleDislike` | `getLikeState`, then `dislike()` when needed | Match DISLIKE; handle null/INDIFFERENT. |
| Mute / `.mute` | `mute.action.ts`, zero/restore volume | `toggleMute()` → `/toggle-mute` | Render `muted`; remove local restored-volume model. |
| Volume Down / `.volume-down` | `vol-change.action.ts`, hold loop | `changeVolume(-step)` → current state/read + `/volume` | Step defaults to 5%; clamp; per-context input and no optimistic confirmed state. |
| Volume Up / `.volume-up` | Same class; also overloaded encoder | `changeVolume(+step)` | Dedicated dial takes over encoder role. |
| Track Info / `.song-info` | `song-info.action.ts`, companion video metadata | Shared `song` snapshot / `/song` | Title, artist, album format choices; retain metadata while paused; bounded artwork cache/fallback. |
| Shuffle / `.shuffle` | `shuffle.action.ts`, stateless `shuffle` | `toggleShuffle()` using verified Pear operation | Off/on states from WebSocket; off transition requires verification/extension if needed. |
| Repeat / `.repeat` | `repeat.action.ts`, old target-mode method/base64 images | `cycleRepeat()` → `/switch-repeat` | NONE/ALL/ONE numeric visual states and confirmed cycle. Replace inline icon blobs. |
| Play Playlist / `.play-playlist` | `play-playlist.action.ts`, `changeVideo`; old playlist-library PI | `startPlaylist(id, resolvedMode)` → planned Pear extension | URL/ID parser, Follow default, capability/error UI; no fake startup. |
| Volume Dial / `.volume-dial` | Extract behavior from volume class | Signed ticks × step, `toggleMute` on press | Dedicated Encoder, `$B1`, real volume/mute. Coalesce by short timer, not state ticks. |
| Transport Dial / `.transport-dial` | Extract encoder behavior from play/pause class | Signed rotation → next/previous; press → togglePlay | Dedicated Encoder; real playback state and title. Independent contexts. |
| Playlist Selector / `.playlist-selector` | New action and PI section | Select locally; press → shared `startPlaylist` | List, index/count, per-entry modes/images; independent selected index. |

| Planned module | Responsibility and integration |
| --- | --- |
| `src/pear/pear-client.ts` | Own shared lifecycle and expose typed commands/subscriptions. Created once by the plugin entry point after host settings load. |
| `src/pear/rest-client.ts` | URLs, methods/bodies, bearer headers, status handling, timeouts, empty 204 bodies, normalized REST responses. |
| `src/pear/auth.ts` | First-run approval, token persistence callback, endpoint binding, denial/invalid-token handling. |
| `src/pear/state.ts` | Normalized immutable snapshots, unknown/readiness fields, field-level partial updates, unsubscribe handles. |
| `src/pear/websocket.ts` | Flat message validation, query-token URL, initial snapshot acceptance, session generation. |
| `src/pear/reconnect.ts` | One timer, bounded backoff/jitter, cancellation, no aggressive retries. |
| `src/pear/playlist.ts` | URL→ID validation and mode selection; identify unavailable extension without falling back. |
| `src/streamdeck/adapter.ts` | Controller-safe key/dial rendering, touch typing, numeric state indices, PI request routing. |
| Updated `DefaultAction` / plugin entry | Inject the client, render on appearance, dispose context subscriptions, surface concise errors. |
| Updated PI classes/settings interfaces | Global connection/status/reauthorize and per-action settings; remove companion singleton/library fetch/PIN UI. |

This map records the Stage 1 targets. Stage 2 implements the foundation listed below. Keep the client independent of the Stream Deck framework so its tests can mock fetch, sockets, persistence, and timers.

## Dependency and obsolete-code plan

| Dependency/code | Finding | Later treatment |
| --- | --- | --- |
| `ytmdesktop-ts-companion` 1.1.0 | Wrong API/auth/state protocol; brings Socket.IO and other old transport dependencies | Remove with the Pear client. Use native browser fetch/WebSocket. |
| Socket.IO transport dependencies | Production audit has 3 findings: `engine.io-client` moderate, `socket.io-parser` high, `ws` high | Remove the old dependency path; rerun audit before release. Do not perform unrelated forced upgrades in Stage 1. |
| `streamdeck-typescript` 3.3.4 | Existing useful host integration; type gaps identified above | Retain behind a small adapter; do not call it obsolete solely because it is unofficial. |
| `intl-messageformat` 10.7.18 | Existing localization is useful | Retain unless actual PI changes remove the need. |
| esbuild 0.25.12 / TypeScript 5.9.3 | Locked build tools work; esbuild does not type-check | Keep and run a separate type check. Watch API repaired now. |
| `@types/node` 14 / `@types/mocha` 8 | Old types alongside Node 24 / Mocha 10 | Align with the selected test/runtime tools during client test setup. |
| Husky 3 / `esm` 3 | Old hook/runtime tooling | Replace or remove when the development workflow is updated; keep logical conventional commits now. |
| Mocha, Chai, nyc, jsdom, jsdom-global, ts-node | Present but no test script or inherited test files found; deprecated transitive packages | Select a working client test runner and remove unused tooling in that stage. |
| Framework/companion error handling | Uses `satisfies` as a runtime guard; it is not one | Replace with real narrowing when porting these files. This causes some current type-check failures. |
| Hard-coded old port/auth/playlist library | Spread across plugin/PI/services/HTML/localization | Replace together; preserve only useful UI/lifecycle code. |
| Asset PSD, inline Repeat blobs, old promotional thumbnail | No separate provenance list; generic sampled controls look reusable under repository notice | Create/document consistent generic final icons; avoid Google/YouTube branding. |

See `IMPLEMENTATION_STATUS.md` for exact baseline checks and inherited compiler errors. See `MANUAL_TESTING.md` for hardware, authentication, reconnect, and native startup acceptance.

## Stage 2 foundation implementation

The pinned Pear 3.12.0 auth/REST/WebSocket sources were reread before implementation. The earlier action map remains future work. Current modules:

| File | Implemented responsibility |
| --- | --- |
| `src/pear/config.ts` | Host/port/protocol validation, v1/auth/WS URLs, endpoint-bound versioned settings. |
| `src/pear/rest-client.ts` | Shared native fetch layer, bearer/JSON headers, empty bodies, safe errors, timeout/abort. |
| `src/pear/auth.ts` | Approval-response validation and unauthorized-response classification. |
| `src/pear/state.ts`, `websocket.ts` | Frozen snapshots, song/rating model, seven flat events, partial updates, volume clamping. |
| `src/pear/runtime.ts`, `reconnect.ts` | Native browser socket wrapper, injectable timers, bounded backoff. |
| `src/pear/pear-client.ts` | One lifecycle/auth/state owner, subscriptions, command foundation, bounded rating refresh, generation cleanup. |
| `src/streamdeck/pear-session.ts` | One shared client, global settings persistence/merge, own-write echo handling, safe PI status. |
| `src/pear-plugin.ts`, `pear-pi.ts` | Active HTML entry points and host message routing; actions deliberately pending. |
| `tests/`, `scripts/test.js` | Deterministic unit and browser-entry VM tests using Node's test runner and esbuild. |

Build/watch no longer import `ytmd.ts`, `ytmd-pi.ts`, the old actions, or their companion transport. The old package remains only for development type checking of dormant source. The 14 baseline type errors are fixed with narrow guards; no Pear playback/playlist action is implemented. See D009–D012 for settings schema, timeouts, approval recovery, startup-cache limitations, and test scope.

## Stage 6 encoder implementation

The Stage 1 action/module tables above are historical plans. Stage 4/5 implemented shared commands, keys, action settings, and the guarded playlist interface. Stage 6 adds `src/actions/pear-dial-actions.ts` with one shared-client subscription, `src/streamdeck/touch-events.ts` for the framework's touch typing gap, and selector settings/editor modules beside the centralized action validator. The active plugin routes Encoder lifecycle/rotation/release/touch to this controller; the PI still opens no Pear transport.

Dedicated encoder UUIDs now exist. Old Play/Pause and Volume Up encoder UUIDs remain aliases for placed profiles. Volume uses the already bounded confirmed-state command queue, replacing the planned extra timer; Transport bounds pending detents without waiting for position ticks. Selector rotation persists one local index through ordinary host settings; it does not create dynamic host stack entries. `$B1` and packaged `dial-layout.json` cover feedback. Exact framework/OpenDeck/renderer source verification, limits, and test boundaries are in [Stream Deck Plus SDK research](research/stream-deck-plus-sdk.md) and D016. Native playlist execution remains blocked on the separate Stage 7 extension; live hosts/hardware and Linux packaging remain unverified.

## Primary sources

- [YTMD baseline source](https://github.com/XeroxDev/YTMD-StreamDeck/tree/8b0c3320ce59b741b3165a1c8ac3a54b66c2c97a) and [license](https://github.com/XeroxDev/YTMD-StreamDeck/blob/8b0c3320ce59b741b3165a1c8ac3a54b66c2c97a/LICENSE).
- [Pear API source at the audited commit](https://github.com/pear-devs/pear-desktop/tree/3f599b42724be827db51cd4689996dc3e48a9561/src/plugins/api-server), [song controls](https://github.com/pear-devs/pear-desktop/blob/3f599b42724be827db51cd4689996dc3e48a9561/src/providers/song-controls.ts), and [renderer](https://github.com/pear-devs/pear-desktop/blob/3f599b42724be827db51cd4689996dc3e48a9561/src/renderer.ts).
- [OpenDeck 2.14.0 source](https://github.com/nekename/OpenDeck/tree/b2d09ca60089cea38ffea7eef191270ffefdf851/src-tauri/src) and [release](https://github.com/nekename/OpenDeck/releases/tag/v2.14.0).
- [Framework source](https://github.com/XeroxDev/Stream-Deck-TS-SDK) and [official SDK source](https://github.com/elgatosf/streamdeck); installed versions are pinned above.
- Elgato [setup](https://docs.elgato.com/streamdeck/sdk/introduction/getting-started/), [manifest](https://docs.elgato.com/streamdeck/sdk/references/manifest/), [dials](https://docs.elgato.com/streamdeck/sdk/guides/dials/), [version 3 migration](https://docs.elgato.com/streamdeck/sdk/releases/upgrading/v3/), [distribution](https://docs.elgato.com/streamdeck/sdk/introduction/distribution/), and [CLI](https://docs.elgato.com/streamdeck/cli/intro/), read at the audit date.
- [esbuild watch API](https://esbuild.github.io/api/#watch), used for the small bootstrap repair.
