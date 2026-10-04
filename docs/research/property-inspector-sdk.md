# Property Inspector settings routing

Stage 5 investigation, 2026-10-04. Reviewed per-action persistence, initial settings, host messages, and the existing framework before implementation.

## Sources and versions

- Elgato [UI WebSocket reference](https://docs.elgato.com/streamdeck/sdk/references/websocket/ui/), [settings guide](https://docs.elgato.com/streamdeck/sdk/guides/settings/), and [plugin protocol](https://docs.elgato.com/streamdeck/sdk/references/websocket/plugin/), read on the investigation date (published documentation version 3.0.0; existing manifest remains SDK 2).
- Locked `streamdeck-typescript` 3.3.4: `node_modules/streamdeck-typescript/dist/src/abstracts/stream-deck-property-inspector-handler.js`, `stream-deck-handler-base.js`, `stream-deck-plugin-handler.js`, and `interfaces/events/init.event.d.ts`.
- Existing `src/pear-pi.ts`, `src/pear-plugin.ts`, `src/streamdeck/pear-session.ts`, and dormant `src/pis/features/play-playlist.pi.ts`.

## Conclusions and implementation effect

The host supplies action settings in registration data. Its per-action settings commands use the action UUID/context; PI writes notify the plugin through `didReceiveSettings`. Whole records must retain unrelated fields. Global settings remain a separate record. The UI protocol documents an `action` field on its `getSettings`/`setSettings` messages.

The retained framework exposes registration `actionInfo`, requests settings during registration, and waits for DOM, socket, and global-settings readiness before `setupReady`. A settings response can precede DOM readiness. Its PI settings wrappers omit the action UUID and use the registration UUID as context. Stage 5 uses a small local override to include the documented action/context; it caches early settings and renders after setup. Actual browser-bundle tests check both registration/response orders and context routing.

Common connection controls continue messaging the plugin-owned session. No PI opens a Pear transport or reads/displays authorization credentials. Action validation is shared with the key controller; explicit Save submits only that context's merged settings, and invalid input submits nothing. Defaults are normalized in memory; opening a PI does not rewrite every action. A requested settings read after Save refreshes the host record. Host writes provide no disk-persistence acknowledgment; restart/device testing is still required.

## Assumptions and unresolved questions

Elgato/OpenDeck physical WebViews, asynchronous host persistence, and actual input/layout accessibility remain unverified. Keep the framework/debug logging disabled. No package migration, remote UI dependency, playlist-library fetch, or Pear extension is needed for these forms.
