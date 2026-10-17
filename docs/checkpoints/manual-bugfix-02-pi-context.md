# Manual acceptance bug fix 02 — Property Inspector context

Checked **2026-10-07**. Explicitly requested post-Stage-9 correction; **no new stage**, PR merge, release, SDK migration or Pear modification.

## Scope and authoritative starting state

Fetched origin, checked out `dev/pear-port`, pulled fast-forward-only and inspected recent history. Working tree was clean at **`4115640764a1ac449c0fa1bac9c7da34b1a6607e`** before edits. Read root instructions, specification, current status/decisions/handoff/manual matrix, Stage 9 and Windows-version followup, and relevant PI/tooling research. The repository and user's real-host report are authoritative.

Reported host: **Windows 11 Pro 25H2**, numeric **10.0.26200**, **Stream Deck 7.4.2.22730**; Pear API enabled at **127.0.0.1:26538**, **AUTH_AT_FIRST**. Previous corrected package installed, actions appeared and backend connected. PI remained `Waiting for plugin` / `Checking`; Save Connection and Reauthorize did nothing. Host rejected `getSettings`, `sendToPlugin` and `setSettings` as originating from the wrong context. Independent manual API diagnostics returned expected 401 and successful prompted authorization/200. The original installed hash/commit, Pear version/commit and device were not provided. No manually acquired token was provided or used.

## Root cause, completed work and changed components

`src/pear-pi.ts` overrode three working `streamdeck-typescript` **3.3.4** PI methods, replacing the **PI registration UUID** with the **action instance context**. Real Stream Deck rejected the messages before they reached the plugin. Remove `requestSettings`, `setSettings` and `sendToPlugin` overrides and their incorrect comment; inherited methods use `this.uuid`, and `sendToPlugin` retains `actionInfo.action`. Preserve incoming settings filtering by action instance/action UUID, validation, drafts, payloads, shared connection/state and auth semantics.

- **Runtime:** `src/pear-pi.ts` — only the three overrides/comment removed.
- **Tests:** `tests/browser-entry.test.ts` — separate PI UUID/action UUID/action instance throughout the actual bundle harness; simulate the five-argument registration callback; add five outbound-message regressions; correct two old assertions to the full inherited settings contract while preserving validation/settings/draft coverage.
- **Research/decisions:** new [property-inspector-context-routing.md](../research/property-inspector-context-routing.md); correct [Stage 5 PI research](../research/property-inspector-sdk.md) and D015, add D021; current artifact note in [packaging research](../research/elgato-build-and-packaging.md).
- **Current records:** README, IMPLEMENTATION_STATUS, HANDOFF, REQUIREMENTS_STATUS and MANUAL_TESTING describe the reported failure, new package and pending retest. Stage 9/Windows checkpoints gain a supersession note without rewriting their historical results.
- No manifest, lockfile/dependency, action UUID, Pear client/API, SDK/runtime, license/AGENTS/spec or CI/release workflow change. No generated binary is committed.

## Regression tests and red/green evidence

Five added tests inspect serialized host messages emitted by the real bundled PI after `connectElgatoStreamDeckSocket` registration with **three distinct identifiers**:

1. Initial `getSettings` uses captured `registerPropertyInspector.uuid`.
2. **Save action settings** emits `setSettings` plus readback with that PI context, merged valid settings and unchanged unrelated fields.
3. Initial `pear-get-status` uses that PI context and correct action UUID.
4. **Save Connection** `pear-save-connection` uses that PI context, action UUID and exact endpoint payload.
5. **Reauthorize** `pear-reauthorize` uses that PI context and action UUID.

The default fake registration previously reused the action context; permissive fake-host handling and two explicit assertions hid the error. The revised harness uses synthetic identifiers and the reported host-version metadata, never a hard-coded observed context or manual token. Incoming action settings remain correctly separate. Each new PI test also confirms no direct Pear transport.

**Before source correction:** `npm test` failed the browser file; individual runner showed **129 tests /124 passed /5 failed**. Exactly the five new routing tests failed because actual outbound context was the action instance. **After correction:** all **129/129 tests across 11 files pass**, preserving the previous behavior cases. Tests establish the outbound contract, not a live host pass.

## Exact clean pipeline and results

Node **24.21.0**, npm **10.9.7**, official CLI **1.10.1**, locked framework **3.3.4**, SDKVersion **2** and manifest **2.3.0.0** remain the selected architecture. This workstation's npm launcher is fixed to Node 22, so the locked install explicitly runs npm under Node 24; PATH selects Node 24 for child tools. Exact successful post-fix commands:

```sh
env PATH=/tmp/pear-stage04-tools/node_modules/.bin:/usr/local/bin:/usr/bin:/bin /tmp/pear-stage04-tools/node_modules/.bin/node /usr/lib/node_modules_22/npm/bin/npm-cli.js ci
env PATH=/tmp/pear-stage04-tools/node_modules/.bin:/usr/local/bin:/usr/bin:/bin npm run lint
env PATH=/tmp/pear-stage04-tools/node_modules/.bin:/usr/local/bin:/usr/bin:/bin npm run typecheck
env PATH=/tmp/pear-stage04-tools/node_modules/.bin:/usr/local/bin:/usr/bin:/bin npm test
/tmp/pear-stage04-tools/node_modules/.bin/node --test --experimental-test-isolation=none dist/tests/*.cjs
/tmp/pear-stage04-tools/node_modules/.bin/node scripts/test-pear-extension.js /tmp/pear-stage07-desktop
env PATH=/tmp/pear-stage04-tools/node_modules/.bin:/usr/local/bin:/usr/bin:/bin npm run build
env PATH=/tmp/pear-stage04-tools/node_modules/.bin:/usr/local/bin:/usr/bin:/bin npm run prepare:streamdeck-cli
/tmp/pear-stage04-tools/node_modules/.bin/node /tmp/pear-stage04-tools/node_modules/@elgato/cli/bin/streamdeck.mjs validate --force-update-check build/io.github.scarfmeister.pear-streamdeck.sdPlugin
/tmp/pear-stage04-tools/node_modules/.bin/node /tmp/pear-stage04-tools/node_modules/@elgato/cli/bin/streamdeck.mjs pack --no-update-check build/io.github.scarfmeister.pear-streamdeck.sdPlugin --output build --force --no-file-list
env PATH=/tmp/pear-stage04-tools/node_modules/.bin:/usr/local/bin:/usr/bin:/bin npm run validate:package
env PATH=/tmp/pear-stage04-tools/node_modules/.bin:/usr/local/bin:/usr/bin:/bin npm audit --json
git diff --check
```

