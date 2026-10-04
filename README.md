# Pear Desktop Connector

A development fork of [XeroxDev/YTMD-StreamDeck](https://github.com/XeroxDev/YTMD-StreamDeck) for [Pear Desktop](https://github.com/pear-devs/pear-desktop).

**Status: Stage 4 — Standard key actions implemented and automatically tested.** Eleven keys use the shared Pear REST/WebSocket client. Playlist startup requires a separate Pear extension. Per-action settings UI and dedicated Stream Deck Plus dials are later stages. Real Pear/host/device acceptance is still required.

## Project documents

- [Original requirements](docs/PROJECT_SPEC.md), preserved exactly from the supplied specification.
- [Implementation status and checkpoint](docs/IMPLEMENTATION_STATUS.md).
- [Source audit, API contracts, and action map](docs/ARCHITECTURE_AUDIT.md).
- [Architecture and behavior decisions](docs/DECISIONS.md).
- [Playlist capability evidence and Pear extension map](docs/PLAYLIST_API_SPIKE.md).
- [Manual test plan](docs/MANUAL_TESTING.md).
- [Stage 4 checkpoint](docs/checkpoints/stage-04.md) and [agent instructions](AGENTS.md).

## Setup for the Stage 4 development package

Enable Pear Desktop 3.12.0's API Server plugin. For local use, set its bind address to `127.0.0.1` and port `26538`; Pear's own default bind address is `0.0.0.0`. Open a connector action's Property Inspector to see connection/authorization status and save host, port, or protocol. The connector defaults to HTTP at `127.0.0.1:26538`.

With `AUTH_AT_FIRST`, approve the first request from `io.github.scarfmeister.pear-streamdeck` in Pear. The plugin stores the endpoint-bound token in Stream Deck global settings and reuses it. Authentication-disabled (`NONE`) configurations connect without a token or approval request. Denied, revoked, malformed, or interrupted approval needs the panel's **Reauthorize** button. Save endpoint changes before reauthorizing. HTTPS uses the host's normal certificate trust; no certificate bypass is provided.

The PI sends messages to the plugin and opens no Pear connection. Keys show actual Pear state and report offline until a snapshot arrives. Real authorization/persistence, Elgato/OpenDeck networking, and devices remain unverified. See the [Stage 4 manual checks](docs/MANUAL_TESTING.md#stage-4-standard-key-acceptance).

## Available keys and remaining controls

The target is Pear Desktop 3.12.0, with compatible later versions. The plugin will use Pear's native REST API and WebSocket state updates. The default connection will be `127.0.0.1:26538`, with first-run authorization and stored-token reuse. Enable Pear's API Server plugin. Set its bind address to `127.0.0.1` for local use; Pear 3.12.0 itself defaults to `0.0.0.0`.

Available keys: Play/Pause, Next, Previous, Like, Dislike, Mute, Volume Down, Volume Up, Track Info, Shuffle, and Repeat. Their displays use confirmed shared Pear state, including external WebSocket updates. The host does not automatically toggle their images.

Volume defaults to 5% and clamps to 0–100. Stored integer `steps` settings are honored; Stage 5 adds the editor. Mute uses real mute state independently of volume zero. Like/Dislike follow the native same-state clearing behavior and refresh their state after commands; external rating changes on the same track can remain stale because Pear 3.12.0 does not push ratings. Repeat cycles NONE → ALL → ONE → NONE with distinct images/labels. The inspected native server-queue shuffle path toggles both ways; an unsupported legacy off transition alerts and remains visibly on.

Track Info displays title + artist, truncates long lines with ellipsis, and retains metadata while paused. Press it to play/pause. The model/formatter prepares all five requested display formats; Stage 5 exposes the selection UI. Artwork is deferred until bounded loading and WebView behavior can be verified.

State-changing commands wait for actual confirmation; a failed or unconfirmed command alerts without displaying its target. Overlapping toggles are rejected as busy. Volume serializes up to sixteen waiting inputs and discards them on failure/disconnection. No playback commands are automatically replayed.

Play Playlist is visibly blocked on the separate Pear API extension. Inherited encoder slots show “Dials pending”. Dedicated Volume, Transport, and Playlist Selector dials remain later work.

Normal playlist startup and native Shuffle Play require the separate Pear extension specified in [D013](docs/DECISIONS.md#d013--stage-3-playlist-extension-contract). The [investigation](docs/PLAYLIST_API_SPIKE.md) names the source files, native command path, and test gate. No normal-start/shuffle/skip workaround is used. OBS metadata export is outside this project's scope; use Pear's Tuna integration separately.

## Development baseline

Use branch `dev/pear-port`. Node.js 24 was used for this checkpoint and is configured in CI.

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run prepare:streamdeck-cli
npx --yes @elgato/cli@1.10.1 validate --no-update-check build/io.github.scarfmeister.pear-streamdeck.sdPlugin
npx --yes @elgato/cli@1.10.1 pack --no-update-check build/io.github.scarfmeister.pear-streamdeck.sdPlugin --output build --force --no-file-list
```

`npm ci` installs locked dependencies. `build` creates the plugin directory. `prepare:streamdeck-cli` normalizes its manifest. `validate` checks the package. `pack` creates a development `.streamDeckPlugin` file in `build`; `--force` permits replacement of that local output. The CLI version is pinned for repeatable checks.

`npm run watch` rebuilds the active Pear browser bundles. `npm run typecheck` checks all source and test types; the inherited errors have been fixed. `npm test` runs 62 deterministic client/host/key tests with fake networking/timers and actual browser-entry bundles in VM contexts. CI runs these checks before building and packaging.

The client is in `src/pear`; the global-settings adapter is `src/streamdeck/pear-session.ts`. The standard keys use `src/actions/pear-key-actions.ts` and the client-owned `src/pear/commands.ts`. Future actions must use the same plugin-owned client and confirmed snapshots. They must not construct clients or transports. A 204 response confirms dispatch only. No constant polling or automatic playback-command retry is used.

The inherited action/PI source remains dormant reference material while later PI/dial/playlist work is pending. The active bundles use only Pear key/client code. Its companion package is a development-only type-check dependency and is excluded from runtime bundles. Unused test frameworks were removed. Production dependency audit has zero findings; the full development tree still has seven findings in legacy companion/hook dependencies. See the [status](docs/IMPLEMENTATION_STATUS.md) for limits and the cleanup plan.

The plugin UUID is `io.github.scarfmeister.pear-streamdeck`. Its name is **Pear Desktop Connector**, and its category is **Pear Desktop**. The selected approach retains `streamdeck-typescript` with limited modernization. A Linux manifest override and the dedicated dial actions remain future work.

## Attribution and license

This project derives from YTMD-StreamDeck by Dominic “XeroxDev” Ris. Its upstream Git history is retained. The original [MIT license](LICENSE), including the 2021 copyright notice, is unchanged and is copied into the built plugin directory.

The inherited version number `2.3.0` identifies the baseline. It is not a Pear release announcement. Build/pack commands above create the development `.streamDeckPlugin` file; open it with Elgato Stream Deck to install, then follow the setup and manual acceptance steps. Linux/OpenDeck packaging support and complete release instructions remain later work. This checkpoint has no final PR or release.
