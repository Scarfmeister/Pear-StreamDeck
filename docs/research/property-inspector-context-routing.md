# Property Inspector context routing — manual acceptance bug 02

Investigated 2026-10-07 after Stage 9, starting at plugin commit `4115640764a1ac449c0fa1bac9c7da34b1a6607e`. Tested correction: **`23cf3daa14d45a27310551d7ee727bdfaceba587`**. This scoped correction supersedes the outbound-routing conclusion in [Stage 5 PI research](property-inspector-sdk.md) and D015; D021 records the decision. It does not start another stage.

## Authoritative runtime evidence

The user reported Windows **11 Pro 25H2**, numeric OS version **10.0.26200**, and Stream Deck **7.4.2.22730**. Pear API Server was enabled at `127.0.0.1:26538` with `AUTH_AT_FIRST`. The Windows-minimum correction allowed installation and all Pear actions appeared. Stream Deck logged `[io.github.scarfmeister.pear-streamdeck] Plugin connected`.

The PI remained at `Connection: Waiting for plugin` / `Authorization: Checking`. Save Connection and Reauthorize had no effect. Stream Deck rejected PI-originated messages with:

```text
Received messageType 'getSettings' from the wrong context
Received messageType 'sendToPlugin' from the wrong context
Received messageType 'setSettings' from the wrong context
```

The rejected context was the action instance context supplied in `actionInfo.context`. These host rejections occurred before the requests could reach the plugin/settings handler.

Backend logs independently showed bounded retry, `Connected to Pear API v1.`, retained confirmed state after a failed request, and the need for explicit Reauthorize. Manual PowerShell diagnostics returned 401 from `GET /api/v1/song`; `POST /auth/io.github.scarfmeister.pear-streamdeck` displayed Pear's approval prompt and returned 200 with an access token after approval. These observations establish backend startup, server reachability and a working Pear authorization endpoint. They rule out a missing backend or broken API endpoint as the cause of the PI's frozen controls; they do **not** prove the plugin itself had authorized or persisted credentials. No manually obtained token was supplied, stored or used in code/tests.

The exact previously installed package hash/commit, Pear build and device model were not supplied. Do not infer them from a local build. Post-fix Windows acceptance remains **Pending**.

## Sources and reproducibility

