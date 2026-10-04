# Pear Desktop Connector

A development fork of [XeroxDev/YTMD-StreamDeck](https://github.com/XeroxDev/YTMD-StreamDeck) for [Pear Desktop](https://github.com/pear-devs/pear-desktop).

**Status: Stage 5 — Property Inspectors, settings, and playlist client interface implemented and automatically tested.** Eleven standard keys work through the shared Pear client. Volume, Track Info, and Play Playlist have per-action settings. Playlist execution in all modes requires the separate Pear extension planned for Stage 7. Dedicated Stream Deck Plus dials and real Pear/host/device acceptance remain later work.

## Project documents

- [Original requirements](docs/PROJECT_SPEC.md), preserved exactly from the supplied specification.
- [Implementation status and checkpoint](docs/IMPLEMENTATION_STATUS.md).
- [Source audit, API contracts, and action map](docs/ARCHITECTURE_AUDIT.md).
- [Architecture and behavior decisions](docs/DECISIONS.md).
- [Playlist capability evidence and Pear extension map](docs/PLAYLIST_API_SPIKE.md).
- [Manual test plan](docs/MANUAL_TESTING.md).
- [Stage 4 checkpoint](docs/checkpoints/stage-04.md) and [agent instructions](AGENTS.md).
- [Stage 5 checkpoint](docs/checkpoints/stage-05.md).

## Setup for the Stage 5 development package

Enable Pear Desktop 3.12.0's API Server plugin. For local use, set its bind address to `127.0.0.1` and port `26538`; Pear's own default bind address is `0.0.0.0`. Open a connector action's Property Inspector to see connection/authorization status and save host, port, or protocol. The connector defaults to HTTP at `127.0.0.1:26538`.

With `AUTH_AT_FIRST`, approve the first request from `io.github.scarfmeister.pear-streamdeck` in Pear. The plugin stores the endpoint-bound token in Stream Deck global settings and reuses it. Authentication-disabled (`NONE`) configurations connect without a token or approval request. Denied, revoked, malformed, or interrupted approval needs the panel's **Reauthorize** button. Save endpoint changes before reauthorizing. HTTPS uses the host's normal certificate trust; no certificate bypass is provided.

The PI sends connection messages to the plugin and opens no Pear connection. Keys show actual Pear state and report offline until a snapshot arrives. Real authorization/persistence, Elgato/OpenDeck networking, and devices remain unverified. See the [Stage 5 settings checks](docs/MANUAL_TESTING.md#stage-5-property-inspectors-and-settings) and retained standard-key checks.

## Available keys and remaining controls

The target is Pear Desktop 3.12.0, with compatible later versions. The plugin will use Pear's native REST API and WebSocket state updates. The default connection will be `127.0.0.1:26538`, with first-run authorization and stored-token reuse. Enable Pear's API Server plugin. Set its bind address to `127.0.0.1` for local use; Pear 3.12.0 itself defaults to `0.0.0.0`.

Available keys: Play/Pause, Next, Previous, Like, Dislike, Mute, Volume Down, Volume Up, Track Info, Shuffle, and Repeat. Their displays use confirmed shared Pear state, including external WebSocket updates. The host does not automatically toggle their images.

Volume defaults to 5% and clamps to 0–100. Open a Volume Up/Down PI, enter a whole step from 1 to 100%, and select **Save action settings**. Invalid stored steps safely use 5%; invalid edits show an error without saving. Mute uses real mute state independently of volume zero. Like/Dislike follow the native same-state clearing behavior and refresh their state after commands; external rating changes on the same track can remain stale because Pear 3.12.0 does not push ratings. Repeat cycles NONE → ALL → ONE → NONE with distinct images/labels. The inspected native server-queue shuffle path toggles both ways; an unsupported legacy off transition alerts and remains visibly on.

Track Info's PI offers **Title**, **Artist**, **Title + Artist** (default), **Album**, and **Title + Artist + Album**. Save to apply the choice to that key. Long lines use ellipsis; missing metadata has a readable fallback and metadata remains visible while paused. Enable Show Title and clear a custom host title if text is hidden. See [display limits](docs/research/track-info-display.md). Press the key to play/pause. Artwork remains deferred until reliable loading and WebView behavior can be verified.

State-changing commands wait for actual confirmation; a failed or unconfirmed command alerts without displaying its target. Overlapping toggles are rejected as busy. Volume serializes up to sixteen waiting inputs and discards them on failure/disconnection. No playback commands are automatically replayed.

Play Playlist's PI accepts a playlist URL or ID and stores the extracted ID on Save. Choose **Follow Shuffle State** (default), **Always Normal**, or **Always Shuffle**. Follow captures Pear's actual shuffle state at activation; unavailable state fails without a guessed start. Supported URLs use the exact YouTube Music/YouTube hosts and a single `list` value; malformed/unsupported input is rejected. Legacy URL settings normalize on explicit Save. Configuration is usable now; **normal and shuffled execution both require the Stage 7 Pear extension**.

Pressing a configured playlist sends only the documented `POST /api/v1/play-playlist` request. Missing/unsupported capability alerts and displays “Stage 7 required”, with details in an open PI. A valid extension response means the native command was dispatched; Pear state and later live tests establish playback. Ambiguous failures are reported without automatic retries. Inherited encoder slots show “Dials pending”; dedicated Volume, Transport, and Playlist Selector dials remain later work.

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

`npm run watch` rebuilds the active Pear browser bundles. `npm run typecheck` checks all source and test types; the inherited errors have been fixed. `npm test` runs 82 deterministic client/host/key/settings tests with fake networking/timers and actual browser-entry bundles in VM contexts. Playlist success fixtures test the proposed contract; they do not prove Pear 3.12.0 supports it. CI runs these checks before building and packaging.

The client is in `src/pear`; the global-settings adapter is `src/streamdeck/pear-session.ts`. The keys use `src/actions/pear-key-actions.ts`, client-owned `src/pear/commands.ts`, and `PearClient.startPlaylist`. Shared action validation lives in `src/streamdeck/action-settings.ts`; playlist parsing/modes live in `src/pear/playlist.ts`. Future actions must use the same plugin-owned client and confirmed snapshots. A standard command's 204 confirms dispatch only; playlist startup specifically requires D013's matching 200 JSON result. No constant polling or automatic playback-command retry is used.

The inherited action/PI source remains dormant reference material until remaining dial work/source cleanup is complete. The active bundles use only Pear key/client/settings code. Its companion package is a development-only type-check dependency and is excluded from runtime bundles. Unused test frameworks were removed. Production dependency audit has zero findings; the full development tree still has seven findings in legacy companion/hook dependencies. See the [status](docs/IMPLEMENTATION_STATUS.md) for limits and the cleanup plan.

The plugin UUID is `io.github.scarfmeister.pear-streamdeck`. Its name is **Pear Desktop Connector**, and its category is **Pear Desktop**. The selected approach retains `streamdeck-typescript` with limited modernization. A Linux manifest override and the dedicated dial actions remain future work.

## Attribution and license

This project derives from YTMD-StreamDeck by Dominic “XeroxDev” Ris. Its upstream Git history is retained. The original [MIT license](LICENSE), including the 2021 copyright notice, is unchanged and is copied into the built plugin directory.

The inherited version number `2.3.0` identifies the baseline. It is not a Pear release announcement. Build/pack commands above create the development `.streamDeckPlugin` file; open it with Elgato Stream Deck to install, then follow the setup and manual acceptance steps. Linux/OpenDeck packaging support and complete release instructions remain later work. This checkpoint has no final PR or release.
