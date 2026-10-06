# Pear Desktop Connector

Control [Pear Desktop](https://github.com/pear-devs/pear-desktop) from Stream Deck keys and Stream Deck Plus dials. One shared connection uses Pear's local API Server; displays follow actual player state, including changes made in Pear.

**Development preview:** Stage 9 completes the automated audit and opens [PR #1](https://github.com/Scarfmeister/Pear-StreamDeck/pull/1). The installer passes automated validation. Real devices, host installation/persistence, and signed-in native playlist playback still require [manual acceptance](docs/MANUAL_TESTING.md#stage-8-release-validation-matrix). No release or hardware compatibility certification is claimed. [Handoff](docs/HANDOFF.md) records the tested commits, package and remaining work.

## Requirements

| Component | Target and evidence |
| --- | --- |
| Pear Desktop | API contract reviewed against **3.12.0**. Standard controls target that version; later releases need compatibility checks. Enable API Server and let the player load. |
| Playlist playback | Requires the separate **Pear playlist API extension** below. Stock Pear 3.12.0 has no playlist-start endpoint. |
| Elgato Stream Deck | SDK 2 HTML plugin, software minimum **6.4**; current host targets **Windows 11 (64-bit Intel/AMD)** or **macOS 13+**. Current development guidance recommends Stream Deck 7.1+. Messages/schema pass automatic tests; installation/devices are unverified. [Official host requirements](https://help.elgato.com/hc/en-us/articles/34512594204049-Elgato-Stream-Deck-Software-System-Requirements) apply. |
| OpenDeck/Linux | Expected compatibility from pinned **OpenDeck 2.14.0** source. The package includes a Linux manifest override and PNG feedback for its native HTML WebView. Merged manifest/resource checks pass; Linux/OpenDeck/Flatpak/device runtime is unverified. |
| Languages | English, German, French. All inherited locales retained and validated; native-speaker and on-device review remain useful. |

The installed HTML plugin needs no separate Node.js installation. Node is used for development.

## Install and connect

1. Obtain `io.github.scarfmeister.pear-streamdeck.streamDeckPlugin`. During development, download the **streamdeck-plugin** artifact from a successful **dev/pear-port** [CI run](https://github.com/Scarfmeister/Pear-StreamDeck/actions/workflows/ci.yml) and extract its ZIP, or build it below. Check the run's commit against the [Stage 9 checkpoint](docs/checkpoints/stage-09.md). No public release has been published.
2. On Windows/macOS, open the installer with Elgato Stream Deck and follow its prompt. In OpenDeck's plugin manager, choose **Install from file** and select the same installer. These are the intended install paths; record real results in the manual matrix.
3. In Pear's **Plugins** menu, enable **API Server [Beta]** (the 3.12.0 label). Reopen its submenu and set **Hostname** to `127.0.0.1` and **Port** to `26538` for the same computer. Pear's default bind address is `0.0.0.0`; the connector defaults to `127.0.0.1`. Leave HTTPS off for this default local setup.
4. Drag an action from **Pear Desktop** onto a key/dial. Select it to open its settings panel (Property Inspector). Connection settings apply to all Pear actions: **Host 127.0.0.1, Port 26538, Protocol HTTP**. Save changes if needed.
5. With Pear's **Authorize at first request**, approve the request from `io.github.scarfmeister.pear-streamdeck` in Pear. The connector saves the endpoint-bound token in host global settings and reuses it. The panel shows status without displaying the token. Wait for **Connected** and real player state.

Denied/interrupted approval or a revoked token needs **Reauthorize**; save the intended endpoint first. Failures do not create an approval loop. If Pear is deliberately configured with **No authorization** (`NONE`), the connector detects that and connects without a token/prompt. Configured HTTPS uses normal host certificate trust.

“Pear offline” means no usable snapshot yet. Check Pear, the enabled API Server, loaded player and matching host/port/protocol. Reconnect does not replay commands. YTMD profiles/tokens are not imported; Pear has a separate plugin UUID.

## Key actions

| Action | Behavior / settings |
| --- | --- |
| Play/Pause | Displays Play when paused/stopped, Pause when playing; toggles real playback. |
| Next Track / Previous Track | Normal transport commands. |
| Like Track / Dislike Track | Shows the available rating. Pressing the active rating lets Pear clear it through native behavior. |
| Mute | Toggles actual mute; volume zero does not imply mute. |
| Volume Down / Volume Up | Whole-percentage step **1–100**, default **5%**, volume clamped to **0–100%**. Invalid older steps use 5%. |
| Track Info | Title, Artist, Title + Artist (default), Album, or Title + Artist + Album; press to play/pause. |
| Shuffle | Shows off/on from Pear updates and requests its real toggle. |
| Repeat Mode | Distinct Off/All/One images/labels; cycles **NONE → ALL → ONE → NONE**. |
| Play Playlist | Saved URL/ID and startup mode; requires the Pear extension for playback. |

Edit volume/metadata/playlist options and select **Save action settings**. These stay per action; connection settings are global. Invalid edits show a translated error without saving. Track Info shortens long lines with ellipsis and retains paused metadata. Enable **Show Title** and clear a custom host title to see it. Album artwork is deferred until reliable loading is verified; see [display limits](docs/research/track-info-display.md).

## Stream Deck Plus

| Action | Clockwise / counter-clockwise | Press | Display |
| --- | --- | --- | --- |
| Volume Dial | Increase / decrease by configured step | Toggle mute | Actual volume, mute, indicator |
| Transport Dial | Next / previous, once per detent | Play/pause | Track, artist, real playback |
| Playlist Selector Dial | Next / previous entry, wrapping | Play selected playlist | Name, index/count, mode, status |

Volume Dial uses the same step editor/limits as volume keys. For the selector, choose **Add playlist**, enter a name (1–64 characters) and URL/ID, choose its startup mode and save. Up to 16 entries are supported. Optional PNG/JPEG images up to 24 KiB are embedded in action settings. Rotation selects without playing; selection is saved per dial. Invalid entries remain visible for repair.

The selector is one encoder with a local list, the reliable equivalent for this SDK/OpenDeck architecture; it does not dynamically create a host Dial Stack per playlist. Older Play/Pause and Volume Up encoder assignments remain Transport/Volume aliases. Short touch refreshes; hold does nothing. Clear custom title/icon overrides to see feedback. Rapid transport input is bounded; failure/disconnect/profile changes discard unsent input. See [dial evidence and limits](docs/research/stream-deck-plus-sdk.md).

## Playlists and native Shuffle Play

Enter a raw playlist ID or supported YouTube Music/YouTube playlist/watch URL with one valid `list` parameter. **Save** extracts the case-sensitive ID; malformed/unsupported input is rejected.

| Startup mode | Result |
| --- | --- |
| Follow Shuffle State (default) | Read real Pear shuffle at press time; unknown state gets one bounded refresh or an error. |
| Always Normal | Request native normal Play. |
| Always Shuffle | Request native Shuffle Play before playback begins. |

Both modes require [Scarfmeister/pear-desktop, branch `feature/streamdeck-playlist-api`, commit `b5f13f65c71ca8890c08f52c7d7becde5d855be9`](https://github.com/Scarfmeister/pear-desktop/commit/b5f13f65c71ca8890c08f52c7d7becde5d855be9). It still reports 3.12.0; the commit identifies the extension. This is an unreleased development branch, not functionality in stock Pear.

In a **separate Pear checkout**, Node 24 and pnpm 11 can run `pnpm install --frozen-lockfile`, `pnpm build`, and `pnpm start`. Sign in, wait for the player, and configure API Server as above. The extension's protected `POST /api/v1/play-playlist` invokes the supplied native Play/Shuffle Play control. Standard controls and playlist configuration/selection work independently; playlist execution needs the extension.

A missing route shows **Update Pear**. Unsupported native controls show **Unavailable**, with details in an open panel. A response acknowledges dispatch; Pear state establishes playback. The website can reuse a shuffled same-playlist queue for normal start; the extension rejects unsafe reuse with 501 before startup. It never starts normally, enables shuffle and skips a track. Ambiguous outcomes are reported without retry. First audible track, signed-in/private playlists and queue semantics remain manual gates. [Extension research](docs/research/pear-playlist-api-extension.md) records the contract and tests.

## Known limitations

- Physical keys/Plus displays, Windows/macOS Stream Deck, Linux/OpenDeck/Flatpak installation, language rendering, and host token/settings persistence are unverified. Automatic messages/schema/source checks are separate from hardware acceptance.
- Pear 3.12.0 does not push ratings. Same-track ratings changed elsewhere can remain stale until track change, reconnect or a connector rating command. Unsupported legacy shuffle-off alerts and stays visibly on.
- Pear's cold cached routes can be incomplete before playback. An open but stalled WebSocket can retain stale state until recovery; there is no heartbeat or constant polling. Failed/unconfirmed commands alert without inventing state.
- Native playlist support rejects unsafe/missing website controls. The separate Pear fork retains upstream formatting warnings; see [Stage 7](docs/checkpoints/stage-07.md). OBS metadata export is outside scope; use Pear's Tuna integration separately.
- Multi Actions are disabled because explicit requested-state semantics are not implemented. Former timing/hold-repeat/custom-layout variables and a library dropdown are outside this port's requested controls. Use the documented steps, formats, IDs and dedicated dial list.
- Stage 9 removes the dormant companion code and obsolete dependencies; the complete dependency audit reports zero findings at the checked date. German/French translations benefit from native-speaker review.

The [manual matrix](docs/MANUAL_TESTING.md#stage-8-release-validation-matrix) gives concrete steps and expected results. Record actual versions/results before release.

## Build and validate

Use `dev/pear-port`, **Node.js 24+**, npm, and Python 3 for the archive audit. Dependencies are locked; the validated current official Elgato CLI is **1.10.1**.

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run prepare:streamdeck-cli
npx --yes @elgato/cli@1.10.1 validate --force-update-check build/io.github.scarfmeister.pear-streamdeck.sdPlugin
npx --yes @elgato/cli@1.10.1 pack --no-update-check build/io.github.scarfmeister.pear-streamdeck.sdPlugin --output build --force --no-file-list
npm run validate:package
```

On Windows, the archive audit can instead use `py -3 scripts/validate-package.py`. `npm test` includes repository/syntax and localization validation plus client/state/action/settings/browser tests (124 individual cases). `prepare:streamdeck-cli` verifies canonical/built manifest parity. `build` replaces the ignored build directory; `pack --force` replaces its local installer. Output: **`build/io.github.scarfmeister.pear-streamdeck.streamDeckPlugin`**. Do not commit it.

CI runs those checks before uploading the development artifact. The existing release workflow has the same gates; Stage 9 does not trigger it. Validation has one documented warning: category **Pear Desktop** differs from name **Pear Desktop Connector**, as required by the project identity. No validation bypass is used. See [tooling/schema/platform evidence](docs/research/elgato-build-and-packaging.md).

`npm run watch` rebuilds active browser entries. Icon authors can regenerate committed assets with Python 3, Inkscape 1.4.4 and `python3 scripts/generate-icons.py`; these tools are not needed to install the plugin. Optional Node 24 cross-repository check: `node scripts/test-pear-extension.js /path/to/pear-desktop`. It simulates native player state and does not prove signed-in audio.

## Project records, attribution and license

Durable records: [specification](docs/PROJECT_SPEC.md), [requirements matrix](docs/REQUIREMENTS_STATUS.md), [status](docs/IMPLEMENTATION_STATUS.md), [decisions](docs/DECISIONS.md), [localization](docs/LOCALIZATION.md), [Stage 9 checkpoint](docs/checkpoints/stage-09.md), [handoff](docs/HANDOFF.md), [agent instructions](AGENTS.md). Inherited version 2.3.0 (manifest 2.3.0.0) remains a development identifier; a public version belongs to a separately authorized release stage.

Derived from **[XeroxDev/YTMD-StreamDeck](https://github.com/XeroxDev/YTMD-StreamDeck)** by Dominic “XeroxDev” Ris. Upstream history and the original 2021 notice remain intact. The **[MIT license](LICENSE)** is copied unchanged into the installer. Generic icons are project-created MIT geometry; no proprietary logo or third-party icon set is bundled. [Asset provenance/removals](docs/research/assets-and-licensing.md) and [icon notice](icons/NOTICE.md) record the replacement set.
