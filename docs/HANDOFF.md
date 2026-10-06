# Pear Desktop Connector — final engineering handoff

Stage 9 completes automated engineering and opens the fork PR. Physical host/device acceptance and signed-in native playback are still unverified. Do not merge, publish a release or open an upstream Pear PR as part of this stage.

## Repository and exact revisions

| Item | Value |
| --- | --- |
| Plugin repository | [Scarfmeister/Pear-StreamDeck](https://github.com/Scarfmeister/Pear-StreamDeck) |
| Default / development branch | `master` / `dev/pear-port` |
| Unchanged default baseline | `8b0c3320ce59b741b3165a1c8ac3a54b66c2c97a` |
| Final tested implementation SHA | **`5589784ca877ab49c1dacce2323c04345594d279`** |
| Fork PR | **[PR #1](https://github.com/Scarfmeister/Pear-StreamDeck/pull/1)**, `dev/pear-port` → `master`, open and unmerged |
| Implementation CI | [Successful run 37393588427](https://github.com/Scarfmeister/Pear-StreamDeck/actions/runs/37393588427) |
| Pear repository / branch | [Scarfmeister/pear-desktop](https://github.com/Scarfmeister/pear-desktop) / `feature/streamdeck-playlist-api` |
| Pear extension SHA | **`b5f13f65c71ca8890c08f52c7d7becde5d855be9`** |

The closing `docs: complete final audit and handoff` commit adds these records after the tested implementation and PR. Its own SHA cannot be embedded in its own contents. Retrieve that exact final documentation commit using `git log -1 --format=%H --grep='^docs: complete final audit and handoff$' origin/dev/pear-port`; inspect `gh pr view 1 --repo Scarfmeister/Pear-StreamDeck --json headRefOid` for the PR's current head. Stage 9 verifies equality with the pushed closing head before stopping. Use the tested implementation SHA above for the code/package evidence; later documentation does not change runtime resources.

Read [AGENTS.md](../AGENTS.md), [PROJECT_SPEC.md](PROJECT_SPEC.md), [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md), [DECISIONS.md](DECISIONS.md), [REQUIREMENTS_STATUS.md](REQUIREMENTS_STATUS.md), [MANUAL_TESTING.md](MANUAL_TESTING.md), and [Stage 9](checkpoints/stage-09.md) before changing anything. Earlier checkpoints and source maps are historical evidence. Fetch/pull and confirm a clean `dev/pear-port`; preserve history/MIT and push only to the fork.

## Architecture and supported behavior

This remains the locked `streamdeck-typescript` 3.3.4 SDK 2 HTML/browser plugin. `src/pear-plugin.ts` owns one `PearSession`, one `PearClient` and the key/dial controllers. `src/pear/` separates REST, auth, WebSocket parsing/state, reconnect, confirmed commands and playlist startup. `src/streamdeck/pear-session.ts` owns endpoint-bound global settings and token persistence. `src/pear-pi.ts` communicates through plugin messages; it opens no Pear socket/REST connection. Commands never update the model optimistically and are never replayed after recovery.

REST uses Pear API v1 and bearer authorization; WebSocket `/api/v1/ws` uses Pear's encoded query-token contract. The state model merges actual PLAYER_INFO, video, player, position, volume, repeat and shuffle updates; rating gaps use bounded reads. Closed/failed connections use bounded exponential retry; generations cancel obsolete work. A socket opening alone does not establish a usable snapshot. Error/status/log text is safe, and credentials are confined to global storage/required transport.

- **12 key actions:** Play/Pause, Next, Previous, Like, Dislike, Mute, Volume Down, Volume Up, Track Info, Shuffle, Repeat and Play Playlist. Displays use actual playback/mute/rating/shuffle/repeat state. Repeat is NONE → ALL → ONE → NONE, with three distinct images. Volume steps are whole 1–100%, default 5%, with clamping and safe old-setting defaults.
- **Property Inspectors:** centralized host/port/protocol/auth status/Reauthorize; per-action steps; all five Track Info formats; canonical playlist ID/startup modes; selector list and bounded optional images. Invalid edits do not save, and incoming state/settings preserve drafts and unrelated fields.
- **Plus:** Volume rotation/press/touch state; Transport signed Next/Previous, release Play/Pause and actual-state feedback; Playlist Selector rotation/wrap/persisted position and selected press. One encoder/local list (up to 16 entries) is the reliable stack equivalent. Existing Play/Pause and Volume Up encoder assignments remain aliases. Short touch refreshes; hold/down performs no command.
- **Localization/assets:** inherited en/de/fr retained with 204 matching leaf keys / 136 runtime strings each; one local language adapter. Original generic MIT icon set, explicit distinct states, raster package feedback and native Linux manifest override. No OBS/Tuna export is included.

Multi Actions, old timing/hold-repeat/layout variables/library dropdown and artwork are intentionally deferred; the manifest does not advertise unsupported Multi Actions. The final audit removed obsolete companion source/dependencies and added visible-context/action guards for key releases. Current source consists of one shared implementation, with no copied Pear code. See the requirement matrix for individual classifications/evidence.

## Build, checks and artifact

Use Node **24+**, npm and Python 3. This browser plugin needs no separate Node installation at runtime. The lockfile pins the tested compiler/bundler/framework; official Elgato CLI **1.10.1** is validated for this architecture.

```sh
git checkout dev/pear-port
git pull --ff-only origin dev/pear-port
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run prepare:streamdeck-cli
npx --yes @elgato/cli@1.10.1 validate --force-update-check build/io.github.scarfmeister.pear-streamdeck.sdPlugin
npx --yes @elgato/cli@1.10.1 pack --no-update-check build/io.github.scarfmeister.pear-streamdeck.sdPlugin --output build --force --no-file-list
npm run validate:package
npm audit
```

On Windows use `py -3 scripts/validate-package.py` for the last archive audit if needed. `npm run watch` watches the two active browser entries. Optional, with the separate Pear checkout at its recorded SHA: `node scripts/test-pear-extension.js /path/to/pear-desktop`. That real-HTTP check still simulates native state and is not signed-in audio acceptance.

**Artifact:** `build/io.github.scarfmeister.pear-streamdeck.streamDeckPlugin`. The Stage 9 local ZIP has 59 files / 381,402 unpacked bytes and SHA-256 **`21872bc0d46aa1204854a3f7e0965ed130f7ea39467829d1092cbc4c8e66e6e6`**. ZIP timestamps can produce different archive hashes on rebuild; the archive validator verifies actual resources, manifests/Linux view, states and MIT. The installer is ignored, not committed or published. Successful CI uploads the `streamdeck-plugin` development artifact; extract its outer ZIP and verify the run's commit before testing. There is no public release. Version 2.3.0 / manifest 2.3.0.0 remains an inherited development identifier.

Stage 9 passes a clean locked install, source/JS audit, source/test type checks, **124 individual tests across 11 files**, locale validation, browser build, current official schema validation/packing and real archive checks. Full npm audit reports **zero findings** at the checked date. The only CLI warning is the deliberate Category Pear Desktop / Name Pear Desktop Connector difference. [Checkpoint](checkpoints/stage-09.md) records exact commands and evidence limits. The original MIT/spec/agent instructions remain byte-identical.

## Pear configuration and authentication

Standard controls target the source-reviewed **Pear Desktop 3.12.0** native API. Later versions require compatibility checks. In Pear, enable **Plugins → API Server [Beta]**, then configure **Hostname `127.0.0.1` / Port `26538`** in its submenu. Pear's own default bind is `0.0.0.0`; explicit loopback avoids needing LAN exposure. For this local setup leave HTTPS off. The connector defaults to HTTP, host `127.0.0.1`, port `26538`.

Place a key/dial, open its PI and save the matching endpoint. With **Authorize at first request** (`AUTH_AT_FIRST`), approve the one request from `io.github.scarfmeister.pear-streamdeck` in Pear. The connector stores the returned token in host global settings, bound to that endpoint, and reuses it on restart. Wait for Connected and actual state. Denied/interrupted/revoked approval requires explicit **Reauthorize**; no prompt loop or token display is intended. Saving a new origin clears old credentials/work. `NONE` (No authorization) works without an approval/token; a previously accepted bearer alone cannot reveal that server strategy. Real approval, WebView transport and disk persistence remain manual tests.

Open the installer in Windows/macOS Stream Deck; for OpenDeck select **Install from file** in its plugin manager. The same package contains a Linux override selecting native HTML and PNG feedback. These installation steps are expected from the verified host/source contract; no live import/device pass has occurred. See README for normal-user setup and the manual matrix for host/version coverage.

## Separate Pear playlist dependency

**Both normal playlist execution and native Shuffle Play require the separate Pear extension commit above.** Stock 3.12.0 lacks the route; it must visibly show Update Pear. Other controls and playlist configuration/selection remain independent.

In a separate Pear checkout, use `feature/streamdeck-playlist-api` at `b5f13f65c71ca8890c08f52c7d7becde5d855be9`; Node 24/pnpm 11 with `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm start`. Sign in, load the player and configure the API. The branch still reports 3.12.0; record the commit, not only that version. Stage 9 verified the remote branch/fork relationship and clean checkout without changing Pear or opening an upstream PR.

The extension adds general-purpose protected **POST `/api/v1/play-playlist`**, strict JSON `{"playlistId":"PLexample123","shuffle":true}` with existing Pear auth. A broker and renderer adapter resolve the requested playlist's supplied native Play/Shuffle Play control through the signed-in network manager, preserve its opaque command, and dispatch once before playback. Deadline/correlation/generation/main-frame/permit/cancellation guards bound the operation. A matching 200 means dispatch acknowledgment, not audible success; real Pear updates drive the display. Missing/unsupported/ambiguous cases reject safely; unknown outcomes are not retried. Follow reads actual current shuffle; Always Normal/Shuffle request that native mode. There is no normal-start → shuffle → skip workaround.

Unsafe legacy normal reuse of an already shuffled same-playlist queue returns 501 before dispatch. Modern/localized/private native layouts, first audible track, queue replacement and native metrics require live evidence. Pear Stage 7 ran 39 tests/type/build/API lint and a launch smoke test; its aggregate formatter had 17 inherited failures and lint 17 inherited warnings. Those are historical baseline results, not a Stage 9 full-suite rerun. The exact contract, paths, fixture boundaries and upstream plan are in [extension research](research/pear-playlist-api-extension.md).

Recommended upstream plan: after signed-in acceptance, rebase/revalidate against current Pear upstream, refresh native fixtures when necessary, rerun Pear's tests/type/lint/build and disclose baseline/safety constraints. Then seek explicit authorization to open a focused general-purpose Pear API PR. Do not merge the branch into upstream or open that PR now.

## Remaining acceptance and known limits

All **42** rows of the [manual matrix](MANUAL_TESTING.md#stage-8-release-validation-matrix) are **Not run**. Prioritize:

1. Windows 11 Stream Deck install and normal keys; approve/revoke/NONE, host/Pear restart, disabled API and reconnect, all real state-aware actions and independent saved settings.
2. Stream Deck Plus volume/transport signed detents, release press, touch feedback, selector wrapping/images/position/drafts and stock-Pear failures. Check key disappearance/reassignment and unsupported Multi Action visibility.
3. OpenDeck 2.14.0 Linux keys/Plus, same-file import/native WebView and separate Flatpak loopback/persistence; optional macOS/minimum-6.4 host if claimed.
4. Extension signed-in native normal/Shuffle Play against native baselines: same/different playlist, off/on/unknown Follow, modern/legacy/localized/private/empty controls, first audible track/queue and lifecycle unknown outcomes. A dispatch acknowledgment or first track chosen by chance is insufficient.
5. German/French native-speaker review, Unicode text and icon/glyph readability on real displays. Record exact plugin/Pear commits and sanitized evidence for every Pass/Fail/Blocked; leave unavailable platforms unverified.

Known boundaries: stock Pear can expose incomplete cold cached state and does not push ratings; same-track external ratings can be stale. Some legacy queues cannot turn shuffle off. An established silent half-open WebSocket has no application heartbeat/constant polling, so recovery waits for observable failure. Native normal queue reuse can reject safely. Host title/icon overrides, unmeasured glyph widths and lack of disk-write acknowledgment require acceptance. Dynamic host-stack mutation is not portable in this runtime; the local selector is deliberate. No unresolved stage-caused automated defect or known npm finding remains; that does not certify host/native behavior or future advisories.

## Research and continuation

Primary records: [architecture/source audit](ARCHITECTURE_AUDIT.md), [Stage 3 native spike/contract](PLAYLIST_API_SPIKE.md), [Pear extension](research/pear-playlist-api-extension.md), [dial/OpenDeck SDK](research/stream-deck-plus-sdk.md), [PI SDK](research/property-inspector-sdk.md), [playlist settings](research/playlist-settings.md), [Track Info display](research/track-info-display.md), [ratings](research/like-dislike-behavior.md), [repeat](research/repeat-behavior.md), [standard actions](research/standard-key-actions.md), [assets/license](research/assets-and-licensing.md), [packaging](research/elgato-build-and-packaging.md), [final audit/dependencies](research/final-audit-and-dependencies.md), [localization inventory](LOCALIZATION.md) and [checkpoints](checkpoints/stage-09.md).

After physical testing, commit actual results, fix observed defects with useful regression tests, and rerun relevant clean gates. Update status/matrix/handoff and the PR before review. Choose a public version/release and merge only with separate authorization; similarly request permission before an upstream Pear PR. There is no automatically authorized Stage 10. Preserve the unchanged original MIT notice, XeroxDev attribution and upstream Git history.
