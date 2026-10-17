# Stage 8 — Assets, packaging, documentation, and release validation

**Later correction:** Stage 8's Windows `MinimumVersion: "11"` confused the product name with its numeric OS version. Windows 11 reports 10.0. The [authorized followup](stage-09-windows-version-fix.md) restores Windows minimum `10`, updates the current documentation and rebuilds the installer. Results below describe the historical Stage 8 revision, not a successful Windows installation.

## Scope and starting point

Prepare a distributable development plugin and concrete manual testing plan: asset/license audit and generic replacements; complete inherited localization; current tooling/manifest/package validation; user-facing README; applicable automation; persistent research/status/decisions/checkpoint. Read authoritative docs and every existing checkpoint/research document after fetching/checking out/pulling `dev/pear-port`. Started clean at `f7b1ce245b3b015d5603e4e05754d1bd7f09619f`. No Stage 9, PR, release or Pear modification is authorized by this checkpoint.

## Work completed and files/components changed

- Audited inherited control/category/action bitmaps, PSD and promotional thumbnail. Replaced all 32 inherited PNG byte streams with original MIT geometry and refreshed five Stage 4 SVGs. Added consistent generic controls, native state symbols, playlist/metadata/plugin/category assets: **23 SVG sources, 46 PNG renditions**, with `icons/NOTICE.md` and `scripts/generate-icons.py`. Removed `YTMD-Connector-Icons.psd` and `assets/thumbnail/ytmdc-thumbnail.png` from the current tree, preserving history/attribution.
- Retained en/de/fr (every upstream locale). Inventory covers all 72 starting English keys, missing translated keys, English replacements, retired companion keys, reused translations and all 204 final keys. Final resources contain 136 runtime strings plus matching action/state/encoder metadata. Authored changed/new Pear translations, documented identical proper/technical/local terms, and added `docs/LOCALIZATION.md` plus inventory/exception JSONs.
- Added `src/streamdeck/localization.ts` and safe host-language bindings in PI/editor/key/dial/plugin entries. Static/dynamic UI, fallback/status/help/error text is localized; programmatic values and actual metadata remain unchanged. Updated `property-inspector.html`, TS JSON support, localization validation, tests and normal test script.
- Updated canonical manifest Version 2.3.0.0/supported fields/Names/state names/generic icon references/current Windows 11/macOS 13 targets. Retained framework 3.3.4, SDKVersion 2, HTML entry points, software feature minimum 6.4, category and all action UUIDs. Added `manifest.linux.json` for OpenDeck's native HTML view.
- Made `scripts/build.js` use explicit runtime resources and PNG renditions only. Dynamic Repeat paths and selector default icon use the new PNGs; editable SVGs remain in Git. `prepare:streamdeck-cli` checks canonical/built parity. Added `scripts/validate-package.py` and package scripts; extended existing CI/release build checks rather than adding redundant automation. No dependencies/lockfile or release-please configuration changed.
- Rewrote README with normal-user install/API enable/auth/defaults/features/settings/native playlist extension/limits/OpenDeck/Linux/license/development instructions. Preview help/homepage links point to `dev/pear-port` so users reach current Pear documentation while the default branch retains upstream history. Added D018, current status and a concrete **40-row** manual test matrix with expected results and explicit Not run state. Persisted asset/tooling/schema/platform/version-updater research.

## Tests, builds and validation results

