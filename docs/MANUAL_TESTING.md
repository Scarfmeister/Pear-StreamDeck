# Manual testing

Stage 7 acceptance status: **signed-in native playback and Elgato/OpenDeck/device tests not run**. The plugin's 105 automated tests and Pear's 39 tests pass, including Pear's Electron launch smoke test. The optional integration uses real loopback HTTP and the actual route/broker/adapter/client with simulated native state. The extension is implemented in the separate [Pear commit `b5f13f6`](https://github.com/Scarfmeister/pear-desktop/commit/b5f13f65c71ca8890c08f52c7d7becde5d855be9); stock Pear remains unsupported for playlist startup. Dedicated keys/dials still share one Pear client. See [the complete contract and evidence](research/pear-playlist-api-extension.md).

| Evidence | What is established | What remains unverified |
| --- | --- | --- |
| Automated plugin tests and official CLI | Signed rotation/press/touch routing, real-state feedback, settings, wrapping/persistence messages, bounded queues, manifest and layout resources | Host execution, disk persistence, rendered glyphs/pixels, native playback |
| Pear unit suite, Electron launch, and cross-repository HTTP integration | Authentication, strict route, correlation/permit/cancellation, native command fixtures/event acknowledgment, error contract, and client dispatch | Signed-in layouts, actual native handlers, queue/audio startup, listening metrics |
| Pinned OpenDeck 2.14.0 and renderer source | Expected support for the same events, custom layouts, object indicators, and embedded raster feedback | Installed OpenDeck/device operation, including WebView/Flatpak behavior |
| Physical host/device sessions | None performed | All steps below; Linux packaging still needs the later override under D008 |

See [SDK/runtime source verification](research/stream-deck-plus-sdk.md), D016, and D017. Do not convert source expectations, an Electron launch, or a simulated 200 dispatch into physical compatibility/playback passes.

## Stage 7 extension acceptance

1. Build the separate Pear fork at the recorded commit on `feature/streamdeck-playlist-api` with its frozen lockfile. Record the exact plugin and Pear commits, OS, account/layout, auth strategy, and host/device. Enable API Server on `127.0.0.1:26538`; do not infer endpoint availability from version 3.12.0 alone.
2. Verify the existing approval/JWT/authorized-client flow and `NONE` mode. Check the new OpenAPI route and strict ID/boolean JSON. Unauthorized, malformed, overlapping, unavailable, and unsupported requests must return the documented status without starting a playlist. Never capture tokens, account data, opaque command contents, or token-bearing URLs in public evidence.
3. Run **Native playlist startup** below with public, signed-in/private, unavailable/empty, legacy, modern entity-based, and localized layouts where available. Compare native Play and Shuffle Play with both key and selector. Check actual first audible track and queue/shuffle state; a dispatch acknowledgment alone does not pass.
4. With a shuffled queue of the same playlist, exercise Always Normal and Follow off. A legacy video watch command that could reuse that order must show Unavailable / 501 with zero new startup. Record this limitation rather than marking normal playback passed. A supplied native watch-playlist fresh-queue command must prove normal order in live acceptance before shipping.
5. Disable/re-enable/rebind the API after the player has loaded. Change authentication/config, revoke the client, reload/crash/close the renderer, and cancel or delay HTTP/browse before and after a permit. Confirm no late pre-permit playback, stale IPC result, extra listener, reconnect retry, or duplicated start. A post-permit unknown outcome must remain unknown and must not be retried automatically.
6. On stock Pear, verify Update Pear on the key/selector with a compatible-build explanation in the PI. On this build with missing/ambiguous controls or an unhandled event, verify Unavailable and no fallback. Check 502/503/504 before/after permission: known pre-dispatch failures reject, unknown outcomes warn that playback may have started. Displays must continue following actual Pear state.
7. Record signed-in native and hardware results separately. Pear's aggregate formatter still has 17 documented inherited failures; Stage 7 files and source/test type checks are clean. No upstream contribution/release acceptance is implied by the branch or automated tests.

## Stage 6 encoder acceptance

