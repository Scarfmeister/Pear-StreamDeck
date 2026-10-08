# Standard key API and display findings

Stage 4 investigation, 2026-10-04. Scope: playback, shuffle, volume/mute, key state, and artwork reliability.

## Sources

- Pear 3.12.0 commit [`3f599b42724be827db51cd4689996dc3e48a9561`](https://github.com/pear-devs/pear-desktop/tree/3f599b42724be827db51cd4689996dc3e48a9561): `src/renderer.ts`, `src/providers/song-controls.ts`, `src/providers/song-info-front.ts`, and `src/plugins/api-server/backend/routes/control.ts`, `websocket.ts` (all read from a clean audit checkout).
- Native [YouTube Music script](https://music.youtube.com/s/a2c50912/music_polymer_inlined_html.js), revision `a2c50912`, 4,914,651 bytes, SHA-256 `88730ffc80ae625375b67c63888a23c134c886e350f7c74fba26576adec83beb`. Queue `shuffle` near byte 2,674,769; server queue adapter near 2,699,526.
- Elgato [plugin WebSocket commands](https://docs.elgato.com/streamdeck/sdk/references/websocket/plugin/) and [manifest](https://docs.elgato.com/streamdeck/sdk/references/manifest/), read 2026-10-04; installed `streamdeck-typescript` 3.3.4, `dist/src/abstracts/stream-deck-plugin-handler.js` and event manager.
- Existing repository `src/actions/song-info.action.ts` and the framework's `setImageFromUrl` implementation.

## Conclusions and implementation

- Play/Pause renders Pear's `isPlaying`. Pear's `/toggle-play` renderer resumes only native state 2 and pauses otherwise; choosing `/play` for confirmed paused/stopped and `/pause` for confirmed playing handles stopped state without relying on that narrow toggle. Next/Previous send one normal transport request.
- Pear's shuffle route calls the same queue method as the native shuffle button. In the inspected website's server-queue path, the method flips actual shuffle state and resolves the current shuffle/unshuffle endpoint. It supports both directions; no Pear extension is needed for that inspected path. The legacy non-server-queue path can only reorder items and is insufficient to guarantee a displayed off transition. Stage 4 requires observed confirmation, times out with a bounded state read, and alerts if the requested transition does not occur. It never substitutes a false off state or playback workaround.
- WebSocket pushes volume and true mute. Zero volume does not imply mute. Volume inputs use confirmed volume, integer steps 1–100 (default 5), clamping, a bounded shared queue, and confirmation before the next input. No command target is displayed as confirmed. A failed or ambiguous command discards waiting inputs; reconnect does not replay them.
- REST volume/shuffle/repeat reads can race newer WebSocket events. Field revisions prevent late REST responses overwriting pushed state. These are bounded gap/confirmation reads, not polling.
- `DisableAutomaticStates: true` prevents host-driven false toggles. Protocol `setState` promises indices 0/1; `setImage` accepts local plugin files. Repeat therefore uses three explicit mode images/labels rather than an unsupported third numeric state.
- Existing artwork helpers have no timeout, bounded cache, stale-track guard, or complete canvas-error handling. Cross-origin image loading still needs WebView acceptance. Stage 4 keeps a static Track Info icon and readable title/artist text. Its pure formatter prepares Title, Artist, Title + Artist, Album, and Title + Artist + Album choices for Stage 5; full metadata remains in the shared song record.
- New shuffle/repeat SVGs are original generic geometric media symbols, created in this repository and distributed under its MIT license. No website source or proprietary branding is included. Inherited asset provenance remains the later release gate from D008.

## Assumptions and unresolved questions

Static native source does not prove actual queue/account behavior, device display quality, or host persistence. The dynamic website may change; legacy shuffle, disabled controls, cold renderer cache defaults, and artwork need the documented manual acceptance. No running signed-in Pear session or physical Stream Deck was available. No Pear changes, playlist method, dedicated dial implementation, or per-action PI UI were added in Stage 4.

## Tooling verification

Node 24.21.0 and official Stream Deck CLI 1.10.1 were installed in `/tmp` for local verification; the repository's dependency files are unchanged. CLI validation/packing passes with the existing intentional category/name warning. `npm audit --omit=dev --json` reports zero production findings. The full audit retains seven development-only findings (2 moderate, 5 high), matching the Stage 2 graph: ajv, engine.io-client, fast-uri, js-yaml, lodash, socket.io-parser, and ws. Sources are the locked `package-lock.json`, npm's audit response, and linked [ajv](https://github.com/advisories/GHSA-2g4f-4pwh-qvx6), [Socket.IO parser](https://github.com/advisories/GHSA-2m8v-j782-fhvr), and [ws](https://github.com/advisories/GHSA-96hv-2xvq-fx4p) advisories. Cleanup remains a later release gate; no forced upgrades are part of this stage.