| Gate | Observed result |
| --- | --- |
| `npm ci` | Pass; 80 platform-applicable packages installed, 81 including root audited, zero vulnerabilities; no lockfile change. |
| Lint/source/syntax | Pass; 22 TypeScript files, 15 action UUIDs, one client/socket owner and valid PI references. |
| Source/test type checks | Pass. |
| Complete suite and individual runner | **129 tests /129 passed /0 failed, skipped or canceled; 11 files pass**. |
| Localization | Pass; en/de/fr, 204 required leaf keys, action/state/encoder/placeholder parity and intentional identical terms. |
| Existing optional HTTP integration | Pass against unchanged actual separate Pear route/broker/adapter plus plugin client; six mode/state cases, auth 401, safe native 501, unknown post-permit 503, abort/late browse/no replay. Native state is simulated; no audible-playback claim. |
| Clean build /manifest preparation | Pass; rebuilt active browser bundles/resources; canonical and built manifests agree. |
| Official validation /pack | Pass, zero errors. One unchanged intentional warning: Category Pear Desktop differs from Name Pear Desktop Connector. No validation bypass. |
| Real package audit | Pass; 59 files /381,053 unpacked bytes, source/resource/PNG/MIT parity, canonical and merged Linux views. |
| Full dependency audit | **Zero findings**, including development packages. |
| Whitespace/docs/preservation | Diff check passes; **195 relative links/anchors across 35 Markdown files** pass. Original MIT/spec/AGENTS/manifests/package/lockfile are byte-identical to the starting head. |

Portable reproduction uses Node 24+ and the README/handoff commands; replace the explicit CLI path with `npx --yes @elgato/cli@1.10.1`. The optional Pear checkout is unchanged at `b5f13f65c71ca8890c08f52c7d7becde5d855be9`; no full Pear test-suite rerun or Pear commit is part of this fix.

## Fresh package and exact commits

- **Tested implementation commit:** **`23cf3daa14d45a27310551d7ee727bdfaceba587`**, `fix: restore Property Inspector registration context`.
- **Package path:** `build/io.github.scarfmeister.pear-streamdeck.streamDeckPlugin`.
- **Local SHA-256:** **`00b598c005aa3f2938219ae926d689da19ceb4611af00dbe63a35ccd595068ac`**.
- **Contents:** 59 files /381,053 unpacked bytes; Windows minimum **10**, macOS **13**. A `.streamDeckPlugin` is the installer, not a host-exported `.streamDeckProfile`.
- The ignored artifact was built/validated from the exact implementation above. Closing documentation changes do not alter packaged runtime resources; archive/source parity is rechecked. Rebuild timestamps can change ZIP hashes; record the actual hash of the file tested.
- **Final documentation commit:** `docs: record PI context bug fix and Windows retest`. Its SHA cannot be stored inside itself; retrieve its exact SHA with `git log -1 --format=%H --grep='^docs: record PI context bug fix and Windows retest$' origin/dev/pear-port` after fetch. The final response reports both full commit SHAs.

Publication verification before stopping: push both logical commits to `origin/dev/pear-port`, fetch and compare `HEAD` to `origin/dev/pear-port`, confirm clean working tree and unchanged `origin/master` (`8b0c3320ce59b741b3165a1c8ac3a54b66c2c97a`), verify [PR #1](https://github.com/Scarfmeister/Pear-StreamDeck/pull/1) is OPEN/unmerged and its head equals the closing documentation commit, and verify its [CI checks](https://github.com/Scarfmeister/Pear-StreamDeck/pull/1/checks). No PR merge, new PR or release is performed.

## Unresolved issues, manual tests and exact next action

**Post-fix Windows retest: Pending.** [MANUAL_TESTING.md](../MANUAL_TESTING.md#windows-pi-routing-retest) contains the exact installer/hash check, full host restart, initial PI settings/status, Save Connection, plugin-mediated Reauthorize/approval, step-7 Save/readback, volume control, restart/persistence and fresh-log checks. None of these corrected manual results is marked passed.

Prior installation/action availability/backend startup is only limited Windows evidence. Initial A01/A02 PI checks failed; A03/A06/I01 routing was blocked. Other key/Plus/OpenDeck/macOS/Windows 10/NONE/reconnect/native playlist and disk/glyph/locale gates remain unverified. The existing Pear native safety and state/reconnect limitations are unchanged. No unresolved automated failure caused by this fix remains; code/protocol verification does not certify hardware/runtime behavior.

**Exact recommended next action:** perform and record this Windows PI routing retest, then continue the outstanding manual matrix only as authorized. There is no next automatically started stage. Stop after this bug fix's commits/push/remote+PR checks; leave PR #1 unmerged and publish no release.