- [Elgato UI WebSocket reference](https://docs.elgato.com/streamdeck/sdk/references/websocket/ui/), checked 2026-10-07, documentation version 3.0.0. Its five-argument registration callback separately supplies the UI UUID and the associated action information. Incoming `didReceiveSettings` identifies the action instance. Those roles must not be conflated when implementing the retained SDK 2 runtime.
- Locked **`streamdeck-typescript` 3.3.4**, installed by `npm ci` from `package-lock.json`. [Exact npm tarball](https://registry.npmjs.org/streamdeck-typescript/-/streamdeck-typescript-3.3.4.tgz), integrity `sha512-ncxVurGEN0BaIFfQnwSKFgQpTfk0y269h9efmr54hlZs/BRRqpbbU+eoF0K/Mt1sNoGHnehS0zZi8V9NRKXaMA==`.
- Package source: `node_modules/streamdeck-typescript/src/abstracts/stream-deck-property-inspector-handler.ts` and `stream-deck-handler-base.ts`. Runtime used by the browser bundle: corresponding files under `dist/src/abstracts/`. [Framework source repository](https://github.com/XeroxDev/Stream-Deck-TS-SDK); the pinned tarball, rather than a moving default branch, establishes the behavior reviewed here.
- Installed runtime SHA-256: PI handler `77c7cc5e7cd0de741aef2c2d7b09ad500af3c8efeaeb52ccdc31775779620ba3`; base handler `893e71ee9cfcbdcf2ad88af794a5b868373e88c6afa9f29226a3c9df4fdaee94`.
- Project implementation: [pear-pi.ts](../../src/pear-pi.ts), [pear-plugin.ts](../../src/pear-plugin.ts); regression harness: [browser-entry.test.ts](../../tests/browser-entry.test.ts). [Bug-fix checkpoint](../checkpoints/manual-bugfix-02-pi-context.md) records exact gates and package digest.

## Three identifiers and message direction

| Identifier | Registration source | Use in this runtime |
| --- | --- | --- |
| PI registration UUID | Second `connectElgatoStreamDeckSocket` argument; framework `this.uuid` | `registerPropertyInspector.uuid`, and outbound PI `getSettings`, `setSettings`, `sendToPlugin` **context**. |
| Action UUID | Parsed fifth argument, `actionInfo.action` | Identifies the action type, such as `io.github.scarfmeister.pear-streamdeck.volume-up`; remains the **action** field in PI `sendToPlugin`. |
| Action instance context | Parsed fifth argument, `actionInfo.context` | Identifies the placed key/dial instance; used to match incoming action settings. It is not this PI's outbound registration context. |

Example identifiers below are synthetic, never copied from an observed host:

```json
{"event":"registerPropertyInspector","uuid":"pi-registration-example"}
{"event":"getSettings","context":"pi-registration-example"}
{"event":"setSettings","context":"pi-registration-example","payload":{"steps":7}}
{"event":"sendToPlugin","context":"pi-registration-example","action":"io.github.scarfmeister.pear-streamdeck.volume-up","payload":{"type":"pear-get-status"}}
```

For that same PI, `actionInfo.context` could be `key-instance-example`. Incoming `didReceiveSettings` still uses that action context and action UUID. The existing receive-side guard remains appropriate and unchanged. Plugin-originated action messages/settings use their own framework contract; this correction does not substitute PI UUIDs into plugin/controller code.

## Framework behavior, root cause and exact fix

The base handler installs the actual five-argument registration callback and saves its second argument as `_uuid`. PI registration parses `_actionInfo` and calls `requestSettings`; the initial request is queued until the socket opens. The socket then registers the PI, flushes that request and requests global settings.

The locked PI handler's inherited implementations already provide:

- `requestSettings()` → base `getSettings` with `this.uuid` as context.
- `setSettings(settings)` → base `setSettings` with `this.uuid` as context and the settings payload.
- `sendToPlugin(payload, action?)` → `this.uuid` as context, preserving the explicit action or defaulting to `_actionInfo.action`.

Stage 5's local overrides instead sent `actionInfo.context` for all three methods, and added an action field to settings messages. A documentation-based inference incorrectly displaced the locked framework's working contract. Real Stream Deck 7.4.2 rejection confirms that regression. Earlier fake-host tests accepted any message; the default PI UUID also equaled the action instance context, and two explicit assertions endorsed the wrong routing.

**Fix:** remove only the three custom overrides and their misleading comment from `src/pear-pi.ts`. Use the inherited methods unchanged. Keep incoming settings filtering, early-settings caching, draft preservation, validation, all payloads, shared connection/state and authentication semantics unchanged. No SDK/dependency/manifest/Pear change or additional connection is required.

## Regression evidence and limits

Five new tests execute the actual bundled PI/framework in the browser VM and invoke `window.connectElgatoStreamDeckSocket(port, piUuid, 'registerPropertyInspector', info, actionInfo)` with three distinct identifiers. Host information reflects the reported Windows/Stream Deck versions; identifier strings remain synthetic. Tests compare serialized outbound messages to the captured PI registration, rather than mirroring the removed overrides.

Covered messages: initial `getSettings`; **Save action settings** `setSettings` and readback; `pear-get-status`; **Save Connection** `pear-save-connection`; **Reauthorize** `pear-reauthorize`. All three `sendToPlugin` tests assert the exact action UUID and payload. The harness now gives PI registration and action instance different defaults. Two earlier routing assertions are corrected to the full inherited message contract while retaining input-validation, early-response, draft and unrelated-settings checks. Tests also confirm the PI opens no Pear transport.

Before the source fix: **129 tests, 124 passed, exactly these five new tests failed** because the outbound context was the action instance. After removing the overrides: **129/129 pass across 11 files**, plus lint/types/localization/build/official CLI/real-package/audit and the unchanged cross-repository HTTP integration. This catches the reported wire-level defect without requiring a permissive fake host to interpret it as success.

Automated checks establish the emitted protocol. They do not establish live Windows approval, host routing after reinstall, disk persistence, keys/dials, native audio or OpenDeck WebView behavior. No new unresolved code defect was found in the scoped fix. [Windows retest](../MANUAL_TESTING.md#windows-pi-routing-retest) remains pending; other hosts still need their own matrix runs. PR #1 remains unmerged and no release is published.
