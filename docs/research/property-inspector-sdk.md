# Property Inspector settings routing

**Correction after real Windows acceptance (2026-10-07):** Stage 5's outbound action-context inference was wrong. Stream Deck 7.4.2 rejects those overrides; use the inherited 3.3.4 PI methods with the **PI registration UUID** as outbound context. [Context-routing research](property-inspector-context-routing.md) records the runtime evidence, exact pinned source and regression tests; D021 supersedes that part of D015. The Stage 5 investigation date below remains historical.

Stage 5 investigation, 2026-10-04. Reviewed per-action persistence, initial settings, host messages, and the existing framework before implementation.

## Sources and versions

- Elgato [UI WebSocket reference](https://docs.elgato.com/streamdeck/sdk/references/websocket/ui/), [settings guide](https://docs.elgato.com/streamdeck/sdk/guides/settings/), and [plugin protocol](https://docs.elgato.com/streamdeck/sdk/references/websocket/plugin/), read on the investigation date (published documentation version 3.0.0; existing manifest remains SDK 2).
- Locked `streamdeck-typescript` 3.3.4: `node_modules/streamdeck-typescript/dist/src/abstracts/stream-deck-property-inspector-handler.js`, `stream-deck-handler-base.js`, `stream-deck-plugin-handler.js`, and `interfaces/events/init.event.d.ts`.
- Existing `src/pear-pi.ts`, `src/pear-plugin.ts`, `src/streamdeck/pear-session.ts`, and dormant `src/pis/features/play-playlist.pi.ts`.

## Conclusions and implementation effect

The host supplies action settings in registration data. In this locked runtime, PI-originated `getSettings`/`setSettings` use the PI registration UUID as context; `sendToPlugin` uses that context plus the action UUID. Incoming `didReceiveSettings` identifies the action instance and action type. Whole records must retain unrelated fields; global settings remain a separate record. Do not replace the verified framework/host routing with a generic documentation-field inference.

The retained framework exposes registration `actionInfo`, requests settings during registration, and waits for DOM, socket, and global-settings readiness before `setupReady`. A settings response can precede DOM readiness. Its PI settings wrappers omit the action UUID and use the registration UUID as context. Stage 5 incorrectly overrode that behavior; manual bug fix 02 removes the three overrides. The PI still caches early settings and renders after setup. Actual browser-bundle tests now keep all three identifiers distinct and check registration, settings, status/save/reauthorize commands and response ordering.

Common connection controls continue messaging the plugin-owned session. No PI opens a Pear transport or reads/displays authorization credentials. Action validation is shared with the key controller; explicit Save submits only that context's merged settings, and invalid input submits nothing. Defaults are normalized in memory; opening a PI does not rewrite every action. A requested settings read after Save refreshes the host record. Host writes provide no disk-persistence acknowledgment; restart/device testing is still required.

## Assumptions and unresolved questions

The reported Windows host installed and connected the backend, but rejected the original PI routing. Post-fix Windows WebView/authorization/persistence acceptance is pending; OpenDeck, asynchronous host persistence and actual input/layout accessibility remain unverified. Keep the framework/debug logging disabled. No package migration, remote UI dependency, playlist-library fetch, or Pear extension is needed for these forms.
