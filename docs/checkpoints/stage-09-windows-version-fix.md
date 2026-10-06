# Stage 9 followup — Windows OS version correction

Checked **2026-10-06 UTC / America/Chicago**. This is the explicitly requested correction and rebuild after Stage 9, not a new automatically started stage.

## Scope, starting point and work completed

Started clean on `dev/pear-port` at **`0d894dd14c013c555237f085a727bb6893d5d19a`** after fetching origin, checking out the development branch, pulling fast-forward-only, reading project instructions/spec/status/decisions/manual plan/relevant research and checkpoints, and inspecting recent history. PR #1 remains open/unmerged; master is unchanged. The user identified that Windows 11 reports numeric OS version 10.0, so manifest minimum 11 is incorrect.

- Change **`manifest.json` Windows `MinimumVersion` from `"11"` to `"10"`**. macOS minimum 13, software minimum 6.4, SDKVersion 2, runtime/dependencies/action UUIDs are unchanged.
- Verify the version distinction against authoritative Microsoft and Elgato sources, save it in [packaging research](../research/elgato-build-and-packaging.md#windows-os-version-correction-after-stage-9), and record D020. Numeric metadata admits Windows 10/11; intended current host testing remains Windows 11, and Windows 10 operation is not certified.
- Update README, current status/handoff, requirement R50, architecture/decision/source research, manual H01 and Stage 8/9 checkpoint corrigenda. Preserve historical results rather than recasting them as successful Windows installation. This followup supersedes the prior package/acceptance target.
- Rerun the complete existing tests and relevant clean install/lint/types/integration/build/current official validation/pack/archive checks. No unit test for a literal configuration change or unrelated code/Pear modification is added.
- Rebuild the project's normal **`.streamDeckPlugin` installer** and inspect its actual packaged Windows minimum. A `.streamDeckProfile` is a separate host layout; no exported profile was supplied or part of this build process.

## Exact validation and observed results

Node **24.21.0**, npm **10.9.7**, framework **3.3.4**, locked compiler/bundler and official Elgato CLI **1.10.1** remain unchanged. On this workstation npm itself must be launched through Node 24; its system launcher is fixed to Node 22. Exact commands run:

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
python3 scripts/validate-package.py
env PATH=/tmp/pear-stage04-tools/node_modules/.bin:/usr/local/bin:/usr/bin:/bin npm audit --json
git diff --check
```

| Check | Result |
| --- | --- |
| Clean locked install | Pass; 80 platform-applicable packages added, 81 audited including root; hook prepare succeeds, lockfile unchanged. |
| Source/syntax lint and source/test types | Pass; 22 TS files /15 UUIDs /one client/socket and PI references; zero type errors. |
| Complete tests and localization | Pass; **124 individual tests across 11 files**, zero failures/cancellations/skips; all en/de/fr **204 required leaf keys** and manifest/state/encoder/placeholder parity pass. |
| Optional actual-Pear HTTP integration | Pass: six mode/state cases, safe native 501, post-permit unknown 503, abort/late browse, auth 401 and no replay/optimistic state. Native IPC/state are synthetic; no full Pear-suite or signed-in audio rerun is claimed. |
| Clean build and canonical preparation | Pass; both browser bundles, source/build manifest parity. |
| Official current validation / pack | Pass, zero errors; same one intentional category/name warning. |
| Real installer / Linux / assets / MIT | Pass; **59 files /381,402 unpacked bytes**, actual ZIP CRC/resources/source parity/PNG/distinct states/MIT/Linux view. Additional ZIP inspection confirms Windows minimum **10**, macOS **13**, exact canonical metadata. |
| Full dependency audit | Pass, zero findings. |
| Documentation/preservation/whitespace | **165 local Markdown targets/anchors in 31 files** and corrected current Windows statements pass; original MIT/spec/AGENTS, lockfile/dependencies and default branch preserved. Earlier checkpoints receive only explicit later-correction notes. |
| Installed Windows host/device | **Not run**; manual H01 must establish that the new installer works on Windows 11 reporting 10.0. All 42 existing live/hardware rows remain unrun. |

Portable reproduction remains the [README build sequence](../../README.md#build-and-validate). The additional actual-ZIP inspection used:

```python
import json, zipfile
from pathlib import Path
source = json.loads(Path('manifest.json').read_text())
uuid = source['UUID']
with zipfile.ZipFile(f'build/{uuid}.streamDeckPlugin') as archive:
    shipped = json.loads(archive.read(f'{uuid}.sdPlugin/manifest.json'))
    assert shipped == source
    assert next(os for os in shipped['OS'] if os['Platform'] == 'windows')['MinimumVersion'] == '10'
    assert next(os for os in shipped['OS'] if os['Platform'] == 'mac')['MinimumVersion'] == '13'
```

## New artifact and evidence boundary

**Path:** `build/io.github.scarfmeister.pear-streamdeck.streamDeckPlugin`.

**Exact local SHA-256:** `455a3a922e4b7a8767b00975cc62ddfe2462aa519883e1465157bebf48b76e07`.

The ignored installer is rebuilt, not committed or released. It supersedes the old Stage 9 hash `21872bc0…`; timestamp-dependent ZIP hashes can differ on future reproduction, so inspect resource/manifest parity as well. Version remains 2.3.0.0. Automatic validation establishes the correct metadata, not installed host/device operation. No new known automated failure remains; Windows 10 admission is not a Windows 10 host pass, and Windows 11/runtime/native-playlist acceptance remains manual.

Pear dependency is unchanged: separate `Scarfmeister/pear-desktop` branch `feature/streamdeck-playlist-api`, commit **`b5f13f65c71ca8890c08f52c7d7becde5d855be9`**, for both playlist startup modes. No Pear source or upstream PR is changed by this correction.

## Publication and exact next action

The tested correction commit is **`25e63d4906519ea57a1ea2d4bb73eb905284d65e`**, **`fix: correct Windows OS manifest version`**. It changes only the Windows manifest threshold; all local gates above ran against that exact corrected runtime configuration. The closing record is **`docs: record Windows manifest correction validation`**; its own exact SHA is retrievable with `git log -1 --format=%H --grep='^docs: record Windows manifest correction validation$' origin/dev/pear-port`. A commit cannot embed its own hash. Push both commits, fetch/verify local HEAD = remote development head and PR #1's head, verify clean CI and unchanged master, then stop. No merge/release/new stage is authorized.

**Exact recommended next action:** install this corrected package on Windows 11, record H01 with product/version/host/device and actual result, then continue the existing 42-row hardware/live-Pear matrix. Record any Windows 10/older-host test separately if attempted. Request separately authorized review/merge/release/upstream Pear work after acceptance.
