# Implementation status

Current stage: **Stage 8 — Assets, packaging, documentation, and release validation**.

State: **Stage 8 implementation and local validation complete.** Source/documentation publication, GitHub CI and final remote-head evidence are closed in [the Stage 8 checkpoint](checkpoints/stage-08.md) before stopping. The installer is a development preview for manual testing, not a published release or hardware certification. No Pear modification or Stage 9 work is included.

Localization: all inherited **en/de/fr** files retained, with **204 required leaf keys / 136 active runtime strings** per locale and validation in normal tests. Most German/French translations had survived earlier porting; the English root description, missing/obsolete bindings and new active English forms needed correction. Reusable translations are retained, changed/new Pear text is translated, and explicit identical-term exceptions are documented. See [LOCALIZATION.md](LOCALIZATION.md) and its complete inventory. Structural/browser validation passes; native-speaker/device review remains manual.

## Completed Stage 8 work

- Fetched/pulled and checked out `dev/pear-port`; started clean at `f7b1ce245b3b015d5603e4e05754d1bd7f09619f`. Reviewed all project documentation/checkpoints/research and recent history before edits.
- Audited all inherited visual groups. Replaced all 32 inherited PNGs with project-created generic MIT controls; refreshed known Stage 4 geometry; added consistent playlist/metadata/plugin/category icons. Committed 23 editable SVGs and 46 rendered PNGs; removed unproven PSD/promotional thumbnail from the current tree while preserving upstream history/attribution and the unchanged original MIT.
- Restored complete English/German/French manifest/action/state/encoder localization and active PI/dial/key status/help/fallback/error text. Same resources drive a small host-language browser adapter; actual metadata, names, URLs, IDs and settings are untouched. Added per-leaf exceptions, full baseline/final inventory, and fault-injection/browser tests.
- Normalized the canonical manifest to Version 2.3.0.0 with supported fields; retained SDKVersion 2/HTML/framework and category identity. Corrected inherited OS minima to current Windows 11/macOS 13 targets using official requirements; software feature minimum remains 6.4 and physical host acceptance is unverified.
- Added the native OpenDeck Linux manifest override with unchanged action IDs/HTML runtime. Replaced broad build copying with explicit runtime resources and PNG-only distribution; dynamic Repeat now uses PNG. Added real archive/CRC/resource/dimension/state-distinction/MIT/canonical/Linux checks.
- Extended existing CI with package checks and existing release-build gates with type/tests/localization/archive checks. Verified current CLI/schema and release-please's preservation of a fourth version component; no SDK migration, dependency/version bump, DRM, new redundant workflow or release is needed.
- Rewrote user setup/install/features/playlist/compatibility/development/license README. Added the concrete 40-row manual matrix with expected results for keys, Plus, Windows/OpenDeck/Linux/auth/restarts/reconnect/state/playlists/settings/localization/icons. Persisted research and D018.

## Stage 8 local validation

| Check | Result |
| --- | --- |
| Clean locked install | Pass: Node 24.21.0, 248 installed packages; package-lock/dependency selections unchanged. Sandbox install restriction was resolved by an authorized outside-sandbox rerun. |
| Source/test type checks | Pass; no errors. |
| Complete suite / individual Node 24 runner | **122 tests across 11 files**, no failures/cancellations/skips; includes retained client/state/key/dial/settings coverage plus localization failures and real browser-entry integration. |
| Localization | Pass: three required locales, 204 keys, manifest/state/encoder/structure/parameter parity, no English copies or undocumented placeholders; complete inventory matches. |
| Browser build / canonical preparation | Pass; both HTML/browser bundles and source/built manifest parity. |
| Official CLI 1.10.1 / current schemas 0.5.1 | Validate/pack pass, zero errors; one documented category/name warning, no ambiguous icon resources. Current schemas fetched and independently hashed. |
| Archive / Linux configuration / asset/license audit | Pass: 59 exact files, 381,423 unpacked bytes, PNG dimensions/pairs/distinct states/references, native Linux merged view, source/ZIP resource parity, unchanged MIT/notice. |
| Production / full install audit | Zero production findings; same seven legacy development findings (2 moderate, 5 high), retained for explicit release disposition. |
| Preservation | Original spec/MIT/AGENTS/lockfile/dependencies, all 15 action UUIDs, upstream ancestry/default branch retained; all 32 old PNG byte streams replaced. |
| GitHub CI / source publication | Final commit/run/remote results are recorded in the closing checkpoint after push. No release workflow is triggered from this branch. |
| Real Pear/native audio / Elgato/OpenDeck/device/host persistence | Not run; explicit manual gates, not implied by schema/messages/source checks. |

