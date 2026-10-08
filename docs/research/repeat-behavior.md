# Repeat behavior

Investigated for Stage 4 on 2026-10-04: native cycle order, request body, and confirmation.

## Sources and versions

- Pear Desktop 3.12.0, commit [`3f599b42724be827db51cd4689996dc3e48a9561`](https://github.com/pear-devs/pear-desktop/tree/3f599b42724be827db51cd4689996dc3e48a9561).
- [`src/plugins/api-server/backend/routes/control.ts`](https://github.com/pear-devs/pear-desktop/blob/3f599b42724be827db51cd4689996dc3e48a9561/src/plugins/api-server/backend/routes/control.ts): `GET /repeat-mode`, `POST /switch-repeat` with `iteration`.
- [`src/renderer.ts`](https://github.com/pear-devs/pear-desktop/blob/3f599b42724be827db51cd4689996dc3e48a9561/src/renderer.ts): invokes the native player bar's `onRepeatButtonClick` once per iteration.
- [`src/providers/song-info-front.ts`](https://github.com/pear-devs/pear-desktop/blob/3f599b42724be827db51cd4689996dc3e48a9561/src/providers/song-info-front.ts) and [`WebSocket route`](https://github.com/pear-devs/pear-desktop/blob/3f599b42724be827db51cd4689996dc3e48a9561/src/plugins/api-server/backend/routes/websocket.ts): read actual queue repeat mode and push `REPEAT_CHANGED`.
- Native [application script](https://music.youtube.com/s/a2c50912/music_polymer_inlined_html.js), revision `a2c50912`, SHA-256 `88730ffc80ae625375b67c63888a23c134c886e350f7c74fba26576adec83beb`, 4,914,651 bytes. Player-bar cycle array near byte 3,594,003; click handler near 3,602,421. A second player-bar variant uses the same order.

## Conclusions and implementation

The native cycle is `NONE → ALL → ONE → NONE`. The handler advances the index in that array and dispatches the resulting repeat mode through the native controller. Stage 4 sends `{ "iteration": 1 }` to `/switch-repeat` once per accepted activation. It never sends a guessed target-mode body.

The shared client serializes repeat activations by rejecting overlapping presses while confirmation is outstanding. It displays `REPEAT_CHANGED` values only, with one bounded `/repeat-mode` read if no expected update arrives within two seconds. A 204 does not change the displayed mode. Unconfirmed commands alert without replay.

Each mode gets a distinct generic SVG and label (Off/All/One) through `setImage` and `setTitle`. The host protocol documentation only promises state indices 0 and 1, so Stage 4 avoids D002's provisional third numeric host state. All three Pear modes remain explicit in the model.

## Assumptions and unresolved questions

The website can disable repeat for some content and can change independently of Pear. Source tracing establishes the inspected cycle; it does not replace live acceptance on Pear/Elgato/OpenDeck. Test starting from each mode, repeat-disabled content, duplicates, timeouts, and external changes. No Pear source change was made.
