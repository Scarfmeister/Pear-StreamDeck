# Stage 3 playlist capability investigation

Audit date: 2026-10-04 UTC. Scope: Pear Desktop 3.12.0 and the YouTube Music controls it loads. This is a source investigation and extension plan. No playlist implementation, Pear patch, or live playback test was made.

**Result: the public Pear 3.12.0 API cannot start a requested playlist normally or with native Shuffle Play.** The next Pear stage needs the one-route extension in [D013](DECISIONS.md#d013--stage-3-playlist-extension-contract). The shared Stream Deck foundation remains buildable; playlist actions remain blocked on that extension.

## Pinned Pear evidence

Pear tag `v3.12.0`, commit [`3f599b42724be827db51cd4689996dc3e48a9561`](https://github.com/pear-devs/pear-desktop/tree/3f599b42724be827db51cd4689996dc3e48a9561). The audit clone remained clean and detached at this commit.

| Source | Finding |
| --- | --- |
| [`backend/routes/control.ts`](https://github.com/pear-devs/pear-desktop/blob/3f599b42724be827db51cd4689996dc3e48a9561/src/plugins/api-server/backend/routes/control.ts) | Full public control registry has no playlist-start, arbitrary browse, or endpoint-dispatch route. |
| [`backend/scheme/queue.ts`](https://github.com/pear-devs/pear-desktop/blob/3f599b42724be827db51cd4689996dc3e48a9561/src/plugins/api-server/backend/scheme/queue.ts) | Queue insertion accepts `videoId` and insertion position; index selection uses the existing queue. No playlist start. |
| [`song-controls.ts`](https://github.com/pear-devs/pear-desktop/blob/3f599b42724be827db51cd4689996dc3e48a9561/src/providers/song-controls.ts) / [`renderer.ts`](https://github.com/pear-devs/pear-desktop/blob/3f599b42724be827db51cd4689996dc3e48a9561/src/renderer.ts) | Shuffle sends `peard:shuffle` and calls the current player bar's `queue.shuffle()`. Queue add uses `/music/get_queue` for video IDs and inserts items. Search uses the renderer's network manager. None starts a requested shuffled playlist. |
| [`backend/routes/websocket.ts`](https://github.com/pear-devs/pear-desktop/blob/3f599b42724be827db51cd4689996dc3e48a9561/src/plugins/api-server/backend/routes/websocket.ts) | Pushes state; provides no incoming playlist command. Returned `playlistId` metadata is not a startup API. |
| [`datahost-get-state.ts`](https://github.com/pear-devs/pear-desktop/blob/3f599b42724be827db51cd4689996dc3e48a9561/src/types/datahost-get-state.ts) | Types include native play/menu/watch-playlist endpoints, opaque params, and `MUSIC_SHUFFLE`. Types establish data shapes, not successful invocation. |
| [`api-server/index.ts`](https://github.com/pear-devs/pear-desktop/blob/3f599b42724be827db51cd4689996dc3e48a9561/src/plugins/api-server/index.ts), [`contexts.ts`](https://github.com/pear-devs/pear-desktop/blob/3f599b42724be827db51cd4689996dc3e48a9561/src/types/contexts.ts), loaders | API Server has a backend but no renderer yet. The plugin system already supports renderer lifecycle and IPC. A contained adapter can use these hooks. |

## Native YouTube Music investigation

Pear loads the website, so the native controls are not fixed by the Pear release tag. A read-only, anonymous public-site fetch with a full desktop Chrome user agent returned the playlist page and its initial `/browse` data. No signed-in session, cookies from Pear, audio startup, or user playlist was accessed.

The observed public example was [Mellow Pop Classics](https://music.youtube.com/playlist?list=RDCLAK5uy_nDL8KeBrUagwyISwNmyEiSfYgz1gVCesg). Its selected tab contained a `musicResponsiveHeaderRenderer` with two distinct operations:

| Control | Structural source | Native operation |
| --- | --- | --- |
| Normal Play | Header `buttons[].musicPlayButtonRenderer.playNavigationEndpoint` | `watchEndpoint` with first video, requested playlist ID, opaque params, logging context, and music configuration. |
| Shuffle Play | Header menu item with `icon.iconType === 'MUSIC_SHUFFLE'` | `navigationEndpoint.watchPlaylistEndpoint` with the requested playlist ID and its own opaque params. It does not supply a chosen first video. |

The nearby Start Mix item targets a different playlist. Play Next/Add to Queue use service endpoints. This shows why a generic recursive search for any playable endpoint is unsafe. Menu label text was not used to identify commands. Captured tracking values and playlist payloads are not shipped as constants or fixtures.

The page referenced Google's [music application script](https://music.youtube.com/s/a2c50912/music_polymer_inlined_html.js), revision path `a2c50912`. Its bytes had SHA-256 `88730ffc80ae625375b67c63888a23c134c886e350f7c74fba26576adec83beb` (4,914,651 bytes). No website code was added to this repository.

Static tracing found:

- The play button prefers a resolved command entity over `playNavigationEndpoint`, converts the native endpoint, and calls its navigator. Clicking a rendered button is state-dependent: an already playing/paused button can pause/resume rather than restart. The extension must dispatch the resolved startup command instead of blindly clicking the button.
- The shuffle button can replace its button command with a command entity. A resolver that only reads one old JSON field is incomplete; it must support the actual native relation or fail unsupported.
- The app action map routes `yt-watch-endpoint` / `yt-watch-playlist-endpoint` to `handleNavigationEndpoint`, which converts the complete endpoint and calls `navigator.navigate`. It also handles `yt-command-executor-command` through the native executor. The app's action router consumes `yt-action` event details with an action name, args, and a mutable handler return list. D013 specifies this dispatch envelope without depending on minified names.
- Native endpoint conversion retains the payload and click tracking. The queue request copies the endpoint data into `/next` request parameters. Reducing an endpoint to a watch URL or dropping params changes the requested operation.
- New native queue loading clears the previous shuffle flag, then uses the requested endpoint. This is evidence for normal-start feasibility, not a live proof of Always Normal; same-track/playlist shortcuts and modern command variants still need the planned tests.

**Evidence boundary:** public data proves that separate native commands exist, and the script identifies a concrete dispatch path. It does not prove a patched Pear endpoint, authenticated/private playlist access, first audible track, same-playlist restart behavior, normal/shuffle state on each account, or listening metrics. Those are acceptance gates for the later Pear implementation. Recapture native data if the website changes; never repair missing controls with guessed params or the forbidden workaround.

## Upstream proposals checked

The GitHub PR metadata and changed files were read on the audit date.

| Proposal | State / pinned head | Why it does not solve this requirement |
| --- | --- | --- |
| [Pear #4615](https://github.com/pear-devs/pear-desktop/pull/4615) | Open, unmerged; `b65e9835fbecb73f892ec73bd6e2f28ffa518f9a` | `POST /api/v1/playPlaylist` accepts playlist/video IDs, not shuffle. Renderer browses, collects ID pairs, then navigates to a watch URL or first-track fallback. It loses native params and returns 204 before a renderer result. Its broader playlist/library API is not needed for the small extension. |
| [Pear #4505](https://github.com/pear-devs/pear-desktop/pull/4505) | Open, unmerged; `0fd213c5a5cbd099f23640d0d7a94f36af05c5ec` | `playPlaylist` builds a playlist/watch URL and loads it through `webContents.loadURL`. No native-shuffle selector or preserved command dispatch. Loading a playlist page is not proof of playback. |

Do not treat either proposal as a public feature in v3.12.0. Recheck their state before later Pear work, then adopt only changes that satisfy the tested native contract.

## Exact Pear source change map (later stage only)

Use a separate Pear branch such as `feat/api-playlist-start`, based on the pinned release or a reviewed compatible base. Add no new transport/library dependency. Reuse Hono/Zod, Electron IPC, the plugin lifecycle, and the signed-in website manager.

| Pear path | Planned change |
| --- | --- |
| `src/plugins/api-server/index.ts` | Import/register the API Server renderer adapter. |
| `src/plugins/api-server/backend/main.ts` | Construct the broker, register the route, cancel on API stop/rebind, resume with a new generation, and dispose on plugin stop. Register/remove owned window lifecycle listeners. |
| `src/plugins/api-server/backend/types.ts` | Add the broker's lifecycle field/type. |
| `src/plugins/api-server/backend/routes/index.ts` | Export `registerPlaylist`. |
| `src/plugins/api-server/backend/routes/playlist.ts` (new) | One protected OpenAPI route; strict request validation, broker call, safe success/error mapping. |
| `src/plugins/api-server/backend/scheme/playlist.ts` (new) | Request, success, and error schemas. Import them directly; no unrelated schema changes. |
| `src/plugins/api-server/backend/playlist-broker.ts` (new) | One pending request, five-second deadline, sender/frame checks, permit/result/cancel channels, abort/generation handling, and precise listener disposal. Use raw owned Electron main IPC callbacks because the context wrapper omits sender information. |
| `src/plugins/api-server/playlist-contract.ts` (new) | Shared internal request/result/permit/error types and channel constants. Never expose arbitrary endpoint execution over REST. |
| `src/plugins/api-server/renderer.ts` (new) | Register requests on start, use `onPlayerApiReady`, resolve then request permission to dispatch, send one result, and remove owned listeners/cancel work on stop. |
| `src/plugins/api-server/renderer/playlist-command.ts` (new) | Bounded header/command-entity resolver and guarded native event dispatcher. Keep dynamic website compatibility in this one module. |

This is the smallest behavior extension: one route and one contained renderer bridge. It uses more small files than a global-renderer patch to keep validation, request lifetime, and changing website data separate. No change is planned to `src/renderer.ts`, `src/providers/song-controls.ts`, auth/WS routes, shared loader/context types, or global app-element types. The adapter needs only the existing network-manager type and local validated data types.

The later Pear stage must also add tests. Pear's existing runner is Playwright (`pnpm test`); follow its layout, including new `tests/api-playlist-contract.spec.ts` and `tests/api-playlist-native.spec.ts`. The first suite can use fake renderer/network/IPC and test pure resolution plus HTTP mapping; the second records real native acceptance with an explicitly available signed-in test session. Run `pnpm check`, `pnpm build`, and applicable Playwright tests in that stage. No Pear dependencies or tests were installed/run here because its source was not changed.

## Required extension and client test gate

1. HTTP: ID/boolean/body validation, auth denial before browse, `NONE`, one active operation/409, safe errors, deadline and abort behavior, unsupported site structures, and missing native handler.
2. Resolver: both observed headers, supported legacy/editable/modern command entities, localized labels, requested-ID match, wrong mix/radio/related endpoints, ambiguous/missing/malformed data, unavailable/empty/private playlists. Complete opaque command payloads must reach the dispatcher unchanged.
3. IPC: wrong sender/frame, duplicate/stale result, stop/re-enable, API rebind, renderer reload, late browse result, deadline before permit, and unknown outcome after permit. Assert zero native dispatch on all pre-permit failures and no replay after any ambiguous outcome.
4. Native: compare direct normal/shuffle requests with YouTube Music's controls, from a different playlist and the same playlist, with current shuffle both off and on. Record the command selected, native handler acceptance, initial queue/events, and first audible track. Assert one startup operation and no normal→shuffle→skip sequence. A randomly selected first track can be the playlist's first track.
5. Shared client: URL/ID parsing; normal startup; Always Normal; Always Shuffle; Follow off/on/unknown; one request; 404/501 unsupported; auth failure; timeout/no replay. Stage 3 deferred this suite until the endpoint existed; the user's Stage 5 scope explicitly authorizes implementing the interface and fake-contract tests now. Those tests prove the client boundary, not current 3.12.0 capability. Live extension/native acceptance remains Stage 7.

If native normal startup retains an old shuffled queue on a supported account/layout, the Pear stage must resolve a native pre-start normal command or mark the operation unsupported. Do not claim the mode complete from fresh-queue source tracing alone. See [manual acceptance](MANUAL_TESTING.md#native-playlist-startup) for host/device recording.
