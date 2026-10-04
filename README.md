# Pear Desktop Connector

A development fork of [XeroxDev/YTMD-StreamDeck](https://github.com/XeroxDev/YTMD-StreamDeck) for [Pear Desktop](https://github.com/pear-devs/pear-desktop).

**Status: Stage 3 — Playlist capability investigation.** The shared Pear REST/WebSocket foundation is in place. Pear 3.12.0 cannot start playlists through its public API. This checkpoint defines the required native-start extension; playback actions and playlist startup are not ported yet. The package remains a connection preview.

## Project documents

- [Original requirements](docs/PROJECT_SPEC.md), preserved exactly from the supplied specification.
- [Implementation status and checkpoint](docs/IMPLEMENTATION_STATUS.md).
- [Source audit, API contracts, and action map](docs/ARCHITECTURE_AUDIT.md).
- [Architecture and behavior decisions](docs/DECISIONS.md).
- [Playlist capability evidence and Pear extension map](docs/PLAYLIST_API_SPIKE.md).
- [Manual test plan](docs/MANUAL_TESTING.md).

## Connection preview

Enable Pear Desktop 3.12.0's API Server plugin. For local use, set its bind address to `127.0.0.1` and port `26538`; Pear's own default bind address is `0.0.0.0`. Open a connector action's Property Inspector to see connection/authorization status and save host, port, or protocol. The connector defaults to HTTP at `127.0.0.1:26538`.

With `AUTH_AT_FIRST`, approve the first request from `io.github.scarfmeister.pear-streamdeck` in Pear. The plugin stores the endpoint-bound token in Stream Deck global settings and reuses it. Authentication-disabled (`NONE`) configurations connect without a token or approval request. Denied, revoked, malformed, or interrupted approval needs the panel's **Reauthorize** button. Save endpoint changes before reauthorizing. HTTPS uses the host's normal certificate trust; no certificate bypass is provided.

The PI sends messages to the plugin and opens no Pear connection. Keys show “Actions pending”; pressing one does not send playback commands. Connection and state logic are automatically tested, but real Pear approval/persistence, Elgato/OpenDeck networking, and devices remain unverified. See the [manual checks](docs/MANUAL_TESTING.md).

## Planned controls

The target is Pear Desktop 3.12.0, with compatible later versions. The plugin will use Pear's native REST API and WebSocket state updates. The default connection will be `127.0.0.1:26538`, with first-run authorization and stored-token reuse. Enable Pear's API Server plugin. Set its bind address to `127.0.0.1` for local use; Pear 3.12.0 itself defaults to `0.0.0.0`.

The required key actions are Play/Pause, Next, Previous, Like, Dislike, Mute, Volume Down, Volume Up, Track Info, Shuffle, Repeat, and Play Playlist. Stream Deck Plus will have dedicated Volume, Transport, and Playlist Selector dial actions. Shared Pear state will drive their displays.

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

`npm run watch` rebuilds the active Pear browser bundles. `npm run typecheck` checks all source and test types; the inherited errors have been fixed. `npm test` runs 39 deterministic client/host tests with fake networking/timers and actual browser-entry bundles in VM contexts. CI runs these checks before building and packaging.

The client is in `src/pear`; the global-settings adapter is `src/streamdeck/pear-session.ts`. Future actions must use the plugin-owned client, subscribe to confirmed snapshots, and call its shared request layer. They must not construct clients or transports. A 204 response confirms dispatch only. No constant polling or automatic playback-command retry is used.

The old action/PI source stays dormant until the action stage. Its companion package is a development-only type-check dependency and is excluded from runtime bundles. Unused test frameworks were removed. Production dependency audit has zero findings; the full development tree still has seven findings in legacy companion/hook dependencies. See the [status](docs/IMPLEMENTATION_STATUS.md) for limits and the cleanup plan.

The plugin UUID is `io.github.scarfmeister.pear-streamdeck`. Its name is **Pear Desktop Connector**, and its category is **Pear Desktop**. The selected approach retains `streamdeck-typescript` with limited modernization. A Linux manifest override and the dedicated dial actions remain future work.

## Attribution and license

This project derives from YTMD-StreamDeck by Dominic “XeroxDev” Ris. Its upstream Git history is retained. The original [MIT license](LICENSE), including the 2021 copyright notice, is unchanged and is copied into the built plugin directory.

The inherited version number `2.3.0` identifies the baseline. It is not a Pear release announcement. Complete installation/action instructions will be added with the working port. This checkpoint has no final PR or release.
