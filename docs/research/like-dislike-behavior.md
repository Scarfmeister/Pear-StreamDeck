# Like and Dislike behavior

Investigated for Stage 4 on 2026-10-04: native rating semantics, command dispatch, and state freshness.

## Sources and versions

- Pear Desktop 3.12.0, commit [`3f599b42724be827db51cd4689996dc3e48a9561`](https://github.com/pear-devs/pear-desktop/tree/3f599b42724be827db51cd4689996dc3e48a9561).
- [`src/plugins/api-server/backend/routes/control.ts`](https://github.com/pear-devs/pear-desktop/blob/3f599b42724be827db51cd4689996dc3e48a9561/src/plugins/api-server/backend/routes/control.ts): `getLikeState`, `like`, and `dislike` handlers.
- [`src/renderer.ts`](https://github.com/pear-devs/pear-desktop/blob/3f599b42724be827db51cd4689996dc3e48a9561/src/renderer.ts): `peard:update-like` calls the native like renderer's `updateLikeStatus`.
- [`src/providers/song-info-front.ts`](https://github.com/pear-devs/pear-desktop/blob/3f599b42724be827db51cd4689996dc3e48a9561/src/providers/song-info-front.ts): observes `like-status` and sends renderer IPC updates.
- [`src/plugins/api-server/backend/routes/websocket.ts`](https://github.com/pear-devs/pear-desktop/blob/3f599b42724be827db51cd4689996dc3e48a9561/src/plugins/api-server/backend/routes/websocket.ts): no rating event exposed.
- Native [YouTube Music application script](https://music.youtube.com/s/a2c50912/music_polymer_inlined_html.js), revision `a2c50912`, 4,914,651 bytes, SHA-256 `88730ffc80ae625375b67c63888a23c134c886e350f7c74fba26576adec83beb`. Matches the Stage 3 pinned script. Inspected the like renderer's `onLikeTap`, `onDislikeTap`, and `updateLikeStatus` (latter near character offset 2,763,649; locate by method name rather than relying on minified names). Website source remains outside this repository.

## Conclusions and implementation

The inspected native renderer compares the requested rating to its actual current rating. A match selects `INDIFFERENT`; otherwise it selects the requested rating. It dispatches the matching native service endpoint from its own data. Thus repeated Like or Dislike clears that rating through the **same** Pear endpoint. Changing from the opposite rating selects the new rating. No invented unlike route or handmade transition is needed.

Stage 4 sends exactly one `POST /like` or `/dislike`, including when that rating is already active. This supersedes D005's provisional active-rating no-op. Displays use only `/like-state` results in the shared model. The REST 204 acknowledges renderer dispatch, so the client performs one delayed (150 ms) rating read, awaiting any older in-flight read first. Connection/video-change reads remain coalesced and protected against old-track results. No continuous rating polling is added.

## Assumptions and unresolved questions

This is static source evidence, not signed-in playback acceptance. Native rating requires suitable data/service endpoints and an account; the website can show a sign-in dialog or ignore an unavailable operation. Its script can change independently of Pear. A delayed read can still precede a slow native cache update, so it does not establish a confirmed rating transition. Unmodified Pear 3.12.0 does not push same-track external rating changes; those can remain stale until the next bounded refresh. Test all three states and sign-in/unavailable cases in `docs/MANUAL_TESTING.md`.
