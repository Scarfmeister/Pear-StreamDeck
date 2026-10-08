# Pear Desktop Connector — final engineering handoff

Stage 9 completed the automated audit and opened the fork PR. The Windows-version correction remains in place: minimum **10** covers Windows 11's reported 10.0. Subsequent real Windows acceptance found that PI messages used the action instance context and were rejected by Stream Deck. [Manual bug fix 02](checkpoints/manual-bugfix-02-pi-context.md) restores the inherited PI registration routing, reruns all gates and supersedes the installer. Initial installation/action availability/backend startup were observed; corrected PI/approval/persistence acceptance is **Pending**, and other device/native playback gates remain unverified. This scoped fix starts no new stage; do not merge, release or open an upstream Pear PR.

## Repository and exact revisions

| Item | Value |
| --- | --- |
| Plugin repository | [Scarfmeister/Pear-StreamDeck](https://github.com/Scarfmeister/Pear-StreamDeck) |
| Default / development branch | `master` / `dev/pear-port` |
| Unchanged default baseline | `8b0c3320ce59b741b3165a1c8ac3a54b66c2c97a` |
| Final tested implementation SHA | **`23cf3daa14d45a27310551d7ee727bdfaceba587`** |
| Fork PR | **[PR #1](https://github.com/Scarfmeister/Pear-StreamDeck/pull/1)**, `dev/pear-port` → `master`, open and unmerged |
| Implementation CI | [PR #1 checks](https://github.com/Scarfmeister/Pear-StreamDeck/pull/1/checks), verified at the pushed fix/closing head; exact local rerun in the bug-fix checkpoint |
| Pear repository / branch | [Scarfmeister/pear-desktop](https://github.com/Scarfmeister/pear-desktop) / `feature/streamdeck-playlist-api` |
| Pear extension SHA | **`b5f13f65c71ca8890c08f52c7d7becde5d855be9`** |

The closing `docs: record PI context bug fix and Windows retest` commit updates these records after the tested PI correction. Starting head was `4115640764a1ac449c0fa1bac9c7da34b1a6607e`; the previous Windows fix is `25e63d4906519ea57a1ea2d4bb73eb905284d65e`. A commit cannot embed its own SHA. Retrieve the exact closing documentation commit with `git log -1 --format=%H --grep='^docs: record PI context bug fix and Windows retest$' origin/dev/pear-port`; inspect `gh pr view 1 --repo Scarfmeister/Pear-StreamDeck --json headRefOid` for the PR's head. The authorized fix verifies equality before stopping. Use the tested implementation SHA above for code/package evidence; closing documentation does not change runtime resources.

Read [AGENTS.md](../AGENTS.md), [PROJECT_SPEC.md](PROJECT_SPEC.md), [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md), [DECISIONS.md](DECISIONS.md), [REQUIREMENTS_STATUS.md](REQUIREMENTS_STATUS.md), [MANUAL_TESTING.md](MANUAL_TESTING.md), [Stage 9](checkpoints/stage-09.md), [Windows correction](checkpoints/stage-09-windows-version-fix.md) and [PI bug fix](checkpoints/manual-bugfix-02-pi-context.md) before changing anything. Earlier checkpoints/source maps are historical evidence. Fetch/pull and confirm a clean `dev/pear-port`; preserve history/MIT and push only to the fork.

## Architecture and supported behavior

This remains the locked `streamdeck-typescript` 3.3.4 SDK 2 HTML/browser plugin. `src/pear-plugin.ts` owns one `PearSession`, one `PearClient` and the key/dial controllers. `src/pear/` separates REST, auth, WebSocket parsing/state, reconnect, confirmed commands and playlist startup. `src/streamdeck/pear-session.ts` owns endpoint-bound global settings and token persistence. `src/pear-pi.ts` communicates through plugin messages; it opens no Pear socket/REST connection. Commands never update the model optimistically and are never replayed after recovery.

REST uses Pear API v1 and bearer authorization; WebSocket `/api/v1/ws` uses Pear's encoded query-token contract. The state model merges actual PLAYER_INFO, video, player, position, volume, repeat and shuffle updates; rating gaps use bounded reads. Closed/failed connections use bounded exponential retry; generations cancel obsolete work. A socket opening alone does not establish a usable snapshot. Error/status/log text is safe, and credentials are confined to global storage/required transport.

- **12 key actions:** Play/Pause, Next, Previous, Like, Dislike, Mute, Volume Down, Volume Up, Track Info, Shuffle, Repeat and Play Playlist. Displays use actual playback/mute/rating/shuffle/repeat state. Repeat is NONE → ALL → ONE → NONE, with three distinct images. Volume steps are whole 1–100%, default 5%, with clamping and safe old-setting defaults.
- **Property Inspectors:** centralized host/port/protocol/auth status/Reauthorize; per-action steps; all five Track Info formats; canonical playlist ID/startup modes; selector list and bounded optional images. Inherited PI methods use the registration UUID for outbound commands; `sendToPlugin` retains the action UUID, and incoming action settings match the action instance context. Invalid edits do not save; updates preserve drafts and unrelated fields. The five routing regressions pass; Windows retest remains pending.
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

**Artifact:** `build/io.github.scarfmeister.pear-streamdeck.streamDeckPlugin`. The fresh PI-corrected ZIP has **59 files /381,053 unpacked bytes**, SHA-256 **`00b598c005aa3f2938219ae926d689da19ceb4611af00dbe63a35ccd595068ac`**. ZIP timestamps can change archive hashes on rebuild; the validator verifies resources, manifests/Linux view, states and MIT. The installer is ignored, not committed or published. Successful CI uploads the `streamdeck-plugin` development artifact; extract its outer ZIP and verify the run's commit before testing. There is no public release. Version 2.3.0 /manifest 2.3.0.0 remains an inherited development identifier.

The PI correction rerun passes a clean locked install, source/JS audit, source/test type checks, **129 individual tests across 11 files**, locale validation, browser build, official validation/packing and real archive checks. Full npm audit reports **zero findings**. The only CLI warning remains Category Pear Desktop /Name Pear Desktop Connector. [Bug-fix checkpoint](checkpoints/manual-bugfix-02-pi-context.md) records exact commands, the five tests' red/green evidence and limits; earlier checkpoints remain historical. Original MIT/spec/agent instructions remain byte-identical.

## Pear configuration and authentication

Standard controls target the source-reviewed **Pear Desktop 3.12.0** native API. Later versions require compatibility checks. In Pear, enable **Plugins → API Server [Beta]**, then configure **Hostname `127.0.0.1` / Port `26538`** in its submenu. Pear's own default bind is `0.0.0.0`; explicit loopback avoids needing LAN exposure. For this local setup leave HTTPS off. The connector defaults to HTTP, host `127.0.0.1`, port `26538`.

Place a key/dial, open its PI and save the matching endpoint. With **Authorize at first request** (`AUTH_AT_FIRST`), approve the one request from `io.github.scarfmeister.pear-streamdeck` in Pear. The connector stores the returned token in host global settings, bound to that endpoint, and reuses it on restart. Wait for Connected and actual state. Denied/interrupted/revoked approval requires explicit **Reauthorize**; no prompt loop or token display is intended. Saving a new origin clears old credentials/work. `NONE` (No authorization) works without an approval/token; a previously accepted bearer alone cannot reveal that server strategy. The initial Windows PI controls failed at host routing before reaching the plugin; corrected plugin approval/persistence must be retested. Do not copy the manual diagnostic token into plugin settings/code/tests.

Manifest OS minima are Windows **10** /macOS **13**. Windows 10/11 share numeric version 10.0; intended current-host testing remains Windows 11 under host requirements. Metadata admission does not verify Windows 10 operation. Open the corrected installer in Windows/macOS Stream Deck; in OpenDeck select **Install from file**. The same package has a native-HTML/PNG Linux override. The user observed prior corrected-package installation/actions/backend on Windows 11 Pro 25H2 /10.0.26200 with Stream Deck 7.4.2.22730; this does not verify the new PI fix, device controls, macOS or OpenDeck. See the manual matrix for the limited evidence and pending retest.

## Separate Pear playlist dependency

**Both normal playlist execution and native Shuffle Play require the separate Pear extension commit above.** Stock 3.12.0 lacks the route; it must visibly show Update Pear. Other controls and playlist configuration/selection remain independent.

In a separate Pear checkout, use `feature/streamdeck-playlist-api` at `b5f13f65c71ca8890c08f52c7d7becde5d855be9`; Node 24/pnpm 11 with `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm start`. Sign in, load the player and configure the API. The branch still reports 3.12.0; record the commit, not only that version. Stage 9 verified the remote branch/fork relationship and clean checkout without changing Pear or opening an upstream PR.

The extension adds general-purpose protected **POST `/api/v1/play-playlist`**, strict JSON `{"playlistId":"PLexample123","shuffle":true}` with existing Pear auth. A broker and renderer adapter resolve the requested playlist's supplied native Play/Shuffle Play control through the signed-in network manager, preserve its opaque command, and dispatch once before playback. Deadline/correlation/generation/main-frame/permit/cancellation guards bound the operation. A matching 200 means dispatch acknowledgment, not audible success; real Pear updates drive the display. Missing/unsupported/ambiguous cases reject safely; unknown outcomes are not retried. Follow reads actual current shuffle; Always Normal/Shuffle request that native mode. There is no normal-start → shuffle → skip workaround.

Unsafe legacy normal reuse of an already shuffled same-playlist queue returns 501 before dispatch. Modern/localized/private native layouts, first audible track, queue replacement and native metrics require live evidence. Pear Stage 7 ran 39 tests/type/build/API lint and a launch smoke test; its aggregate formatter had 17 inherited failures and lint 17 inherited warnings. Those are historical baseline results, not a Stage 9 full-suite rerun. The exact contract, paths, fixture boundaries and upstream plan are in [extension research](research/pear-playlist-api-extension.md).

Recommended upstream plan: after signed-in acceptance, rebase/revalidate against current Pear upstream, refresh native fixtures when necessary, rerun Pear's tests/type/lint/build and disclose baseline/safety constraints. Then seek explicit authorization to open a focused general-purpose Pear API PR. Do not merge the branch into upstream or open that PR now.

## Remaining acceptance and known limits

The [42-row matrix](MANUAL_TESTING.md#stage-8-release-validation-matrix) remains the acceptance gate. Initial Windows installation/backend evidence is a limited observation; connection/authentication PI routing failed. **Corrected retest is Pending**; other scenarios/platforms remain Not run. Prioritize:

1. Follow the exact [Windows PI routing retest](MANUAL_TESTING.md#windows-pi-routing-retest): install/restart the fresh package, verify initial settings/status, Save Connection, Reauthorize/approval, action Save/readback and host-restart persistence; ensure none of the three wrong-context warnings recur. Then normal keys, revoke/NONE, Pear/API restart and reconnect, all real state-aware actions and independent settings.
2. Stream Deck Plus volume/transport signed detents, release press, touch feedback, selector wrapping/images/position/drafts and stock-Pear failures. Check key disappearance/reassignment and unsupported Multi Action visibility.
3. OpenDeck 2.14.0 Linux keys/Plus, same-file import/native WebView and separate Flatpak loopback/persistence; optional macOS/minimum-6.4 host if claimed.
4. Extension signed-in native normal/Shuffle Play against native baselines: same/different playlist, off/on/unknown Follow, modern/legacy/localized/private/empty controls, first audible track/queue and lifecycle unknown outcomes. A dispatch acknowledgment or first track chosen by chance is insufficient.
5. German/French native-speaker review, Unicode text and icon/glyph readability on real displays. Record exact plugin/Pear commits and sanitized evidence for every Pass/Fail/Blocked; leave unavailable platforms unverified.

Known boundaries: stock Pear can expose incomplete cold cached state and does not push ratings; same-track external ratings can be stale. Some legacy queues cannot turn shuffle off. An established silent half-open WebSocket has no application heartbeat/constant polling, so recovery waits for observable failure. Native normal queue reuse can reject safely. Host title/icon overrides, unmeasured glyph widths and lack of disk-write acknowledgment require acceptance. Dynamic host-stack mutation is not portable in this runtime; the local selector is deliberate. No unresolved stage-caused automated defect or known npm finding remains; that does not certify host/native behavior or future advisories.

## Research and continuation

Primary records: [architecture/source audit](ARCHITECTURE_AUDIT.md), [Stage 3 native spike/contract](PLAYLIST_API_SPIKE.md), [Pear extension](research/pear-playlist-api-extension.md), [dial/OpenDeck SDK](research/stream-deck-plus-sdk.md), [PI SDK](research/property-inspector-sdk.md), [PI context correction](research/property-inspector-context-routing.md), [playlist settings](research/playlist-settings.md), [Track Info display](research/track-info-display.md), [ratings](research/like-dislike-behavior.md), [repeat](research/repeat-behavior.md), [standard actions](research/standard-key-actions.md), [assets/license](research/assets-and-licensing.md), [packaging](research/elgato-build-and-packaging.md), [final audit/dependencies](research/final-audit-and-dependencies.md), [localization inventory](LOCALIZATION.md) and [checkpoints](checkpoints/stage-09.md).

After physical testing, commit actual results, fix observed defects with useful regression tests, and rerun relevant clean gates. Update status/matrix/handoff and the PR before review. Choose a public version/release and merge only with separate authorization; similarly request permission before an upstream Pear PR. There is no automatically authorized Stage 10. Preserve the unchanged original MIT notice, XeroxDev attribution and upstream Git history.
