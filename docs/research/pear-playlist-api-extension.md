# Pear playlist API extension — Stage 7

Investigation and implementation: 2026-10-04–05 UTC. This record supplements [Stage 3](../PLAYLIST_API_SPIKE.md) and [D013](../DECISIONS.md#d013--stage-3-playlist-extension-contract). The extension was still required: neither audited stock 3.12.0 nor the reviewed fork/upstream master API could start a requested playlist normally or with native Shuffle Play. Queue insertion and current-queue shuffle do not provide that operation. The final implementation is now on the separate fork branch below.

## Reproducible source and repository checks

- Stream Deck starting head: `dafde761b9190fffd81b4f02557cb7acb02a7654`, clean `dev/pear-port` after fetch/pull. Stages 5 and 6 already implement the guarded D013 client, key, and selector.
- Separate fork: [Scarfmeister/pear-desktop](https://github.com/Scarfmeister/pear-desktop), branch `feature/streamdeck-playlist-api`. GitHub reports its parent as `pear-devs/pear-desktop`. A full-history clone, fork fetch/pull, and upstream fetch confirmed `origin/master`, `upstream/master`, and the clean feature-branch base all equal `a8830222afffb4af98aaa9b19287ebc24952605b`; zero commits differ. No Pear source is copied into this repository.
- Pear package still reports 3.12.0, but this reviewed master base has newer locked tooling than the release audited in Stage 3: Hono 4.12.27, `@hono/zod-openapi` 1.4.0, Zod 4.4.3, Electron 42.5.0, Playwright 1.61.1, TypeScript 7.0.1-rc, Vite 8.1.0, and electron-vite 6.0.0-beta.1. Validation uses Node 24.21.0 and pnpm 11.28.4 with the unmodified frozen lockfile.

Pinned Pear paths below are relative to [that base](https://github.com/pear-devs/pear-desktop/tree/a8830222afffb4af98aaa9b19287ebc24952605b):

| Path | Finding / implementation effect |
| --- | --- |
| `src/plugins/api-server/backend/routes/control.ts`, `backend/scheme/queue.ts` | No playlist-start route; queue operations accept videos/current indices. Add one general-purpose route rather than a playlist/library subsystem. |
| `src/plugins/api-server/backend/main.ts`, `config.ts`, `backend/routes/auth.ts` | Keep existing `/api/*` JWT HS256 / authorized-client guards and `NONE` behavior. Recheck authorization, enabled state, and request lifetime before dispatch. |
| `src/plugins/api-server/index.ts`, `src/utils/index.ts`, `src/types/plugins.ts` | `createRenderer` supplies start, player-ready, and stop hooks. Register a contained API Server renderer adapter. |
| `src/loader/main.ts`, `src/types/contexts.ts` | Backend context IPC wrappers discard sender information. Use owned raw Electron main callbacks to check the actual window and main frame, and remove exact listeners/handler on stop. |
| `src/loader/renderer.ts`, `src/renderer.ts` | Renderer context can remove plugin-owned channels. `plugin:enable` invokes the existing player-ready hook even after the player has loaded. Normal SPA navigation is not a full renderer reload. |
| `src/types/music-player-app-element.ts`, `src/renderer.ts` | Existing signed-in `networkManager.fetch` supports `/browse`; no second login, URL navigation, or backend YouTube session is needed. The native queue's store is accessible through `#queue.queue.store.store`. |
| `tests/index.test.js`, `src/plugins/synced-lyrics/parsers/lrc.test.ts`, `src/plugins/sponsorblock/tests/segments.test.js` | Existing Playwright runner supports pure tests as well as Electron launch tests. New unit/HTTP/IPC/native-event tests use that runner without a signed-in account. |

Pear has no development-docs directory at the reviewed base. Keep the complete project research here, with only a general API usage document beside Pear's API Server implementation when useful for upstream review. Do not introduce Stream Deck stage/checkpoint machinery into Pear.

## Native website evidence

A new anonymous, read-only fetch of [Mellow Pop Classics](https://music.youtube.com/playlist?list=RDCLAK5uy_nDL8KeBrUagwyISwNmyEiSfYgz1gVCesg) returned WEB_REMIX `1.20260928.13.00`. Its initial `/browse` data uses `contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].musicResponsiveHeaderRenderer`.

- Normal control: `buttons[].musicPlayButtonRenderer.playNavigationEndpoint.watchEndpoint`, including requested playlist, first video, opaque params, logging context, music configuration, and click tracking.
- Shuffle control: the header's `buttons[].menuRenderer.items[].menuNavigationItemRenderer` with `MUSIC_SHUFFLE`; its `navigationEndpoint.watchPlaylistEndpoint` has the requested playlist and a different native parameter payload.
- No command-entity mutations were present in that anonymous example. Modern relations are supported from the website's source, not claimed as a tested signed-in layout.

The page still loads [music_polymer_inlined_html.js](https://music.youtube.com/s/a2c50912/music_polymer_inlined_html.js), revision `a2c50912`; the freshly fetched bytes match Stage 3's SHA-256 `88730ffc80ae625375b67c63888a23c134c886e350f7c74fba26576adec83beb`. Website source stays outside both repositories. Synthetic fixtures omit real account/tracking data.

Source tracing confirms:

- `computePlayCommand` prefers the play control's `onTapCommandEntityKey` entity command. The shuffle renderer reads `button.buttonRenderer.command.resolveCommand.commandEntityKey` and uses its command entity. Menu navigation can also use `resolveCommand`. Native entities are keyed under `entities.commandEntity`; `/browse` framework mutations carry replacement command entities. Missing/ambiguous/partial relations must fail unsupported rather than use an older fallback.
- The `yt-action` router accepts a full command and source element in `args`, with `actionName`, `optionalAction`, and mutable `returnValue`. `handleNavigationEndpoint` converts the complete endpoint and navigates; `handleCommandExecutorCommand` executes the complete wrapper. A handler return entry acknowledges dispatch, including an `undefined` entry. It is not playback confirmation.
- Native watch commands can select an existing queue item instead of rebuilding the queue. A normal start in a currently shuffled copy of the same playlist therefore cannot be claimed from fresh-queue tracing alone. The adapter must reject unverified reuse before dispatch. A native watch-playlist command takes the playlist-start path. No manufactured clear-state wrapper, queue, shuffle params, post-start shuffle, or skip is permitted.
- Bounded selection must stay in the requested playlist header and its control/entity relations. Related shelves, track rows, Start Mix, queue insertion, and translated labels cannot choose the startup command.

Rechecked upstream proposals [#4615](https://github.com/pear-devs/pear-desktop/pull/4615) and [#4505](https://github.com/pear-devs/pear-desktop/pull/4505): both remain open/unmerged when investigated. The current master registry independently confirms their proposed URL-based operations are not an existing capability. Their broader/fallback designs do not replace D013.

## Contract and evidence boundary

Implement D013's protected `POST /api/v1/play-playlist`, strict `{playlistId, shuffle}`, dispatch-only 200, safe structured failures, one active operation, five-second deadline, and correlated start/permit/result/cancel IPC. Native resolution runs in Pear's signed-in renderer. HTTP abort, API stop/rebind/config changes, renderer reload/destruction, stale sender/frame/correlation, and late resolution must prevent pre-permit playback. An outcome after granting a permit can be unknown; no operation is replayed.

Automated fixture/native-event dispatch is distinct from real account/audio behavior. No signed-in Pear or Stream Deck hardware has been used for Stage 7. Private/empty/unavailable playlists, same-playlist normal/shuffle semantics, opaque native variants, first audible track/queue state, and listening metrics remain live acceptance checks. Unsupported shapes must remain visible failures. This branch is development work, not a released or upstream-accepted Pear capability.

## Validation baseline (before edits)

- Frozen pnpm install succeeded; no dependency/lockfile changes.
- `pnpm build`: pass for main, preload, and renderer.
- `pnpm typecheck`: pass.
- `pnpm test src --reporter=line`: five existing pure tests passed.
- `pnpm check`: lint has no errors and 17 existing warnings; format check fails in 17 untouched files before reaching type checking. Record the same inherited failures at final validation and check every Stage 7 source/test file separately. Do not reformat unrelated upstream files.

## Final implementation and source map

Pear repository: **Scarfmeister/pear-desktop**, branch **`feature/streamdeck-playlist-api`**, final implementation **[`b5f13f65c71ca8890c08f52c7d7becde5d855be9`](https://github.com/Scarfmeister/pear-desktop/commit/b5f13f65c71ca8890c08f52c7d7becde5d855be9)**, based on `a8830222afffb4af98aaa9b19287ebc24952605b`. A fresh fork fetch verifies local and `origin/feature/streamdeck-playlist-api` at this commit; fork/upstream master are unchanged. The API remains general-purpose, with no Stream Deck naming or second auth/session subsystem.

| Pear path at the implementation commit | Responsibility |
| --- | --- |
| [`src/plugins/api-server/backend/routes/playlist.ts`](https://github.com/Scarfmeister/pear-desktop/blob/b5f13f65c71ca8890c08f52c7d7becde5d855be9/src/plugins/api-server/backend/routes/playlist.ts), `backend/scheme/playlist.ts` | Existing Hono/OpenAPI registration, strict body, existing auth guard, dispatch-only HTTP results. |
| [`src/plugins/api-server/backend/playlist-broker.ts`](https://github.com/Scarfmeister/pear-desktop/blob/b5f13f65c71ca8890c08f52c7d7becde5d855be9/src/plugins/api-server/backend/playlist-broker.ts), `playlist-contract.ts` | Closed codes/channels, one active operation, deadline/abort, main-window/main-frame verification, authorization/generation/permit/results, exact main listener ownership. |
| `src/plugins/api-server/backend/main.ts`, `backend/types.ts`, `backend/routes/index.ts`, `index.ts` | Register the contained extension and reset/suspend/resume/dispose it through existing API/plugin lifecycle. |
| [`src/plugins/api-server/renderer/playlist-command.ts`](https://github.com/Scarfmeister/pear-desktop/blob/b5f13f65c71ca8890c08f52c7d7becde5d855be9/src/plugins/api-server/renderer/playlist-command.ts) | Bounded primary-header/control/entity resolution, command/wrapper validation, native normal reuse guard, complete command cloning. |
| [`src/plugins/api-server/renderer/playlist-adapter.ts`](https://github.com/Scarfmeister/pear-desktop/blob/b5f13f65c71ca8890c08f52c7d7becde5d855be9/src/plugins/api-server/renderer/playlist-adapter.ts), `renderer.ts` | Signed-in network manager, runtime readiness/DOM identity, request/cancel ownership, final state/deadline check, acknowledged native event dispatch. |
| `tests/api-playlist-{contract,broker,native,adapter}.spec.ts`, `tests/api-playlist-fixtures.ts` | 33 new Playwright tests with synthetic account-free fixtures and owned HTTP/IPC/native fakes. |
| `tsconfig.test.json`, `.gitignore`, [`src/plugins/api-server/README.md`](https://github.com/Scarfmeister/pear-desktop/blob/b5f13f65c71ca8890c08f52c7d7becde5d855be9/src/plugins/api-server/README.md) | Include existing virtual declarations for test type checking, ignore runner artifacts, document the general API contract/limits. |

Stream Deck integration stays in **Scarfmeister/Pear-StreamDeck / `dev/pear-port`**, tested implementation **[`d44fc520a4ac8dc51cd58adce58eea2cbbf0f715`](https://github.com/Scarfmeister/Pear-StreamDeck/commit/d44fc520a4ac8dc51cd58adce58eea2cbbf0f715)**. A fresh fetch confirms local/remote equality and unchanged default branch `8b0c3320ce59b741b3165a1c8ac3a54b66c2c97a`. `src/pear/{playlist,rest-client,pear-client}.ts` adds only bounded structured failure classification to the already matching D013 client. Key/dial feedback and the PI explain compatible builds and safe native failure. Tests and `scripts/test-pear-extension.js` exercise both boundaries. No Pear source or native website payload is committed here. A documentation-only closing commit follows this tested implementation; its final head is verified/reported separately as explained in the checkpoint.

## Endpoint, authentication, and examples

**POST `/api/v1/play-playlist`**, `Content-Type: application/json`. Existing `AUTH_AT_FIRST` requires `Authorization: Bearer <Pear-issued-token>` with the existing HS256 secret and authorized client ID. The normal approval flow is unchanged; revoke/change auth while resolving and the permit fails. Explicit `NONE` accepts the operation without a token. Credentials remain endpoint-bound in the plugin and absent from PI/status/errors/logs.

Normal startup request:

```json
{"playlistId":"PL_example","shuffle":false}
```

Native Shuffle Play request:

```json
{"playlistId":"PL_example","shuffle":true}
```

Both fields are required; ID is case-sensitive `^[A-Za-z0-9_-]{1,256}$`. URLs/browse prefixes are not normalized by the endpoint; the caller performs URL parsing. Extra fields, nonbooleans, invalid IDs, malformed JSON, and non-JSON input return 400. The existing OpenAPI `/doc` and `/swagger` include request, success, and error schemas.

HTTP 200 after native handler acknowledgment, for the shuffle example:

```json
{"playlistId":"PL_example","shuffle":true,"status":"dispatched"}
```

HTTP 501 before native startup, for an unsupported control or unsafe normal reuse:

```json
{"error":{"code":"NATIVE_PLAYLIST_CONTROL_UNAVAILABLE","dispatch":"not_dispatched"}}
```

HTTP 503 when a permitted operation is canceled by a generation change:

```json
{"error":{"code":"PLAYER_NOT_READY","dispatch":"unknown"}}
```

| HTTP | Safe code | Outcome |
| --- | --- | --- |
| 400 | `INVALID_PLAYLIST_REQUEST` | `not_dispatched` |
| 401 | Existing authorization response format | No new work/permit; retain existing auth semantics. |
| 409 | `PLAYLIST_START_BUSY` | `not_dispatched`; no queue. |
| 422 | `PLAYLIST_UNAVAILABLE` | `not_dispatched`; explicit empty/inaccessible/unplayable browse result. |
| 501 | `NATIVE_PLAYLIST_CONTROL_UNAVAILABLE`, `NATIVE_PLAYLIST_DISPATCH_UNAVAILABLE` | `not_dispatched`; unsupported/ambiguous relation or no acknowledging handler. |
| 502 | `PLAYLIST_RESOLUTION_FAILED` | `not_dispatched`; upstream browse failure. |
| 502 | `PLAYLIST_DISPATCH_FAILED` | `unknown`; unexpected native failure after permission. |
| 503 | `PLAYER_NOT_READY` | `not_dispatched` before permission, otherwise `unknown`. |
| 504 | `PLAYLIST_START_TIMEOUT` | `not_dispatched` before permission, otherwise `unknown`. |

One request may be active, with a five-second server deadline below the plugin's eight-second REST timeout. Results/errors never include browse/native/account/token data. Website browse error codes 400/401/403/404 are treated as unavailable; other browse failures become 502. No error or reconnect replays startup. A dispatch-only 200 does not establish audio, queue order, metrics, or real shuffle state; existing Pear events/reads remain authoritative.

The final native state is re-read immediately after the permit, with no await before emitting the event. Normal video watch commands in a shuffled requested playlist, or an unverified reusable context, return 501 before emitting. Even a supplied executor clear-state feature flag does not prove order restoration. Native watch-playlist startup follows the inspected fresh-queue path. Same-playlist Always Normal via legacy video commands remains unsupported; do not label that acceptance passed.

The plugin retains only a validated code/dispatch pair from at most 1,024 error bytes. Missing/unrecognized extension gives Update Pear; recognized 501 gives Unavailable. Recognized `unknown`, including 503 after permission, is unconfirmed. Known pre-dispatch failures stay rejected. Malformed/oversized bodies cannot expose raw text; ambiguous network/timeout/response errors still warn that playback may have started.

## Final tests and validation

Pear, at the implementation commit, with Node 24.21.0 / pnpm 11.28.4:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm exec tsc -p tsconfig.test.json --noEmit
pnpm test --reporter=line
pnpm build
pnpm exec oxlint --type-aware src/plugins/api-server
pnpm check
```

- Frozen install, source/test type checks, main/preload/renderer build, new API lint, and changed-file format checks: pass. Dependency/package/lockfile/license bytes are unchanged from the reviewed base.
- Complete suite: **39 passed, zero failures/skips** (33 new, five existing pure, one existing Electron launch smoke test). The GUI smoke test used isolated `XDG_CONFIG_HOME` and `XDG_CACHE_HOME` under `/tmp`; no signed-in account or native playlist audio was used.
- New tests cover strict HTTP/OpenAPI/auth, all codes, busy/unready, timeout/abort/config/rebind/lifecycle/sender/frame/generation/correlation checks, modern/legacy/header/entity/wrapper selection, opaque command preservation, native acknowledgment/no-handler, unsafe normal reuse, late browse cancellation, readiness recovery, and no replay.
- Full lint: zero errors, the same **17 inherited warnings**. Aggregate `pnpm check` still fails formatting in the same **17 untouched upstream files** listed below, exactly as before implementation. Stage 7 source/test/config/README files pass their individual formatter check; source/test type checks run separately because the aggregate stops at formatting. No unrelated reformat was made.

Inherited formatting failures at base and final:

```text
src/config/store.ts
src/i18n/resources/si.json
src/index.ts
src/menu.ts
src/plugins/album-actions/index.tsx
src/plugins/ambient-mode/index.ts
src/plugins/api-server/backend/routes/websocket.ts
src/plugins/crossfade/fader.ts
src/plugins/discord/discord-service.ts
src/plugins/downloader/main/index.ts
src/plugins/in-app-menu/renderer/TitleBar.tsx
src/plugins/precise-volume/override.ts
src/plugins/synced-lyrics/parsers/lrc.ts
src/plugins/synced-lyrics/providers/MusixMatch.ts
src/plugins/synced-lyrics/providers/YTMusic.ts
src/plugins/transparent-player/backend.ts
src/plugins/utils/main/fs.ts
```

Stream Deck integration, Node 24.21.0 / official CLI 1.10.1 / retained locked tools:

- `npm run typecheck`, full `npm test`, individual Node 24 test runner, `npm run build`, and `npm run prepare:streamdeck-cli`: pass. **105 tests across ten files**, zero failures/cancellations/skips.
- Official CLI validate/pack: pass, zero errors and retained category/name warning; 49 files, 236,763 unpacked bytes, version 2.3.0.0. Package SHA-256 `41b4e63bf0acc7d9c78841ccbed27d1335c2d2e12920bf8244b5deb426a277d1`; packaged MIT is byte-identical. Package/dependencies/lockfile/spec/AGENTS/license are preserved.
- Reproducible optional integration (requires the separate checkout with its installed locked dependencies):

```sh
node scripts/test-pear-extension.js /path/to/pear-desktop
```

The recorded run used `/tmp/pear-stage07-desktop` at the Pear commit above, with optional second argument `/tmp/pear-stage07-playlist-data.json` containing the fresh public browse data described earlier. **Pass**: actual Hono HTTP route, broker, adapter, JWT, and shared plugin client; six mode/shuffle combinations; unchanged confirmed state; one acknowledged command each; safe native 501; post-permit unknown 503; real HTTP abort propagation and denied late permit/browse; revoked authorization 401; exactly ten operation POSTs; no replay/token logs. Optional public-data normal/shuffle resolution also passes. Electron IPC/native handlers are simulated; these are not signed-in playback results.
- [GitHub integration CI run 37260620944](https://github.com/Scarfmeister/Pear-StreamDeck/actions/runs/37260620944) passes at `d44fc520a4ac8dc51cd58adce58eea2cbbf0f715`: clean install, source/test types, complete tests, build, manifest preparation, official CLI validate/pack, and artifact upload. Remote plugin commit evidence is also recorded in the [Stage 7 checkpoint](../checkpoints/stage-07.md). The primary integration uses the existing workflow; optional cross-repository verification remains separate from its single-repository CI.

## Assumptions, unresolved gates, and upstream contribution

YouTube Music's website changes independently of Pear/package versions. The observed public responsive header is fresh anonymous evidence; legacy, modern entity-based, signed-in/private, localized, and error variants in tests are synthetic structural fixtures. Missing/cyclic/partial/ambiguous relations reject with 501 instead of stale fallback. Header selection and native handler semantics must be tested in signed-in Pear before shipping.

Outstanding live gates: normal/shuffle across the same/different playlist and old shuffle states, native queue replacement, private/empty/unavailable playlists, player/plugin re-enable, deadlines/cancellation/rebind under real Electron timing, first audible track, metrics, and Elgato/OpenDeck/device behavior. Normal legacy reuse is an explicit 501 limitation, not a passed Always Normal case. Source tracing alone cannot prove listening metrics or all website variants. See [manual acceptance](../MANUAL_TESTING.md#stage-7-extension-acceptance).

The fork feature branch is pushed with upstream history intact, one generally useful endpoint, existing authentication, contained lifecycle ownership, tests, general API README, and no dependency/global-renderer/URL-navigation subsystem changes. This is a reviewable contribution branch, not a released or upstream-accepted API. Before proposing it upstream, run the signed-in native acceptance matrix, disclose inherited aggregate formatting failures and the conservative reuse limit, and rebase/revalidate against the then-current upstream. Reviewed open PRs may converge on a later upstream contract; do not silently assume those APIs or route aliases exist. **No upstream pear-devs/pear-desktop PR was opened or merged.** Stage 7 authorizes no release or Stage 8 work.