1. Record the complete test matrix below. On Elgato Windows/macOS with Stream Deck Plus, install the Stage 6 package and place all three dedicated Encoder actions. On OpenDeck, record its version/installation method and establish the correct HTML launch path; native Linux installation is still a later packaging gate. Verify no additional Pear socket/approval appears when adding dials or opening their PIs.
2. Volume Dial: verify default 5%, independent steps 1/2/5/10/100 on two contexts, invalid/old settings fallback, and strict invalid edit rejection. Rotate clockwise/counter-clockwise, including batched/rapid alternating detents; test 0/1/99/100 and external Pear changes between inputs. Confirm clamping and latest confirmed volume, no optimistic target/bar, and no repeated command at a bound.
3. Press Volume once: true mute/unmute, including nonzero volume and volume zero. Change mute externally. Verify label/icon/volume/indicator from real state; overlapping toggles alert as busy. HTTP acceptance alone must not change the display. Unknown/offline volume hides the indicator and shows `?`; authorization status is explicit.
4. Transport Dial: one Next per clockwise detent and Previous per counter-clockwise detent, including multiple signed ticks, while playing, paused, or stopped. Press once for actual play/pause; verify external state/track changes update title/artist/status and icon. Commands must not wait for position ticks. No track and unknown playback have explicit displays.
5. Rotate Transport rapidly. Verify the sixteen-waiting-tick bound and rejection of oversized batches. Force a request error/disconnect, switch profiles, replace a visible context, or close the host while work waits. Only already dispatched work may finish; unsent ticks must be discarded and never replayed on reconnect. Observe API rate/alerts and record usability under real host batching.
6. Playlist Selector PI: add up to sixteen named entries with raw IDs/accepted URLs and all startup modes. Save normalizes IDs; reopen/restart to verify real disk persistence. Reject blank/overlong names, invalid inputs/modes, and unsupported images without writing. Remove entries and save an empty list. Configure independent duplicate selectors; rotation must not rewrite global settings.
7. Rotate Selector without playback: signed batches, wrap in both directions, empty/one/multiple entries, invalid slots, huge/invalid old indices, list shrink/removal/reorder. Confirm name/index/count/mode, independent indices, restoration on profile change/restart, and position-preserving/clamped list edits. Make unsaved PI edits, rotate, then save; the latest selection must survive and the draft must remain intact.
8. Load a small valid PNG/JPEG (≤24 KiB), verify preview and selected dial image. Reject a bigger file/wrong MIME/invalid data; clear the image and select an entry without one to verify default-icon restoration. Test malformed persisted images, host decoder failures, custom host icon overrides, and persistence after restart. No remote image/file-path fetch is expected.
9. On stock Pear 3.12.0, press a valid entry in each mode. Expect one `/play-playlist` request, an alert, “Update Pear”, and an open-PI compatible-build explanation. No fallback or fabricated playback/shuffle state is allowed. Offline selection still works; offline press sends no startup. With the recorded Stage 7 extension, run native startup acceptance below and verify Follow captures external shuffle at press time, plus both Always modes, explicit native 501 limits, and unknown-state handling.
10. Short touch refreshes the current feedback once; hold does nothing. Neither touch nor `dialDown` may toggle mute/playback/start a playlist. Verify actual tap/hold/down/up ordering on both hosts, including touch while turning/pressing. Render `$B1` and custom `dial-layout.json` on all four segments.
11. Clear custom host titles/icons, then test overrides intentionally. Check long/wide/non-Latin names and metadata, ellipsis, 200×100 geometry, image fit, paused displays, and accessibility/readability. Changes limited to position ticks should not flood feedback. Confirm inherited `.play-pause` and `.volume-up` Encoder profiles act as Transport/Volume aliases and their Keypad behavior remains intact.
12. Repeat authorization/endpoint/restart/profile/host-close checks with keys and all dials visible. Observe one Pear connection, no stale context updates/timers/replayed commands, and token-free status/logs. Record real results and failures separately for Elgato, OpenDeck, and Flatpak; do not mark unrun hosts passed.

## Stage 5 historical acceptance status

