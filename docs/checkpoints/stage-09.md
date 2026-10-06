# Stage 9 — Final audit, defect correction, PR and handoff

**Authorized followup:** the [Windows-version correction](stage-09-windows-version-fix.md) supersedes this checkpoint's package/acceptance target. The earlier manifest minimum `11` was incorrect for Windows 11's reported OS version 10.0; the new installer uses minimum `10`. Historical test counts/results/commits below remain the Stage 9 record and did not prove live Windows installation.

Checked 2026-10-06 UTC / 2026-10-05 America/Chicago. Final automated engineering stage; no physical host/device or signed-in native playlist session was available.

## Scope and authoritative starting state

Fetch/pull, checkout and recent-history inspection confirmed clean `dev/pear-port` at **`c599dc2095463a5312b9f0c5e1f3f9d09a3fba2c`** before edits. Read the root instructions, complete canonical specification/status/decisions/manual plan, Stage 4–8 checkpoints and relevant architecture, Stage 3 spike, localization and research records. Review covered the complete `master...dev/pear-port` diff, the retained upstream files, actual runtime/bundle boundaries and lockfile/CI/package resources. The default baseline stays **`8b0c3320ce59b741b3165a1c8ac3a54b66c2c97a`** and remains an ancestor of the development branch.

This stage audits every substantive requirement, fixes scoped non-hardware defects, performs clean validation, opens the authorized fork PR, and creates durable final records. No SDK/runtime replacement, Pear source change, upstream Pear PR, merge, release or next-stage work is included.

## Completed work and changed components

