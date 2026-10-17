# Stage 7 — Conditional Pear Desktop API extension and integration

## Scope and conditional decision

Read the committed status, decisions, Stage 3 investigation/D013, Stage 5–6 checkpoints, project specification/manual/research, AGENTS, and recent history after fetching/checking out/pulling the development branch. The plugin tree was clean at `dafde761b9190fffd81b4f02557cb7acb02a7654`. Committed evidence still required a Pear extension for both normal playlist startup and native Shuffle Play; the freshly reviewed Pear master still had no such route. Queue insertion/current-queue shuffle were insufficient. Stage 7 therefore implemented the minimal general-purpose extension and integrated it, then stopped.

## Repositories and commit evidence

| Repository | Branch | Relevant commit |
| --- | --- | --- |
| Scarfmeister/Pear-StreamDeck | `dev/pear-port` | Starting Stage 6 close: `dafde761b9190fffd81b4f02557cb7acb02a7654`. Tested integration: [`d44fc520a4ac8dc51cd58adce58eea2cbbf0f715`](https://github.com/Scarfmeister/Pear-StreamDeck/commit/d44fc520a4ac8dc51cd58adce58eea2cbbf0f715), pushed and freshly verified equal to `origin/dev/pear-port`. Closing documentation head is verified/reported separately below. |
| Scarfmeister/pear-desktop | `feature/streamdeck-playlist-api` | Final implementation: [`b5f13f65c71ca8890c08f52c7d7becde5d855be9`](https://github.com/Scarfmeister/pear-desktop/commit/b5f13f65c71ca8890c08f52c7d7becde5d855be9). Fresh fetch verifies local/remote equality and a clean tree. |
| Pear fork/upstream | `master` (read-only) | Equal reviewed base `a8830222afffb4af98aaa9b19287ebc24952605b`, with zero divergence; original fork relationship/history retained. |
| Plugin default branch | `master` (read-only) | Preserved `8b0c3320ce59b741b3165a1c8ac3a54b66c2c97a`. |

The implementation is committed first, then this closing documentation commit records its actual SHA and [successful GitHub CI run 37260620944](https://github.com/Scarfmeister/Pear-StreamDeck/actions/runs/37260620944). A file cannot embed the SHA of the commit containing its own final bytes. Retrieve the final closing documentation SHA with `git log -1 --format=%H -- docs/checkpoints/stage-07.md`; the final stage report supplies that independently verified remote head. The closing commit changes documentation only. Both working trees are clean after the commits and their remote development heads are verified before stopping.

## Work completed and changed components

- Used the separate Pear fork, full-history clone and clean feature branch based on freshly fetched/pulled fork master. Verified GitHub parent and fetched upstream; no Pear source was copied into the plugin and no default branch was edited.
- Kept D013's protected `POST /api/v1/play-playlist`, strict case-preserved ID/boolean JSON, existing JWT/authorized-client/`NONE` behavior, OpenAPI schemas, dispatch-only 200, and closed safe errors.
- Added Pear API Server `playlist-contract.ts`, `backend/playlist-broker.ts`, `backend/routes/playlist.ts`, `backend/scheme/playlist.ts`, `renderer.ts`, and `renderer/{playlist-command,playlist-adapter}.ts`. Registered them through existing API/plugin lifecycle files, without global renderer/song-control changes.
- Resolve only the requested primary playlist header's native normal/shuffle controls through Pear's signed-in network manager. Validate supported legacy/modern entity and intact executor relations, preserve full opaque commands, and dispatch one acknowledged native event. Unsupported/ambiguous/missing/unsafe structures fail 501 before startup.
- Own one active operation and main IPC listeners, absolute five-second deadline, window/main-frame/correlation/generation checks, authorization/permit gating, runtime readiness, and cancel/dispose on HTTP abort/configuration/rebind/stop/full reload/destruction. Post-permit outcomes can be unknown; no replay or queued startup.
- Guard native normal video commands that could reuse the same shuffled playlist; do not invent a clear-shuffle wrapper, guessed params, watch URL, queue, or normal→shuffle→skip workaround. This conservative 501 limit is explicit in decisions, research, API README, setup, and manual checks.
- Added Pear `tests/api-playlist-{contract,broker,native,adapter}.spec.ts` and account-free fixtures, test declaration include, ignored runner artifacts, and general API README. Package/dependencies/lockfile/license are untouched.
- Plugin `src/pear/{playlist,rest-client,pear-client}.ts` keeps the matching shared request/state interface and adds ≤1,024-byte closed error decoding, distinguishing missing extension, native unsupported, known rejection, and unknown dispatch. Updated key/dial feedback and PI explanation. Raw token/native/server text is not exposed.
- Updated playlist/key/dial/browser tests and added optional `scripts/test-pear-extension.js` to verify actual cross-repository HTTP/client behavior without importing Pear into the plugin runtime/package.
- Updated README, status, D013/D017, architecture, manual acceptance, Stage 5 research follow-up, complete Stage 7 research, and this checkpoint. No dependency/spec/MIT/AGENTS/default/upstream/release changes or upstream PR.

## Tests and validation performed

| Check | Result |
| --- | --- |
| Pear frozen locked install | Pass; Node 24.21.0 / pnpm 11.28.4, package/lockfile unchanged. |
| Pear source type check and `tsconfig.test.json` type check | Pass; zero errors. |
| Pear complete `pnpm test --reporter=line` | **39 passed**, zero failures/skips: 33 new plus five existing pure tests and one Electron launch smoke test. GUI smoke used isolated temporary config/cache. |
| Pear main/preload/renderer build | Pass. |
| Pear new API lint and changed-file formatter | Pass; no new errors/warnings or formatting failures. |
| Pear full lint / aggregate `pnpm check` | Zero lint errors, same 17 inherited warnings; aggregate still fails the same 17 untouched upstream formatting files seen before edits. Exact list/results are in research. Separate type checks pass. |
| Plugin type checks / complete suite / Node 24 individual runner | Pass; **105 tests across ten files**, zero failures/cancellations/skips. |
| Real-HTTP cross-repository integration | Pass; actual route/broker/adapter/client, JWT, six mode/state cases, full native command preservation/acknowledgment, safe 501, post-permit unknown 503, HTTP abort/late browse, revocation, and no replay/optimistic state/token logs. Native IPC/player state is simulated. |
| Fresh anonymous public browse shape | Both native normal and shuffle command resolutions pass. No signed-in/audio inference. |
| Plugin browser build / manifest preparation / CLI 1.10.1 validate and pack | Pass; zero errors, retained category/name warning, version 2.3.0.0, 49 files / 236,763 unpacked bytes. |
| Package, preservation, whitespace, local Markdown, and upstream history | Pass; 62 local Markdown targets/anchors, clean whitespace, retained MIT/spec/dependencies/AGENTS, original history/defaults, and package license. No dependency/package scope expansion. |
| Plugin GitHub implementation CI | Pass; [run 37260620944](https://github.com/Scarfmeister/Pear-StreamDeck/actions/runs/37260620944) at `d44fc520a4ac8dc51cd58adce58eea2cbbf0f715`, all install/type/test/build/validate/pack/upload steps successful. |
| Remote development heads | Fresh fetch: Pear local/remote feature branch both `b5f13f65c71ca8890c08f52c7d7becde5d855be9`, plugin local/remote integration both `d44fc520a4ac8dc51cd58adce58eea2cbbf0f715`; defaults and upstream ancestry preserved. Final documentation head is verified after push. |
| Signed-in native playback / Elgato / OpenDeck / physical hardware | **Not performed.** Automated contracts/source shapes and Electron launch are distinct from native queue/audio and device acceptance. |

Development package: `build/io.github.scarfmeister.pear-streamdeck.streamDeckPlugin`; SHA-256 `41b4e63bf0acc7d9c78841ccbed27d1335c2d2e12920bf8244b5deb426a277d1`. Its embedded original MIT license is byte-identical. No release is published.

## Unresolved problems and manual testing still required

- Stock Pear 3.12.0 lacks this route. Use the recorded feature commit/build; package version alone cannot identify the extension.
- Legacy normal watch commands in a shuffled same-playlist queue are rejected safely with 501. Actual native normal/fresh-queue and shuffle/audio semantics must pass signed-in acceptance, including same/different playlists, off/on old shuffle, modern/private/localized layouts, unavailable/empty playlists, and first audible track. Native listening metrics remain unverified.
- Verify real Electron API re-enable/rebind/reload/cancellation timing and unknown outcomes, host auth/token/settings persistence, no replay/listener growth, and key/selector feedback on Elgato/OpenDeck/devices. Source expectations and simulated acknowledgment are not physical compatibility passes.
- Pear's 17 baseline formatting failures and 17 lint warnings are inherited and untouched; no new failure remains. Plugin's retained development dependency findings, cold-cache/rating/shuffle/half-open limitations, Linux override, artwork/assets, dormant-source cleanup, and full release gate remain later work.
- Manual steps are updated in [MANUAL_TESTING.md](../MANUAL_TESTING.md), particularly [Stage 7 extension acceptance](../MANUAL_TESTING.md#stage-7-extension-acceptance) and native startup. Do not open/merge an upstream Pear PR without a later explicit request.

## Important research and decisions

- Created [pear-playlist-api-extension.md](../research/pear-playlist-api-extension.md): exact fork/base/implementation SHAs and paths, renewed native website evidence, endpoint/auth/request/response/error contract, cancellation guarantees/limits, validation commands/results, both-repository integration, assumptions, manual gates, and upstream considerations.
- Extended [playlist-settings.md](../research/playlist-settings.md) to distinguish historical Stage 5 boundary from final bounded failure handling.
- D013 remains the endpoint/native/cancellation contract; D017 records the contained implementation, conservative reuse limitation, shared client error handling, and automated/manual evidence boundary. Prior Stage 3 research remains intact.

## Exact recommended next stage and stop point

**Stage 8, only after the user's explicit Stage 8 request.** Begin with this checkpoint and the authoritative project documents, then follow that request's scope. Outstanding acceptance, Linux, artwork/assets, and cleanup gates are recorded for planning; this checkpoint does not authorize starting them. Stop Stage 7 after committing/pushing both development branches and verifying both remote heads. No Stage 8 work, upstream PR, final plugin PR, or release is automatic.