| Check | Result / evidence |
| --- | --- |
| Clean `npm ci` | Pass on Node **24.21.0**, 248 locked packages. Sandbox esbuild restriction was resolved by an authorized rerun; no install/lockfile change remains. |
| `npm run typecheck` | Pass for source and tests; zero errors. |
| Complete `npm test` | Pass across **11 files**, including pre-bundle localization validation. Individual Node 24 run reports **122 tests**, zero failures/cancellations/skips. |
| Localization validator and negative cases | Pass: all three locales, **204 required leaf keys**, manifest/action/state/encoder/placeholder/structure/inventory parity; no exact English copy/undocumented English placeholder. Tests reject malformed JSON, missing locales/keys, stale actions/companion keys, wrong arrays/encoder structure, lost parameters, old branding and English placeholders. |
| Browser integration | German/French PI statuses and validation errors localized; settings retain numeric steps/programmatic identifiers. French plugin feedback follows real state; Track Info metadata remains supplied text. Existing key/dial/client/playlist/settings cases all pass. |
| `npm run build` / `prepare:streamdeck-cli` | Both browser bundles build; source/built canonical metadata agrees, Version **2.3.0.0**. |
| Official CLI **1.10.1** validate and pack | Pass with current **manifest/layout 0.5.1** schemas, independently downloaded/hashed; zero errors. One retained warning: Pear Desktop category differs from Pear Desktop Connector name (D003). No ambiguous icon warnings, DRM or validation bypass. |
| Archive / merged Linux view | Pass: **59 expected files / 381,442 unpacked bytes**; valid ZIP CRC/safe unique paths/source parity, complete resource references/PNG signatures/dimensions/pairs/distinct states, unchanged MIT/notice; Linux merge retains identical actions and selects `action.html`. No SVGs, PSD, promotion, dormant layout example, source/tests/research/dependencies/companion runtime in installer. |
| Asset rendering/audit | All 23 original SVGs/46 PNGs rendered with Inkscape **1.4.4** and visually inspected on a dark preview. All 32 inherited PNGs replaced; no third-party icon set/brand assets imported. Hardware legibility is unverified. |
| Production / full install audit | Zero production findings. Same seven legacy development findings (**2 moderate / 5 high**); no unrequested upgrades/source cleanup. |
| Preservation / applicable lint | Original MIT/spec/AGENTS/lockfile/dependency selections/action IDs/default/upstream history retained. 77 local Markdown paths/anchors, both workflow YAML files, whitespace and implementation commitlint pass. No source lint command is configured; type/localization/archive checks apply. |
| GitHub CI / commit publication | Pass: [run 37390624755](https://github.com/Scarfmeister/Pear-StreamDeck/actions/runs/37390624755) at `375819c752ab0aed4a6f4814f7cb73116ffb46cd`, every install/type/test/build/validate/pack/archive/upload step successful. Fresh fetch verifies matching implementation heads; closing documentation head is verified after push. |
| Physical/live acceptance | **Not performed.** No device/host installation/persistence, Windows/macOS/OpenDeck/Flatpak or signed-in native playlist audio pass is claimed. |

## Package and reproduction

Exact output: **`build/io.github.scarfmeister.pear-streamdeck.streamDeckPlugin`**.

Stage 8 local artifact SHA-256: **`ef1d123a7cd6adc4142a2fec9957d8e9dd44bbc163625992bd8281e037b3c5f1`**. The directory/installer is ignored under `build/` and is not committed. Rebuild using the ordered [README commands](../../README.md#build-and-validate) or [exact tooling record](../research/elgato-build-and-packaging.md); ZIP timestamps can change a new archive's digest while the content audit verifies its resources. CI uploads the installer as `streamdeck-plugin`; no release is published.

## Unresolved problems, remaining release blockers and manual tests

- Run [the Stage 8 matrix](../MANUAL_TESTING.md#stage-8-release-validation-matrix): normal keys, Stream Deck Plus, actual Windows/macOS where claimed, OpenDeck/Linux and Flatpak where used, auth/reauthorize/NONE, API disabled/restarts/reconnect, external state, all playlist modes, dials/touch/images, PI persistence and language/icon readability. All physical rows remain Not run. Source-expected OpenDeck compatibility and verified configuration are separate evidence.
- Signed-in native Normal/Shuffle Play/queue/first audible track/private/modern/localized layouts are unverified. Both playlist execution modes require the separate Pear extension at **`b5f13f65c71ca8890c08f52c7d7becde5d855be9`**, branch `feature/streamdeck-playlist-api`. Stage 7 automatic evidence is retained; Pear was neither changed nor retested in Stage 8.
- Unsafe legacy normal startup in a shuffled same-playlist queue rejects with 501; no workaround/fake success. Existing cold caches, missing pushed ratings, legacy shuffle-off, half-open connection and host persistence acknowledgment limits remain. Album artwork remains deferred.
- German/French are complete authored translations; native speakers should review idiom/short labels and real glyph widths. Current host requirements do not establish minimum-6.4/ARM/older-OS operation. Never expand compatibility claims from schema passes.
- Seven legacy development dependency findings need explicit release disposition. Pear's inherited formatting/lint warnings remain Stage 7 context. No stage-caused test/type/build/package failure remains; public release/version/PR decisions remain separately authorized.

## Important research and decisions

- [assets-and-licensing.md](../research/assets-and-licensing.md): source groups/MIT/provenance uncertainty, proprietary promotion/removals, original replacement approach, complete asset inventory/generation/render/package limits.
- [elgato-build-and-packaging.md](../research/elgato-build-and-packaging.md): official URLs/date/versions/Node/schema hashes, commands, current OS metadata correction, OpenDeck merge/import source, build allowlist, validation results, release-please source/simulation and unresolved physical assumptions.
- [LOCALIZATION.md](../LOCALIZATION.md), [complete key inventory](../localization-inventory.json) and [identical-term exceptions](../localization-exceptions.json): baseline/final audit, upstream reuse, translations, runtime/validation method and native review.
- D018 records generic assets, complete locale validation, explicit packaging/current OS/Linux view and the automatic/manual boundary. D001/D008/D009 are updated; earlier stage checkpoints/spec/history remain intact.

## Commit and remote evidence

**Final tested implementation commit SHA: `375819c752ab0aed4a6f4814f7cb73116ffb46cd`.** Committed/pushed to `dev/pear-port`; fresh fetch verifies local and `origin/dev/pear-port` equality. [GitHub CI run 37390624755](https://github.com/Scarfmeister/Pear-StreamDeck/actions/runs/37390624755) passed all steps and uploaded the validated development installer. This closing documentation commit records the actual tested SHA and CI evidence. A checkpoint cannot literally embed the hash of the commit containing its own final bytes. Its final closing commit SHA is durably retrievable with `git log -1 --format=%H -- docs/checkpoints/stage-08.md`; the final stage report also records the independently verified remote head. The closing commit changes documentation only. Plugin default `master` remains `8b0c3320ce59b741b3165a1c8ac3a54b66c2c97a`; no upstream/default/Pear branch is modified or release/PR created.

## Exact recommended next stage and stop

**Stage 9, only after an explicit Stage 9 request.** Begin with this checkpoint, current repository docs/history and the remaining manual/release gates, then follow the user's Stage 9 scope. This checkpoint does not authorize hardware acceptance, dependency cleanup, release/version selection, final/upstream PR or publication automatically. Stage 8 stops after logical source/documentation commits, push and final remote/clean-tree verification.