Stage 5 supplied 82 automated tests and no dedicated encoders. Its real-host acceptance remains unverified; the settings checks below still apply. Stage 6 replaces its pending encoder preview with the shared dedicated handlers/legacy aliases.

## Stage 5 Property Inspectors and settings

1. Record the versions/device/auth strategy below and install the current development package. Open each action's PI. Common connection settings should appear everywhere; volume/Track Info/playlist/selector settings should appear only on their actions. Reopening PIs must not create extra Pear connections or authorization requests.
2. Verify global defaults `127.0.0.1`, `26538`, HTTP, connection status, and token-free authorization status. Approve once, restart the host, verify token reuse; test `NONE`, revoked/denied authorization, Reauthorize, and endpoint changes as in the retained connection checks. No token or bearer/WS URL should appear in forms/status/logs.
3. Enter an invalid host/port and Save connection. Verify a clear error and editable input retained for correction. Save valid settings, confirm normalized values/status and persistence after closing/reopening/restarting. Incoming retry/state updates must not erase unsaved connection input.
4. Volume Up/Down: configure independent steps 1/2/5/10/100; Save and verify the next press, duplicate contexts, limits 0/100, and persistence across profiles/restarts. Try blank/decimal/zero/negative/>100 edits: error, no settings write, previous saved value stays active. Inject old/malformed saved values if the host permits it: safe 5% fallback and editable default. No action Save should change global connection settings.
5. Track Info: save all five formats, check one/two/three centered lines at the default font, long/wide Unicode, missing metadata/album, and paused tracks. Change one of two duplicate keys; only that key's format changes. Confirm external tracks update both. Clear custom host titles and enable Show Title; verify the documented font/visibility limits. A static image remains intentional; no artwork acceptance is claimed.
6. Play Playlist: save a raw ID, Music playlist URL, YouTube watch URL with `list`, and short watch URL with `list`. Confirm the field displays/stores the extracted ID, preserves case, and persists the selected mode. Defaults should be Follow. Try wrong host/path/scheme, credentials, duplicate/missing list, bad encoding, whitespace/invalid ID: clear error, no settings write/playback. Verify a legacy URL plus stale ID normalizes to the URL's ID on explicit Save; an invalid URL must not start the older ID.
7. On unmodified Pear 3.12.0, press a configured playlist in each mode. Expect one request to the documented route, no fallback, an alert and “Update Pear” on the key, with the compatible-build requirement in an open PI. Confirm no song/queue/shuffle change is fabricated. This is the expected unsupported result; it is not a native-playback pass. Offline keys must show offline and submit no startup.
8. Verify unsaved per-action edits survive incoming settings/status events. Save one action, switch/reopen its PI, verify host record persistence; test host shutdown/profile change during a pending request and stale responses. Host write submission/readback is not proof of disk persistence without the restart check.
9. With the recorded Stage 7 Pear extension, run **Native playlist startup** below. Test captured Follow off/on, both Always modes, unknown-state refusal, a dispatch-only 200, real unavailable/error cases, native first audible track/queue semantics, and absence of normal→shuffle→skip. Do not mark this passed from fake-contract unit tests.

Stage 4 key acceptance remains unverified. The historical Stage 4 package had 62 tests and no per-action editor/playlist interface; use Stage 5's settings checks above together with the standard-key behavior checks below.

## Stage 4 standard-key acceptance