Artifact: `build/io.github.scarfmeister.pear-streamdeck.streamDeckPlugin`, SHA-256 `2a69ead01591f567e46e102e05b19066b17a55d01668250a4de134a7c5f32e74`. Build output is ignored and no installer binary is committed. [Tooling research](research/elgato-build-and-packaging.md) records reproduction, versions, schemas and platforms; [asset research](research/assets-and-licensing.md) records sources/licenses/removals and generation.

Remaining release gates: installed Windows/macOS/OpenDeck/Linux/Flatpak and device readability/events; host auth/token/action settings persistence; signed-in native normal/Shuffle Play/queue/audio semantics; minimum-host and native-speaker review where claimed; disposition of development findings. Stock Pear 3.12.0 still lacks playlist startup; the separate extension remains `b5f13f65c71ca8890c08f52c7d7becde5d855be9`. Unsafe legacy shuffled same-playlist Normal startup remains a visible 501 limit. Artwork stays deferred. Cold-cache, same-track external ratings, legacy shuffle, half-open transport and host-write acknowledgment limits remain documented. Stage 8 stops here; Stage 9/PR/release requires its own request.

## Stage 7 checkpoint history

State: **Stage 7 complete, committed, and pushed.** The extension was still required by the committed Stage 3 contract and Stage 5–6 checkpoints. The separate Pear fork's `feature/streamdeck-playlist-api` contains [`b5f13f65c71ca8890c08f52c7d7becde5d855be9`](https://github.com/Scarfmeister/pear-desktop/commit/b5f13f65c71ca8890c08f52c7d7becde5d855be9), pushed and independently verified. The plugin's tested integration on `dev/pear-port` is [`d44fc520a4ac8dc51cd58adce58eea2cbbf0f715`](https://github.com/Scarfmeister/Pear-StreamDeck/commit/d44fc520a4ac8dc51cd58adce58eea2cbbf0f715); [GitHub CI passed](https://github.com/Scarfmeister/Pear-StreamDeck/actions/runs/37260620944). This closing documentation commit records the tested implementations; its final remote head is independently verified and supplied in the stage report. See [the Stage 7 checkpoint](checkpoints/stage-07.md), [extension research](research/pear-playlist-api-extension.md), and D017. Signed-in native playback, physical Elgato/OpenDeck/device acceptance, and Linux packaging remain unverified.

## Completed Stage 7 work

- Fetched, checked out, and pulled `dev/pear-port`; started clean at `dafde761b9190fffd81b4f02557cb7acb02a7654`. Reviewed authoritative documents, Stage 3 research/contract, Stage 5–6 checkpoints, and recent history before implementation.
- Cloned and pulled the separate `Scarfmeister/pear-desktop` fork; verified its upstream relationship and equal fork/upstream master base `a8830222afffb4af98aaa9b19287ebc24952605b`. Worked only on `feature/streamdeck-playlist-api`. Current master still lacked both normal playlist startup and native Shuffle Play.
- Implemented D013's general-purpose protected `POST /api/v1/play-playlist`, strict ID/boolean JSON, OpenAPI schemas, dispatch-only response, and safe structured errors inside Pear's existing API Server plugin. Existing JWT/authorized-client and `NONE` authentication behavior is preserved.
- Added a contained renderer adapter and correlated broker: signed-in `/browse`, bounded requested-header/native-command/entity resolution, complete opaque command preservation, native `yt-action` acknowledgment, one active operation, five-second deadline, sender/main-frame checks, and authorization/generation/permit gating. Abort, API/config/rebind/stop, and renderer reload/destruction cancel pending work without replay.
- Guarded legacy normal commands that could reuse a shuffled same-playlist queue. Unsupported or ambiguous native commands/handlers return 501 before startup. No guessed shuffle parameters, watch-URL fallback, fabricated success/state, or normal→shuffle→skip workaround exists.
- Retained the already matching shared plugin client and added bounded closed-contract error decoding. Missing extension shows Update Pear; a recognized native 501 shows Unavailable. Post-permit unknown outcomes, including HTTP 503, remain unconfirmed. Keys and selector still use one connection/state model.
- Added 33 Pear tests and four plugin tests, plus an optional real-HTTP cross-repository integration script. Updated setup, decisions, native/manual acceptance, architecture, and reproducible research. Pear package/dependencies/lockfile/license and plugin package/dependencies/lockfile/spec/license/AGENTS remain unchanged; no upstream PR, release, or default-branch changes.

## Stage 7 validation

| Check | Result |
| --- | --- |
| Pear frozen install / source and test type checks / main-preload-renderer build | Pass, using Node 24.21.0 and pnpm 11.28.4; unchanged lockfile. |
| Pear complete Playwright suite | **39 passed**, zero failures/skips: 33 new tests, five existing pure tests, and the existing Electron launch smoke test. GUI launch used isolated test config/cache; it is not signed-in native playback acceptance. |
| Pear new API lint / changed-file formatting | Pass; zero new lint errors/warnings and clean Stage 7 files. |
| Pear aggregate `pnpm check` | Still fails the same **17 untouched upstream formatting files** seen before edits; full lint has zero errors and the same 17 inherited warnings. Source/test type checks pass separately. See research for exact files. |
| Plugin full type checks / tests / browser builds | Pass; **105 tests** across ten files, zero failures/cancellations/skips. |
| Real-HTTP cross-repository integration | Pass: actual Pear route/broker/adapter and plugin client, JWT, all six mode/state combinations, guarded 501, post-permit unknown outcome, HTTP abort/late browse, revocation, and no replay. Optional fresh anonymous browse data resolves both native commands. Native player/audio is simulated. |
| Official Stream Deck CLI 1.10.1 validate / pack | Pass; zero errors, retained category/name warning; version 2.3.0.0, 49 files, 236,763 unpacked bytes. Package MIT is byte-identical. |
| Preservation / whitespace / documentation | Pass; original histories/defaults/dependencies/spec/licenses retained; 62 local Markdown targets/anchors and whitespace clean. |
| GitHub implementation CI | Pass; [run 37260620944](https://github.com/Scarfmeister/Pear-StreamDeck/actions/runs/37260620944), all install/type/test/build/validate/pack/upload steps successful at `d44fc520a4ac8dc51cd58adce58eea2cbbf0f715`. |
| Remote development branches | Fresh fetch: Pear local/remote feature heads both `b5f13f65c71ca8890c08f52c7d7becde5d855be9`; plugin local/remote integration heads both `d44fc520a4ac8dc51cd58adce58eea2cbbf0f715`. Defaults remain unchanged. Closing plugin documentation head is verified after its push. |
| Signed-in native playback / Elgato / OpenDeck / hardware | Not performed. Automated contracts/source shapes and an Electron launch are distinct from native audio/queue or physical acceptance. |

Development artifact: `build/io.github.scarfmeister.pear-streamdeck.streamDeckPlugin`, SHA-256 `41b4e63bf0acc7d9c78841ccbed27d1335c2d2e12920bf8244b5deb426a277d1`. Stock Pear 3.12.0 still lacks the route; use the recorded fork build, not version number alone. Normal legacy watch commands in a shuffled same-playlist queue fail safely with 501; native fresh-queue semantics, signed-in/private/modern layouts, first audible track, and listening metrics remain manual gates. Retained connection/rating/shuffle/host-persistence limits, Linux override, artwork/assets, dormant-source/development-tool cleanup, and release acceptance remain later work.

## Stage 6 checkpoint history

State: **Stage 6 complete, committed, and pushed.** Final tested implementation: [`0c6b011bb6469613f89584b4b11496f619919feb`](https://github.com/Scarfmeister/Pear-StreamDeck/commit/0c6b011bb6469613f89584b4b11496f619919feb); [GitHub CI passed](https://github.com/Scarfmeister/Pear-StreamDeck/actions/runs/37237529138). Dedicated Volume, Transport, and Playlist Selector encoders share the existing Pear client. This closing documentation commit records the tested implementation; its final remote head is independently verified and supplied in the stage report. Native playlist execution remains blocked on the separate **Stage 7** Pear extension. Physical Pear/Elgato/OpenDeck/device acceptance and Linux packaging are unverified. See [the Stage 6 checkpoint](checkpoints/stage-06.md) and [SDK/runtime research](research/stream-deck-plus-sdk.md).

## Completed Stage 6 work

- Fetched, checked out, and pulled `dev/pear-port`; confirmed a clean starting tree at `4ef25ac918f1557c1dcdc87110414388c18e98df`. Reviewed the project documents, Stage 1 framework/stack decisions, Stage 4–5 checkpoints/research, and recent history before changes.
- Verified retained `streamdeck-typescript` 3.3.4, HTML/browser runtime, SDKVersion 2, host minimum 6.4, and pinned OpenDeck 2.14.0 plus its locked touch renderer before relying on encoder behavior. Saved sources/versions/API/layout/stack/Linux limitations in research and D016.
- Added dedicated Encoder-only Volume, Transport, and Playlist Selector actions. Existing Play/Pause and Volume Up Encoder profiles remain aliases; their key behavior is preserved. Visible-context/controller guards isolate key/encoder dispatch, including events missing optional controller declarations.
- Volume applies signed ticks × validated step (default 5), uses the existing bounded confirmed-volume queue, clamps to 0–100, presses for true mute, and displays actual volume/mute or explicit unknown/offline state through `$B1`.
- Transport sends one Next/Previous per signed detent without position-tick dependence, bounds waiting input to sixteen per context, discards unsent input after error/disconnect/disappearance/replacement, and presses for shared actual play/pause. Its custom display follows real playback/title/artist.
- Selector supports up to sixteen named URL/ID entries, canonical IDs, per-entry startup modes (Follow default), and optional bounded embedded PNG/JPEG images. Rotation wraps/persists a per-context index without playback; saved indices are safely restored/clamped. Invalid name/ID slots remain visible and cannot execute. PI edits keep the latest incoming selection and preserve unsaved drafts.
- Used D007's reliable one-encoder equivalent rather than dynamic host-stack replacement. The exact difference and pinned technical evidence are recorded. Press reuses `PearClient.startPlaylist`; actual Follow state, Stage 7 errors, no replay/fallback/optimistic state, and stale-selection/context protection remain explicit.
- Added the typed touch adapter, release-only activation, short-touch display refresh/hold-ignore behavior, cached rendering, packaged custom layout, and context/shutdown cleanup. No second connection/state model or Pear change was introduced.
- Added nineteen automated tests to the retained eighty-two, including actual browser bundles, real shared-client fake networking, state mapping, rotation/queue cancellation, selector settings/persistence/images, and manifest/layout/resource checks. The resource test caught and corrected new feedback image extensions before completion.
- Updated README, architecture implementation map, decisions, manual acceptance, research, and this stage record. Dependencies/lockfile/spec/MIT/AGENTS, upstream/default branches, Pear source, release, and final PR remain unchanged.

## Stage 6 validation

Environment: system Node `22.22.2`, verification Node `24.21.0`, official CLI `1.10.1`, locked TypeScript `5.9.3`, esbuild `0.25.12`, framework `3.3.4`.

| Check | Result |
| --- | --- |
| Clean `npm ci` | Pass; 248 locked packages. |
| Full source/test type checks | Pass; zero errors. |
| Full `npm test` and Node 24 individual runner | Pass; ten files, **101 tests**, zero failures/cancellations/skips. |
| Build / manifest preparation / official CLI validate and pack | Pass; both browser bundles, custom layout, version `2.3.0.0`; zero errors and retained category/name warning; 49 files, 235,308 unpacked bytes. |
| Production dependency audit | Zero findings. Clean install retains seven known development-only findings (2 moderate, 5 high); no dependency changes. |
| Package/preservation/source/docs checks | Package resources, MIT/spec/dependencies/AGENTS byte preservation, upstream ancestry, 43 local Markdown paths/anchors, and whitespace pass; pinned OpenDeck/renderer checkouts remain clean. Artifact/commit evidence is in the checkpoint. |
| GitHub implementation CI | Pass; [run 37237529138](https://github.com/Scarfmeister/Pear-StreamDeck/actions/runs/37237529138), all install/type/test/build/validate/pack/upload steps successful. |
| Remote implementation verification | Fresh fetch: local and `origin/dev/pear-port` both `0c6b011bb6469613f89584b4b11496f619919feb`; default `origin/master` remains `8b0c3320ce59b741b3165a1c8ac3a54b66c2c97a`. Closing documentation head is verified after push. |
| Real Pear / Elgato / OpenDeck / hardware | Not performed; automated logic/wire/schema and source expectations are distinct from physical acceptance. |

The Stage 6 development package includes three dedicated dials, eleven standard keys, and the guarded playlist key/client interface. Stock Pear still cannot execute playlists. Linux override, artwork hardening, final asset/dormant-source/development-dependency cleanup, hardware/native acceptance, and release remain later work. Existing cold-cache/rating/shuffle/half-open/host-persistence limits remain.

## Stage 5 checkpoint history

State: **Stage 5 complete, committed, and pushed.** Final tested implementation: [`633d8bfbbedb73c2cc5e3dcd98f11924052050cc`](https://github.com/Scarfmeister/Pear-StreamDeck/commit/633d8bfbbedb73c2cc5e3dcd98f11924052050cc); [GitHub CI passed](https://github.com/Scarfmeister/Pear-StreamDeck/actions/runs/37234585004). See [the Stage 5 checkpoint](checkpoints/stage-05.md) for package/remote evidence. This closing documentation commit follows the tested implementation; its final remote head is independently verified and supplied in the stage report. Native playlist execution remains blocked on the separate Pear API extension in **Stage 7**; this stage implements the configuration, persistence, validation, and expected client interface only.

## Completed Stage 5 work

- Fetched, checked out, and pulled `dev/pear-port`; confirmed a clean starting tree at `15bb236f17c69e49ee6002c004f992e4d1ae5f8e`. Read AGENTS, specification, status, decisions, manual checks, Stage 3 playlist evidence, Stage 4 research/checkpoint, and recent history before edits.
- Retained centralized global connection controls for host/port/protocol, authorization/token status, Reauthorize, and connection/retry status. Default remains HTTP `127.0.0.1:26538`. Invalid connection edits now remain visible until corrected/accepted; credentials never enter PI status or logs.
- Added native per-context PI controls for Volume Up/Down steps (integer 1–100%, default 5%), all five Track Info formats (Title + Artist default), and playlist URL/ID plus three startup modes (Follow default).
- Centralized action validators/readers. Strict invalid edits submit no write; old/malformed records use safe defaults. Unrelated settings stay intact, settings arriving before setup are retained, and status/settings updates do not erase unsaved edits. Global settings remain separate; opening a PI does not rewrite actions or start playback.
- Added a documented small framework PI adapter using action UUID/context for settings/plugin messages. Kept the existing browser integration and one Pear session/transport owner.
- Implemented D013 URL/raw-ID parsing, conservative unsafe-input rejection, decode-once/case preservation, canonical ID storage, and explicit-save migration of legacy playlist URLs. Invalid legacy URLs cannot fall back to stale IDs.
- Added shared `PearClient.startPlaylist(input, mode)`: captured Follow state, one bounded unknown-state read, one active operation, generation cancellation, exactly one D013 request, strict dispatch response, no optimistic state or command replay. Missing/unsupported native capability displays the Stage 7 requirement and alerts; no fallback or normal→shuffle→skip workaround exists.
- Added 20 automated tests to the retained 62, including pure settings/parser/mode tests, actual PI/plugin browser bundles, and playlist client/failure/cancellation coverage. Fake successful dispatch is explicitly not proof of current Pear/native operation.
- Persisted SDK/settings/display/client findings, D015 and scope clarification to D013, README setup, and Stage 5 manual acceptance. No Pear source, dependencies/lockfile, spec/license, default/upstream branch, dial implementation, release, or final PR changes.

## Stage 5 validation

Environment: system Node `22.22.2`; Node `24.21.0` and official CLI `1.10.1` under `/tmp`; locked TypeScript/esbuild/framework unchanged.

| Check | Result |
| --- | --- |
| Clean `npm ci` | Pass; 248 locked packages. |
| Full source/test type checks | Pass; zero errors. |
| Complete `npm test` / Node 24 runner | Pass; all eight files; Node 24 individual run reports **82 tests**, zero failures/cancellations/skips. |
| Build / manifest preparation | Pass; both browser bundles, normalized version `2.3.0.0`. |
| Official CLI validate / pack | Pass; zero errors, retained category/name warning, 48 files, approximately 217.8 kB unpacked. |
| Production dependency audit | Pass; zero findings. Clean install retains seven known development-only findings (2 moderate, 5 high); no dependency changes. |
| Package/preservation/docs/whitespace checks | Pass; 48 expected ZIP files, original MIT/spec/dependencies/AGENTS byte equality, upstream ancestry, local Markdown paths, `git diff --check`, commitlint. |
| GitHub implementation CI | Pass; [run 37234585004](https://github.com/Scarfmeister/Pear-StreamDeck/actions/runs/37234585004), all install/type/test/build/validate/pack/upload steps successful. |
| Remote implementation verification | Fresh fetch: local and `origin/dev/pear-port` both `633d8bfbbedb73c2cc5e3dcd98f11924052050cc`; `origin/master` remains `8b0c3320ce59b741b3165a1c8ac3a54b66c2c97a`. Final documentation head is verified after push. |
| Real Pear / Elgato / OpenDeck / hardware | Not run; forms, host persistence, readability, and native playback require manual acceptance. |

Artifact: `build/io.github.scarfmeister.pear-streamdeck.streamDeckPlugin`. Stage 5 development package: eleven standard keys plus per-action settings and a guarded playlist client interface. Both native playlist modes require Stage 7. Dedicated dials, Linux override, artwork hardening, final assets/development dependency cleanup, and release remain later work. Existing cold-cache/rating/shuffle/half-open/persistence limits from Stage 4 remain unchanged.

## Stage 4 checkpoint history

Stage 4 complete, committed, and pushed. Its final tested implementation is [`69bce200dafb20f09ece55e03750d251a0b56297`](https://github.com/Scarfmeister/Pear-StreamDeck/commit/69bce200dafb20f09ece55e03750d251a0b56297); [GitHub CI passed](https://github.com/Scarfmeister/Pear-StreamDeck/actions/runs/37230247552). See [the Stage 4 checkpoint](checkpoints/stage-04.md); its final bookkeeping head is Stage 5's starting commit above. The sections below retain prior-stage history.

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
| Package inspection | Pass; 48 files, UUID/version/entries, all state SVGs, unchanged MIT license, no companion/Socket.IO/test runtime. |
| Production/full dependency audit | Production zero findings; full tree retains the same seven development-only findings (2 moderate, 5 high). No dependency changes. |
| Spec/license/history/whitespace | Pass; original spec/license byte equality and hashes, unchanged dependencies, upstream ancestry, authored whitespace, and 22 local Markdown link paths. |
| GitHub implementation CI | Pass; [run 37230247552](https://github.com/Scarfmeister/Pear-StreamDeck/actions/runs/37230247552), including artifact upload. |
| Remote implementation verification | Fresh fetch: local and `origin/dev/pear-port` both `69bce200dafb20f09ece55e03750d251a0b56297`; `origin/master` remains `8b0c3320ce59b741b3165a1c8ac3a54b66c2c97a`. Final documentation head is verified after its push. |
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

**Stage 8, only after an explicit Stage 8 request.** Read the Stage 7 checkpoint and follow that request's scope. The outstanding native/host acceptance, Linux override, artwork/assets, and development-tool cleanup gates are recorded; none is automatically started by Stage 7.

Stage 7 stops after both development branches are pushed and their remote heads verified. Do not start Stage 8, open/merge an upstream Pear PR, create a final plugin PR, or publish a release automatically. Read `AGENTS.md` and the current specification/status/decisions/research/checkpoint before the next stage.
