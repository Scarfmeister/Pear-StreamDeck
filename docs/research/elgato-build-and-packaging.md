# Elgato build and packaging — Stage 8

Checked 2026-10-05 against the selected Stage 1 HTML/browser architecture. Current official [CLI introduction](https://docs.elgato.com/streamdeck/cli/intro/), [validate](https://docs.elgato.com/streamdeck/cli/commands/validate/), [pack](https://docs.elgato.com/streamdeck/cli/commands/pack/), [distribution](https://docs.elgato.com/streamdeck/sdk/introduction/distribution/), [manifest](https://docs.elgato.com/streamdeck/sdk/references/manifest/), and [localization](https://docs.elgato.com/streamdeck/sdk/guides/i18n/) were read before implementation. Registry source: `https://registry.npmjs.org/@elgato%2fcli/latest`.

The current CLI remains **1.10.1**. Its npm engine is `>=20.1.0`; official current development guidance requires **Node 24+** and recommends Stream Deck **7.1+** with a device for host testing. Use Node 24 for this project's build/test/CLI pipeline. Locked framework **streamdeck-typescript 3.3.4**, TypeScript **5.9.3**, esbuild **0.25.12**, HTML entry points, and manifest **SDKVersion 2** remain appropriate. Plugin software minimum 6.4 is distinct from today's recommended development host. No Node runtime is required by an installed HTML plugin.

Stage 1's CLI pin and architecture remain valid. Normalize the canonical manifest's numeric four-part version and remove its unsupported URL field at source; the preparation script remains a compatibility check. Keep the inherited development version 2.3.0 / manifest 2.3.0.0 until a separately authorized release chooses a public version. Do not enable DRM or claim SDK 3 for direct distribution/OpenDeck.

## OpenDeck/Linux view

Pinned OpenDeck 2.14.0 (`b2d09ca60089cea38ffea7eef191270ffefdf851`) [manifest loader](https://github.com/nekename/OpenDeck/blob/b2d09ca60089cea38ffea7eef191270ffefdf851/src-tauri/src/plugins/manifest.rs) and [runtime selection](https://github.com/nekename/OpenDeck/blob/b2d09ca60089cea38ffea7eef191270ffefdf851/src-tauri/src/plugins/mod.rs) are re-read locally. It merges `manifest.linux.json` before platform selection and launches HTML through a native WebView before any Wine executable path. Add the small Linux override promised by D008; do not add Linux to Elgato's canonical mac/windows OS list. Automated merged-view/resource tests establish configuration, not installed OpenDeck/Flatpak/device acceptance. Package-local entry points, embedded raster feedback and existing touch layouts remain unchanged.

## Reproduction

The existing CI already tests/builds/validates/packs. Extend that workflow for localization and package checks rather than adding another workflow. The release build now has those same gates before upload; only `master` can trigger that pre-existing release workflow. Stage 8 pushes only `dev/pear-port`. Build output remains ignored under `build/`; no distributable is committed or released.

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run prepare:streamdeck-cli
npx --yes @elgato/cli@1.10.1 validate --force-update-check build/io.github.scarfmeister.pear-streamdeck.sdPlugin
npx --yes @elgato/cli@1.10.1 pack --no-update-check build/io.github.scarfmeister.pear-streamdeck.sdPlugin --output build --force --no-file-list
npm run validate:package
```

`prepare:streamdeck-cli` now checks four-part numeric version, supported fields, and canonical/built manifest equality; it does not silently alter only the shipped manifest. `pack` itself serializes manifest JSON (trimming its final newline), so the archive audit compares manifest semantics and other copied resources byte-for-byte. The validator runs normally; never pass `--ignore-validation`. A release preflight should refresh official schemas; after that `--no-update-check` uses installed/cached rules. CI pins the tool and uses its bundled rules for repeatability. Node's test runner can show per-file results; `node --test --experimental-test-isolation=none dist/tests/*.cjs` reports the individual 122 cases. No source lint script is configured; type checks, localization/archive validators, whitespace and commitlint are the applicable checks. Python 3 is required for the ZIP audit, not for the installed plugin. Windows can use `py -3 scripts/validate-package.py`.

## Current schema and platform evidence

On 2026-10-05 the validator fetched current official rules successfully outside the network sandbox. Direct downloads corroborated **manifest/layout schema 0.5.1**, matching the CLI's bundled `@elgato/schemas` 0.5.1:

| Schema URL | Exact downloaded SHA-256 |
| --- | --- |
| `https://schemas.elgato.com/streamdeck/plugins/manifest.json` | `7b6165e4bf38a48858e6fdd804a2eec8577089727d5d4b060eea0f0b0f75cfaa` |
| `https://schemas.elgato.com/streamdeck/plugins/layout.json` | `9efc18870c8d2d01de3ab4cb8d9a225c614b5eebbcfe667a8fd2b4cc6f9170bb` |

Distinguish package version **2.3.0**, manifest plugin Version **2.3.0.0**, manifest SDKVersion **2**, and schema version **0.5.1**. Current guidance does not require migrating this browser plugin to SDK 3 or a Node runtime. Validation/packing ran on Linux without Stream Deck software or a device; host install/link/restart and hardware acceptance require the relevant running host/device.

The official i18n guide establishes root locale JSONs and action/state Name localization. The retained framework's registration info provides `application.language`; native host metadata and authored PI text are separate consumers. Keep en/de/fr at root, with matching action/state/encoder structure, and use the same files' local `Localization.Strings` namespace in a bundled browser adapter. Static DOM bindings and dynamic status/error/feedback labels select the host language; URLs/IDs/settings/metadata are never translated. This is a contained adaptation for the selected HTML runtime, not a new official SDK requirement. Locale/native display acceptance remains manual; structural/browser tests are recorded in LOCALIZATION.md.

The official [Stream Deck software system requirements](https://help.elgato.com/hc/en-us/articles/34512594204049-Elgato-Stream-Deck-Software-System-Requirements), updated 2026-06-25 and checked 2026-10-05, specify current **Windows 11 (64-bit, Intel/AMD)** and **macOS 13+**; Windows ARM is a separate compatibility caveat. These are host product requirements, separate from numeric OS version metadata. Stage 8 incorrectly set Windows `MinimumVersion` to `11`; the authorized post-Stage-9 correction restores **Windows `10` / macOS `13`**, because Windows 11 reports **10.0**. Windows 10 and older host/device combinations remain unverified. Software feature minimum 6.4 and the separate OpenDeck Linux view are unchanged. See the correction record below; this is not a hardware pass.

Pinned OpenDeck's [`PluginManager.svelte`](https://github.com/nekename/OpenDeck/blob/b2d09ca60089cea38ffea7eef191270ffefdf851/src/components/PluginManager.svelte) exposes Install from file; [`events/frontend/plugins.rs`](https://github.com/nekename/OpenDeck/blob/b2d09ca60089cea38ffea7eef191270ffefdf851/src-tauri/src/events/frontend/plugins.rs) accepts local archive bytes and extracts the top-level `.sdPlugin` directory. This supports the expected same-installer import instructions, not a successful live import. The real package has that layout, checked automatically.

Pear setup menu labels are rechecked against the separate fork at `b5f13f65c71ca8890c08f52c7d7becde5d855be9`: `src/menu.ts`, `src/plugins/api-server/{menu,config,index}.ts`, and `src/i18n/resources/en.json`. Plugins → API Server [Beta] enables the plugin; its enabled submenu exposes Hostname, Port, and authorization strategy. Current defaults/labels and the extension contract are distinct from a new Pear release. No Pear source was changed in Stage 8.

## Results and limits

Clean locked install, type checks, **122 tests across 11 files**, localization validation (**3 locales / 204 required leaf keys**), browser build and canonical preparation pass. Current official validate/pack have zero errors and one retained warning: Category Pear Desktop differs from Name Pear Desktop Connector (D003). Source SVG plus same-basename PNG caused ambiguous-resource warnings during development; package only PNG renditions and use explicit PNG dynamic Repeat paths. Final validation has no ambiguous resources.

The build allowlist contains both browser bundles, canonical/Linux manifests, the touch layout, three locales, two HTML entries, CSS, unchanged MIT, and 46 PNGs plus their notice. It excludes source SVGs, removed PSD/promotion, dormant custom-layout example, development configuration, tests/research, dependencies and the companion runtime. `scripts/validate-package.py` checks the real ZIP's exact allowlist/CRC/paths, source/ZIP resource parity, manifest identity and Linux merge, PNG signatures/dimensions, distinct state images and original license. See the Stage 8 checkpoint for the final artifact size/digest and commit/CI evidence. ZIP timestamps can differ across rebuilds; the content audit establishes the shipped resources.

Remaining questions/assumptions: real Windows/macOS/OpenDeck WebViews, Flatpak loopback access, host locale and persistence, physical rendering, and signed-in/native playlist semantics remain untested. Stream Deck's recommended 7.1+ development host does not certify 6.4 runtime behavior. Native-speaker review is separate from locale parity. These limits are in the manual matrix and D018, not implied passing results.

## Release version updater cross-check

Reviewed `release-please-config.json`'s existing JSON `$.Version` updater before leaving the stricter canonical-manifest check. The [v4 action package](https://github.com/googleapis/release-please-action/blob/v4/package.json) declares release-please `^17.3.0`. Both its [v17.3.0 generic JSON updater](https://github.com/googleapis/release-please/blob/v17.3.0/src/updaters/generic-json.ts) and the current upstream code at [`fa67225b42d8133331a1b48e89640b60e9ca6a23`](https://github.com/googleapis/release-please/blob/fa67225b42d8133331a1b48e89640b60e9ca6a23/src/updaters/generic-json.ts) replace the matched three-part SemVer prefix, preserving the trailing fourth component. A one-off simulation using the fetched v17.3.0 regex maps the current `2.3.0.0` to `2.3.1.0`, still valid. The initial concern that it would strip `.0` was disproved; **no release configuration/conversion change is needed**. Stage 8 does not run the release action or choose a new version. Numeric stable release metadata must still pass the actual pipeline when a future release is authorized; prerelease labeling is not inferred as supported.

## Stage 9 final validation followup

Checked 2026-10-06 UTC / 2026-10-05 America/Chicago. The Stage 8 evidence above remains historical. Stage 9 rechecks the same official CLI **1.10.1**, schema/package/runtime architecture and platform contract: Node **24.21.0**, framework **3.3.4**, SDKVersion **2**, manifest **2.3.0.0**. Current `validate --force-update-check` and `pack` pass with zero errors and the same intentional category/name warning. No SDK/tooling migration or distribution-policy change is needed. Earlier source URLs/pinned schema evidence remain applicable; the exact final commands/results are in [Stage 9](../checkpoints/stage-09.md).

Run **`npm run lint`** before type checks; the new source/JS contract audit also runs inside normal tests/CI/release gates. The complete suite is now **124 tests across 11 files**, with unchanged en/de/fr 204-leaf parity. Node 24's individual-test command is unchanged. This supersedes the Stage 8 note that no lint script exists. Obsolete companion/intl and deprecated hook dependencies are removed; clean install plus full audit now report **zero findings**. The final tracked Husky 9/commitlint 21 configuration is checked by the source guard and fresh CI.

On this workstation, `/usr/bin/npm` launches Node 22 directly; PATH alone changes child tools. The clean install explicitly uses Node 24 to run npm's `/usr/lib/node_modules_22/npm/bin/npm-cli.js`. Other developers should ensure npm itself runs under Node 24; portable README commands assume that. This is a local runtime correction, not a plugin Node runtime requirement.

The historical Stage 9 artifact was `build/io.github.scarfmeister.pear-streamdeck.streamDeckPlugin`, **59 files /381,402 unpacked bytes**, local SHA-256 **`21872bc0d46aa1204854a3f7e0965ed130f7ea39467829d1092cbc4c8e66e6e6`**. The Windows correction below supersedes that installer. Real ZIP/resource/Linux/MIT checks and [clean CI at final implementation `5589784`](https://github.com/Scarfmeister/Pear-StreamDeck/actions/runs/37393588427) pass. Timestamp-dependent hashes can differ on reproduction. No binary is committed or release published. Source/schema/archive checks still do not establish host install/Flatpak access/device/native playback; all 42 final manual rows remain unrun. [Handoff](../HANDOFF.md) records installation/setup and review priorities.

## Windows OS version correction after Stage 9

Checked **2026-10-06 UTC / America/Chicago**, starting plugin commit **`0d894dd14c013c555237f085a727bb6893d5d19a`**. The user identified an installation metadata defect: Stage 8 had used the Windows 11 marketing name as a numeric manifest minimum. The investigation checks how Windows identifies itself and what the selected Elgato manifest expects.

Primary sources:

- [Microsoft Operating System Version](https://learn.microsoft.com/en-us/windows/win32/sysinfo/operating-system-version): both Windows 10 and Windows 11 have numeric version **10.0**; application-manifest caveats are documented there.
- [Elgato manifest reference](https://docs.elgato.com/streamdeck/sdk/references/manifest/): its SDKVersion 2 examples use Windows **`MinimumVersion: "10"`** and macOS **`"13"`**. These OS fields differ from `Software.MinimumVersion` and product branding.
- Repository paths: `manifest.json`, `scripts/prepare-streamdeck-cli.js`, `scripts/validate-package.py`; source/built/ZIP parity establishes that the actual distributable receives the correction. [Current Elgato host requirements](https://help.elgato.com/hc/en-us/articles/34512594204049-Elgato-Stream-Deck-Software-System-Requirements) remain separate from the OS version field.

**Conclusion and effect:** restore Windows `MinimumVersion` from `11` to **`10`**. The prior inference from current Windows 11 host requirements to manifest numeric minimum 11 was wrong. The ordinary version-comparison consequence is that a 10.0 system can fail a threshold of 11; this is a contract inference, not a live host pass. The manifest now admits Windows 10/11 at the metadata level. Intended current-host testing remains Windows 11; admission does not certify Windows 10 or override the installed host application's requirements. macOS minimum 13, Stream Deck software minimum 6.4, SDKVersion 2, framework 3.3.4, Node build requirement 24+ and CLI 1.10.1 are unchanged. D020 and all associated current documentation record this distinction; Stage 8/9 checkpoints carry explicit corrigenda while keeping their original results.

Validation/rebuild: rerun the full 124-test suite, lint/source and test types, optional cross-repository HTTP integration, clean browser build, official manifest validation, pack and actual ZIP/resource/Linux audit. Rebuild the ignored `build/io.github.scarfmeister.pear-streamdeck.streamDeckPlugin`; this project's package is a plugin installer, distinct from a host-exported `.streamDeckProfile` layout. Exact results, package digest and commit references are recorded in [the correction checkpoint](../checkpoints/stage-09-windows-version-fix.md).

Remaining assumptions/questions: no Windows host/device is available here to verify import or reported-version handling at runtime. The manual H01 test explicitly checks Windows 11 installation with OS version 10.0; Windows 10 host/device acceptance remains unrun. Schema/ZIP checks establish corrected metadata only. No new SDK, dependency, Pear change, public release or PR merge is required.

Correction implementation commit: **`25e63d4906519ea57a1ea2d4bb73eb905284d65e`**. The rebuilt ignored installer passes all listed gates, has **59 files /381,402 unpacked bytes**, and local SHA-256 **`455a3a922e4b7a8767b00975cc62ddfe2462aa519883e1465157bebf48b76e07`**. Its actual ZIP manifest contains Windows minimum `10` and macOS `13`; full canonical/resource/Linux parity passes. All 124 tests/types/lint/locales/integration pass again; full npm audit is zero. Hardware installation remains unverified.