1. Created [REQUIREMENTS_STATUS.md](../REQUIREMENTS_STATUS.md): R01–R62 requirement rows, L01–L07 explicit remaining boundaries and F01–F06 defects/dispositions, using the requested exact classifications with code/tests/research/manual evidence. Automatically verified logic, expected protocol compatibility and unrun hardware/native behavior are distinguished.
2. Removed **25 unused legacy files**: companion entries, old action/PI implementations, their unused interfaces/shared helpers and the example layout. Removed `ytmdesktop-ts-companion` and unused `intl-messageformat`; original upstream history and MIT remain intact. Current actions still share the same client/model; no Pear implementation is copied.
3. Corrected ordinary-key dispatch: a key release must match the visible action/context. Absent/disappeared/reassigned contexts and Encoder/Multi Action events do not dispatch. Two new tests exercise lifecycle/controller rejection and valid-key behavior. Removed the dead Dials pending rendering path.
4. Disabled unsupported inherited Multi Action flags on all 15 manifest actions and rejected Multi Action appearances/releases. Requested-state semantics were not implemented; regular keys and dedicated/alias encoders remain supported. D019 records this deliberately deferred extra and the removed legacy timing/layout/library options.
5. Replaced deprecated Husky 3/commitlint tooling with **Husky 9.1.7 / commitlint CLI and conventional config 21.2.3**, updated the lockfile, Node 24 engine and tracked `--edit` hook. Full dependency audit now has **zero findings**; all seven Stage 8 development findings are resolved.
6. Added `scripts/validate-source.js` / `npm run lint`, also run by `npm test`: current action/manifest identity, one client/socket owner, no PI transport, DOM IDs/references, exact dependencies, known stale source/markers, repository boundary, truthful Multi Action flags, actual hook/prepare files, issue branding and JS syntax. TypeScript separately checks source/tests; this is not a new style formatter.
7. Updated fork CODEOWNERS, Pear issue forms/token-redaction instructions and the actual Node-test VS Code launch. Preserved license/author attribution. Complete review found no unresolved current stale UUID, runtime token logging, missing PI resource, locale placeholder/structure defect or copied Pear source.
8. Updated README/current status/decisions/manual plan and current research followups; created [HANDOFF.md](../HANDOFF.md). Retained earlier checkpoints as historical evidence. Added H06/R07 acceptance rows; all **42 physical/live rows remain Not run**.
9. Pushed code before opening **[PR #1](https://github.com/Scarfmeister/Pear-StreamDeck/pull/1)**: `Scarfmeister/Pear-StreamDeck:dev/pear-port` → the same fork's `master`. It summarizes architecture/client/auth/REST/WS/keys/PI/Plus/playlists/native extension/OpenDeck/tests/package/manual/license and links durable records. No merge or release occurs.

One publication mistake was caught before PR creation: the inherited `.*/` rule made the first `git add` omit the new hook files. Other staged changes were committed even though that add returned nonzero. The followup commit explicitly allows `.husky/`, tracks its hook/ignore file, and adds a source assertion for their presence. Commit-hook execution and clean CI at the final implementation SHA pass. No hook files or source corrections remain unpublished.

## Exact clean validation commands and results

Tools: **Node 24.21.0**, npm **10.9.7**, locked TypeScript **5.9.3**, esbuild **0.25.12**, framework **3.3.4**, official Elgato CLI **1.10.1** / schemas **0.5.1**, Python 3. Plugin package 2.3.0 / manifest 2.3.0.0 / SDKVersion 2 are unchanged development identifiers.

On this workstation `/usr/bin/npm` uses a fixed Node 22 launcher. Setting PATH alone changes its child tools but not npm's own Node. A lock-only refresh used npm 10.9.7/Node 22.22.2 and warned about the newly explicit root Node 24 requirement; the clean installation below invokes npm through Node 24 and passes without that warning. An initial sandboxed registry refresh stalled and was interrupted; the authorized outside-sandbox retry passed. These environment attempts are not validation successes or project test failures.

The lock refresh command was `env PATH=/tmp/pear-stage04-tools/node_modules/.bin:/usr/local/bin:/usr/bin:/bin npm install --package-lock-only --ignore-scripts --no-audit`. The complete clean install/check/build/pack commands actually used are:

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

| Check | Observed result / limit |
| --- | --- |
| Clean locked install | Exit 0; 80 platform-applicable packages added, 81 including root audited; hook prepare runs. The larger lock graph includes optional-platform esbuild packages. |
| Source lint / source and test types | Exit 0; 22 active TS files, all 15 unique Pear actions, no source-contract/JS syntax/type errors. Final hook guard also passes in CI. |
| Normal complete suite / individual runner | Both exit 0; **124 tests in 11 files**, zero failures/cancellations/skips. Default Node 24 isolation reports 11 file results; the explicit individual runner reports all 124 cases. |
| Localization / browser entry | Pass: en/de/fr, 204 required leaf keys /136 active strings each; matching manifest/state/encoder structure, no English copies or undocumented placeholders. Fault and actual bundle/PI VM tests pass. |
| Optional Pear integration | Exit 0; actual route/broker/adapter/client over loopback HTTP, six startup mode/state cases, auth, safe native 501, post-permit unknown 503, abort/late browse and no replay. Native IPC/state are simulated; not signed-in audio. |
| Clean browser build / canonical preparation | Exit 0; build replaces ignored output and bundles only current plugin/PI entries; canonical/built manifest parity passes. |
| Official current manifest validation / pack | Exit 0, zero errors; force-refresh of current official rules succeeds. One intentional Category Pear Desktop / Name Pear Desktop Connector warning (D003), no ambiguous image reference or bypass. |
| Real ZIP/resource/Linux checks | Exit 0; 59 exact files /381,402 unpacked bytes, CRC/resources/PNG dimensions/distinct states/canonical+Linux view/MIT pass. |
| Full dependency audit | Exit 0; **zero vulnerabilities at every severity**, including development packages. This supersedes Stage 8's seven findings; no prediction about future advisories. |
| Commit message tooling | Valid fixture passed: `env PATH=/tmp/pear-stage04-tools/node_modules/.bin:/usr/local/bin:/usr/bin:/bin npx --no -- commitlint --edit /tmp/pear-stage09-good-message.txt`. Same command with `/tmp/pear-stage09-bad-message.txt` returned expected exit 1 for invalid type/subject; both real source commits passed the hook. |
| Preservation / current documentation | Original LICENSE/PROJECT_SPEC/AGENTS and Stage 4–8 checkpoint bytes preserved; default unchanged/ancestor; **152 local Markdown targets/anchors in 30 files**, **six issue/workflow YAML files** (installed js-yaml 4.3.2), **75 exact classified requirement/limit/defect IDs** and **42 distinct unrun manual IDs** pass. Recorded installer digest/size rechecked; whitespace/source publication checked. |
| GitHub clean CI | [Run 37393588427](https://github.com/Scarfmeister/Pear-StreamDeck/actions/runs/37393588427) at final implementation SHA **5589784** passes locked install, types/full tests, build, official validate/pack, archive and artifact upload. Closing docs head is checked again after push. |
| Host/device/sign-in acceptance | **Not run**. No Windows/macOS Stream Deck, OpenDeck/Linux/Flatpak, real authorization/settings disk persistence, physical glyph/event/Plus or signed-in native audio/queue pass is implied. |

Portable reproduction uses the commands in [README](../../README.md#build-and-validate) / [handoff](../HANDOFF.md#build-checks-and-artifact), with Node 24+ as the actual npm runtime. Useful source links/tool versions and implementation effects are persisted in [final audit/dependency research](../research/final-audit-and-dependencies.md) and [packaging research](../research/elgato-build-and-packaging.md). The source corrections are covered by local tests plus fresh CI; closing documentation changes do not alter runtime resources and do not require another local package build.

## Installer

- Path/name: **`build/io.github.scarfmeister.pear-streamdeck.streamDeckPlugin`** (ignored build output; no committed binary/public release).
- Exact local SHA-256: **`21872bc0d46aa1204854a3f7e0965ed130f7ea39467829d1092cbc4c8e66e6e6`**.
- ZIP content: **59 files /381,402 unpacked bytes**. Different rebuild timestamps can change the ZIP digest; real resource/canonical/Linux/archive checks establish content.
- Reproduce: clean locked install → lint/types/tests → build → canonical preparation → official validate/pack → archive validator, as above. CI uploads the `streamdeck-plugin` development artifact from each successful run; confirm its commit before physical testing.

## Separate Pear status and upstream plan

Stage 9 remotely verified **Scarfmeister/pear-desktop**, default `master`, fork of `pear-devs/pear-desktop`, with `feature/streamdeck-playlist-api` still at **`b5f13f65c71ca8890c08f52c7d7becde5d855be9`** and fork master **`a8830222afffb4af98aaa9b19287ebc24952605b`**. Its separate checkout is clean. Read-only commands were `git ls-remote origin refs/heads/master refs/heads/feature/streamdeck-playlist-api` in that checkout and `gh repo view Scarfmeister/pear-desktop --json nameWithOwner,parent,defaultBranchRef,url`.

The extension adds general-purpose authenticated `POST /api/v1/play-playlist`, resolving the supplied native requested-playlist Play/Shuffle Play command before one guarded dispatch. Both playlist execution modes require it; stock Pear 3.12.0 supports the other controls and settings but lacks startup. The plugin requires a matching dispatch acknowledgment and keeps real state independent. There is no normal-start/shuffle/skip workaround. Unsafe legacy shuffled same-playlist normal reuse rejects with 501; unknown post-permit outcomes are honest failures without replay. [Complete endpoint/paths/auth/examples/tests](../research/pear-playlist-api-extension.md).

No Pear source was edited, no upstream PR opened/merged, and no full Pear-suite rerun is claimed. Stage 7's 39-test/type/build/changed-file lint evidence and 17 inherited format failures /17 lint warnings remain historical. The Stage 9 actual-HTTP integration passes with synthetic native state. After signed-in acceptance, rebase/revalidate against current upstream, refresh website fixtures when needed, rerun Pear's complete relevant gates and disclose conservative reuse/baseline limitations. Open a focused upstream Pear PR only after explicit authorization.

## Known limitations, manual work and next action

No unresolved stage-caused automated failure or major architectural defect remains. Existing limits are individually classified in the matrix: stock route absence; cold cached defaults; absent pushed ratings; legacy shuffle-off; unsafe native normal reuse; silent half-open connection detection; nonportable dynamic host stacks; host title/glyph/disk acknowledgment limits. Artwork and extra legacy/Multi Action modes are justified omissions. Native website variants can reject safely; they are not guaranteed from fixtures.

All 42 physical/live rows in [MANUAL_TESTING.md](../MANUAL_TESTING.md#stage-8-release-validation-matrix) remain Not run. Required gates include installer/WebView/Flatpak networking, real auth/NONE/revocation/persistence/restarts/reconnect, every state-aware key, Plus detents/release/touch/selector, PI save/drafts, key reassignment lifecycle, locale/native-speaker/icon readability, and signed-in native normal/Shuffle Play/first-audio/queue/lifecycle behavior. Expected source compatibility is separate from physical results.

**Exact recommended next action:** perform the recorded manual hardware/live-Pear acceptance matrix using the Stage 9 plugin and pinned Pear extension, commit sanitized actual results and fix observed defects. Then request separately authorized PR review/merge, public version/release and any upstream Pear contribution. There is no automatic Stage 10. Stage 9 ends after its closing commit, push, remote/PR-head verification and handoff.

## Commits, PR and final head

| Reference | SHA / evidence |
| --- | --- |
| Stage 9 starting head | `c599dc2095463a5312b9f0c5e1f3f9d09a3fba2c` |
| Main audit corrections | **`2f8daa9de47e61466b13ac609a57dc36c4488ff3`**, `fix: close final audit defects`; [CI pass](https://github.com/Scarfmeister/Pear-StreamDeck/actions/runs/37393489456). |
| Final tested implementation | **`5589784ca877ab49c1dacce2323c04345594d279`**, `fix: track the commit hook configuration`; [CI pass](https://github.com/Scarfmeister/Pear-StreamDeck/actions/runs/37393588427). |
| Pear final extension | **`b5f13f65c71ca8890c08f52c7d7becde5d855be9`**, separate branch unchanged/reverified. |
| Fork PR | **[PR #1](https://github.com/Scarfmeister/Pear-StreamDeck/pull/1)**, open/unmerged; created after both source commits were pushed. |
| Closing documentation/final remote head | Commit subject **`docs: complete final audit and handoff`**, containing this checkpoint/requirements/handoff and current documentation. Exact SHA is obtained below; a commit cannot store its own SHA. The final user handoff reports the independently verified full closing SHA. |

The closing procedure commits/pushes the documentation, fetches origin, confirms clean local HEAD = remote `dev/pear-port`, checks unchanged master and implementation ancestry, then verifies PR head equality and successful CI. Durable exact-head retrieval, including after future commits:

```sh
git fetch origin
git log -1 --format=%H --grep='^docs: complete final audit and handoff$' origin/dev/pear-port
git rev-parse HEAD origin/dev/pear-port origin/master
git status --short --branch
gh pr view 1 --repo Scarfmeister/Pear-StreamDeck --json url,state,mergedAt,baseRefName,headRefName,headRefOid,statusCheckRollup
```

No merge, release, upstream Pear PR or subsequent stage follows these checks.