1. Record the versions/device/auth strategy using the test record below. Enable Pear's API Server and authorize the connector. Confirm all eleven keys work on a supported host; a socket open alone must not mark them ready.
2. Play/Pause: start, pause, stop, and resume from Pear. Verify Play/Pause images on two duplicate keys and after switching profiles. Activate once per press; a fast overlapping press while awaiting confirmation should alert as busy. No host automatic image toggling is allowed.
3. Next/Previous: verify one normal transport command per release. Track Info displays title + artist with bounded lines, preserves both while paused, and toggles playback when pressed. Check long Unicode text, no track, absent artist/album, and legibility at the default font size. Stage 4 uses a static image; artwork is deferred.
4. Like/Dislike: start from INDIFFERENT, LIKE, and DISLIKE. Verify native same-state clearing to INDIFFERENT, opposite-state switching, and refreshed real icons. On unmodified Pear, same-track external changes can remain stale until a bounded rating refresh. Test slow cache updates, signed-out/unavailable controls, and a track change during the read.
5. Mute: verify true mute with both nonzero volume and volume zero, external mute changes, and duplicate contexts. Neither key press nor a 204 should assume success.
6. Volume: default 5%; stored `steps` 1/2/5/10 are honored. The Stage 5 PI adds the editor described above. Verify clamping at 0/1/99/100, alternating rapid presses from two keys, external volume changes between inputs, and no extra commands at a bound. Unconfirmed/failed commands must alert, preserve actual volume, and discard waiting input. Reconnect must not replay it.
7. Shuffle: verify off/on gray/white images and real off→on→off transitions. The inspected native server-queue path toggles both ways; a legacy path may only reorder. If an off press stays on, the key must remain On and alert after bounded confirmation. Record that upstream behavior for the separate Pear extension; do not mark the off requirement passed.
8. Repeat: verify NONE→ALL→ONE→NONE from every starting mode. Images and Off/All/One labels must be distinct. Test disabled repeat, external changes, duplicates, slow/no events, and reconnect without command replay.
9. Disconnect/disable/restart Pear; keys show offline until a fresh snapshot. Switch profiles repeatedly and close the host during an active command. Confirm no obsolete-context display updates, extra sockets, retained command timers, or error/request floods. Pear-pushed fields must not be polled continuously.
10. Stage 4 Playlist displayed “Pear API required” without a start request; Stage 5 supersedes that preview with the guarded request/settings described above. Stage 6 replaces inherited “Dials pending” slots with shared encoder aliases; encoder input must still not activate key commands. The connection PI should accurately describe the current controls.

No running signed-in Pear instance, Elgato/OpenDeck host, or physical Stream Deck was available in the Codex workspace. These are unverified acceptance checks, not observed failures or passes.

Stage 2 physical test status: **not run**. Its 39 automated client/host tests pass and remain in the complete Stage 4 suite. They do not establish real Pear, Elgato/OpenDeck, WebView, or device operation. Dedicated dial/playlist and full settings acceptance remain future checks.

Stage 3 native playlist test status: **not run**. Public playlist data and native website source were read without starting playback. Pear 3.12.0 lacks the needed route. See `PLAYLIST_API_SPIKE.md` and D013 in `DECISIONS.md` for the separate extension plan; do not install this checkpoint expecting playlist control.

## Stage 2 connection preview

Use the Stage 2 development package only to test the shared connection foundation. Actions show “Actions pending” and do not control playback. The connection panel is currently English only.

1. Enable the Pear 3.12.0 API Server on `127.0.0.1:26538`. Open any connector PI. Confirm the client starts only after host global settings load.
2. With `AUTH_AT_FIRST` and no stored Pear token, confirm exactly one approval request with ID `io.github.scarfmeister.pear-streamdeck`. Approve it and confirm Connected/Authorized. A socket open before `PLAYER_INFO` must not report Connected.
3. Restart Stream Deck/OpenDeck while Pear remains open. Confirm token reuse, preserved unrelated global fields, and no new approval. This specifically verifies host persistence beyond the mocked `setGlobalSettings` tests.
4. Deny approval, close the host during approval, or let approval time out. Confirm no prompt loop after restart. Use Reauthorize to recover. A timed-out local request cannot dismiss Pear's still-open dialog; record its behavior and close it before retrying.
5. Revoke authorization/change the Pear secret. Confirm 401/403 or WS 1008 clears the credential, stops automatic retries, and offers Reauthorize.
6. Test `NONE` with no credential: no approval request; Connected/Authentication disabled. If a valid saved credential exists, the client reports Authorized because a successful bearer probe cannot reveal the server's strategy.
7. Start the host before Pear, disable/re-enable the API Server, and restart Pear. Confirm bounded retries, one current Pear socket, and snapshot recovery. An idle silent half-open TCP connection has no supported application heartbeat and needs separate observation.
8. Change host/port/protocol. Confirm old requests/socket stop and no old endpoint token is sent to the new endpoint. Save invalid values and confirm repair is possible. Test HTTPS with a normally trusted certificate if needed.
9. Open two PIs and close/reopen them. Confirm no extra Pear approval/socket and current status. Inspect logs and PI status messages for credential leakage and error floods.
10. Record actual results here. Do not mark any key/dial/playlist acceptance as passed from this foundation preview.

