# Manual testing

Stage 2 physical test status: **not run**. The 39 automated client/host tests pass. They use mocked networking and browser VM contexts. They do not establish real Pear, Elgato/OpenDeck, WebView, or device operation. The remaining action/dial/playlist sections are future acceptance tests.

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

Run these future acceptance tests against the separately recorded D013 Pear extension build and the later playlist client. Unmodified Pear 3.12.0 must show the documented unsupported-feature result for the missing route. Stage 3 contains neither component.

1. Test raw playlist IDs and accepted YouTube Music/YouTube URLs, including extra query fields. Test invalid URLs/hosts, embedded credentials, malformed encoding, missing/duplicate list IDs, private/unavailable playlists, albums where applicable, and empty playlists.
2. Verify each startup mode: Follow with shuffle off/on, Always Normal, and Always Shuffle. Test Follow with unavailable state: one bounded refresh or a state error, with no guessed start. Repeat from another currently playing playlist and from the same playlist/first track, with current shuffle both off and on. Always Normal must replace an old shuffled order; a pause/resume or queue-selection shortcut is insufficient.
3. Capture the resolved native command kind and dispatch path in safe debug evidence. Redact account/tracking data. Confirm the operation matches YouTube Music's native control, preserves opaque fields, and resolves before playback. Confirm header selection cannot pick related, radio/mix, or queue-add commands. Check supported modern command entities and non-English UI.
4. Observe the first audible track and player/queue events. For Shuffle Play, confirm there is no normal-start command, preliminary wrong track, post-start shuffle workaround, or forced skip.
5. A native shuffle may select the original first track by chance. That alone is not a failure or proof of success. Validate the command and queue semantics directly.
6. Force native endpoint/handler resolution to fail. Confirm a clear 501 with no fallback playback. Test 400/401/409/422/502/503/504 and the success dispatch-only result against D013. A 200 is not proof of audible playback.
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