## Test record

For each session record: plugin commit/version, Pear version and extension commit if any, host/version (OpenDeck or Elgato), OS, device model, installation method, API auth strategy, and result. Redact tokens and token-bearing URLs from evidence. Keep expected behavior and actual behavior separate.

Planned host matrix:

| Host | Device | Minimum acceptance |
| --- | --- | --- |
| Elgato Stream Deck on Windows/macOS | Normal keys / XL | All 12 key actions, settings, artwork, state, and reconnect. |
| Elgato Stream Deck on Windows/macOS | Stream Deck Plus | All keys and dedicated Volume, Transport, Playlist Selector dials. |
| OpenDeck 2.14.0 or later on Linux | Normal keys / XL | Native installation, all 12 actions, PI, token reuse, reconnect. |
| OpenDeck 2.14.0 or later on Linux | Stream Deck Plus | Rotate/press/touch events, feedback layouts, all dedicated dials. |
| OpenDeck Flatpak on Linux | Available devices | Webview networking to local Pear, PI settings, artwork, persistence. |

## Installation and local API

1. Install the later Pear build beside the original YTMD plugin. Confirm separate namespace, category, and settings.
2. Confirm Pear API Server starts disabled by default. Enable it and bind it to `127.0.0.1`, port `26538`. Confirm local control works without LAN access.
3. Confirm installation works on OpenDeck without Wine. Inspect the merged Linux override and loaded HTML entry point.
4. Check icons and text on physical keys. Confirm no proprietary Google/YouTube logo is shipped as plugin branding.

## Authorization and restart

1. Clear the plugin's Pear token and remove its client authorization in Pear. Connect with `AUTH_AT_FIRST`. Confirm one Pear approval prompt with the documented client ID.
2. Approve it. Confirm connected status and commands work. Restart the host while Pear remains open; confirm token reuse without another prompt.
3. Deny a fresh request. Confirm useful status, no automatic prompt loop, and a working Reauthorize button.
4. Remove the authorized client or change Pear's secret. Confirm REST 401 / WebSocket close 1008 triggers authorization status and controlled recovery.
5. Configure Pear with `NONE`. Confirm connection and commands work with no stored token or approval prompt.
6. Change host/port. Confirm the old socket closes, old callbacks stop, and the old endpoint's token is not silently reused.
7. Inspect logs: no access token, bearer header, or token-bearing WebSocket URL.

## Shared state and key actions

1. Start, pause, resume, and stop playback from Pear itself. Play/Pause must show actual state. Track Info must retain title/artist when paused.
2. Change tracks externally. Confirm all duplicate key contexts refresh, including newly shown profiles/folders.
3. Test Next and Previous. Confirm one command per key press.
4. Test Like and Dislike from INDIFFERENT, LIKE, and DISLIKE. Check documented same-state behavior against real Pear support. Verify no invented clearing transition. On unmodified Pear, record the known same-track external-rating freshness limit.
5. Toggle mute externally and through a key/dial. Confirm mute is independent of volume, including volume zero.
6. Test volume steps 1, 2, 5, and 10%; default 5%. Test at 0, 1, 99, and 100. Confirm clamping, settings persistence, and recovery after a failed command. Check rapid input from two contexts.
7. Change shuffle externally and through the key. Confirm both off→on and on→off actually work. If `queue.shuffle()` cannot turn it off, fail this requirement until the small Pear extension supplies the operation.
8. Cycle Repeat through NONE→ALL→ONE→NONE. Compare the native cycle and resulting WebSocket updates; each mode needs a distinct display.
9. Test all Track Info formats, long text, missing album, missing/broken artwork, podcasts, and non-Latin text. Confirm readable fallback and bounded image loading.

## Stream Deck Plus

1. Volume Dial: clockwise increases, counter-clockwise decreases, press toggles true mute. Confirm current volume, mute state, and progress indicator on the touch strip.
2. Transport Dial: clockwise advances, counter-clockwise goes back, press toggles playback. Confirm actual state display while paused and when controlled from Pear.
3. Rotate rapidly and pause playback before rotation. Commands must not depend on position/state ticks. Confirm no unbounded command queue.
4. Playlist Selector: configure several names/IDs/URLs, modes, and optional images. Rotate through entries without playback. Press starts only the selected entry.
5. Test empty lists, one entry, wrapping, malformed settings, duplicate selector contexts, and list edits while visible. Confirm name/index/count and selection persist as documented.
6. Test touch behavior on both hosts. Confirm any supported tap/hold action occurs once and the feedback layout renders correctly.

## Native playlist startup

Run these unperformed live acceptance tests against the separately recorded Stage 7/D013 Pear extension and the current shared playlist client. Unmodified Pear 3.12.0 must show Update Pear for the missing route. Stage 7's automatic route/broker/adapter/client tests pass; no signed-in native audio/queue acceptance has been performed.

1. Test raw playlist IDs and accepted YouTube Music/YouTube URLs, including extra query fields. Test invalid URLs/hosts, embedded credentials, malformed encoding, missing/duplicate list IDs, private/unavailable playlists, albums where applicable, and empty playlists.
2. Verify each startup mode: Follow with shuffle off/on, Always Normal, and Always Shuffle. Test Follow with unavailable state: one bounded refresh or a state error, with no guessed start. Repeat from another currently playing playlist and from the same playlist/first track, with current shuffle both off and on. Always Normal must replace an old shuffled order; a pause/resume or queue-selection shortcut is insufficient. The Stage 7 legacy same-playlist/shuffled guard must reject with 501 before playback; record that as a supported safety limit, not a normal-playback pass.
3. Capture the resolved native command kind and dispatch path in safe debug evidence. Redact account/tracking data. Confirm the operation matches YouTube Music's native control, preserves opaque fields, and resolves before playback. Confirm header selection cannot pick related, radio/mix, or queue-add commands. Check supported modern command entities and non-English UI.
4. Observe the first audible track and player/queue events. For Shuffle Play, confirm there is no normal-start command, preliminary wrong track, post-start shuffle workaround, or forced skip.
5. A native shuffle may select the original first track by chance. That alone is not a failure or proof of success. Validate the command and queue semantics directly.
6. Force native endpoint/handler resolution to fail. Confirm a clear 501 with no fallback playback. Test 400/401/409/422/502/503/504 and the success dispatch-only result against D013. Distinguish `not_dispatched` from `unknown`, including 503 after a permit. A 200 is not proof of audible playback.
7. Compare native menu Shuffle Play with connector startup. Record any uncertainty about listening metrics; do not infer them from track order alone.
8. Delay browse beyond the deadline, abort before/after the permit, overlap two presses, reload the renderer, rebind/disable/re-enable the API, and restart Pear. Confirm stale/expired work cannot obtain a permit, one active request, released listeners, and no retry/replay. After a granted permit, record an unknown result as unknown; do not claim cancellation prevented native playback.

## Connection recovery and cleanup

1. Start the host before Pear. Start Pear later. Confirm bounded reconnect and correct state recovery.
2. Disable/re-enable the API Server. Restart Pear. Drop the WebSocket connection. Confirm one socket/reconnect timer and a fresh snapshot after recovery.
3. Make REST calls fail or timeout. Confirm concise alerts and no falsely confirmed state.
4. Open/close Property Inspectors and switch profiles repeatedly. Confirm one shared Pear connection, no extra approval prompts, and released subscriptions/timers.
5. Keep several stateful keys/dials visible for an extended session. Confirm logs, artwork cache, memory, and request rate remain bounded. Pear-pushed fields must not cause continuous REST polling.

## Release gate

Do not call the port complete until applicable client unit tests, TypeScript checking, both manifest views, packaging, and the required host/device tests pass. Record any hardware test that remains unavailable as unverified. Confirm the Pear extension requirement and commit are clear in setup documentation. Final PR creation belongs only to the authorized final stage.
