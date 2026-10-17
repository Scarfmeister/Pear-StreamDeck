# Manual acceptance session

Do not include access tokens, token-bearing URLs, passwords, or other secrets in test evidence.

## Environment

- session name: Windows baseline acceptance — 2026-10-16
- tester: Scarfmeister
- test datetime: 2026-10-16T20:39:25-05:00
- os product: Windows 11 Pro 25H2
- os build: 26200.9457
- host application: Elgato Stream Deck
- host version: 7.4.2.22730
- device model: Stream Deck Plus
- firmware: 2.0.3.7
- plugin branch: dev/pear-port
- plugin commit: a6f89eefc707d999478abce8c9e5ca8245381b09
- plugin package sha256:
- pear version:
- pear branch: feature/streamdeck-api-extensions
- pear commit: a9ea223c99ede0876343db5898b944ea5170ad1f
- api endpoint: 127.0.0.1:26538
- protocol: HTTP
- authorization mode: AUTH_AT_FIRST
- host language: English
- environment notes:

Session ID: ddc40ff0-1b1b-47ba-b896-bf991aca17d4
Definitions: baseline-2026-10-16.1 / SHA-256 f3d2d74ff4ae37c7b94be597c0f450733d6e43044f029f527e64cbbe29ed3a23

**Metadata correction note:** This session was physically executed on the Windows host recorded above. The test-runner session/source directory originated on Linux and was copied through a network share, so the original export repeated stale Linux/checkout-derived metadata in per-test blocks. Those per-test environment blocks were normalized after export to the corrected session-level Windows metadata. Recorded test observations were otherwise preserved. H06's aggregate status was corrected to **Partial** because scenario s1 is Pass and s2 remains Not Run.

Selected suite: Full current matrix — 42 rows

## Selected-suite summary

- Not Run: 17
- Pass: 14
- Fail: 4
- Blocked: 4
- Not Applicable: 0
- Partial: 3

Scenario counts: Not Run: 52, Pass: 49, Fail: 4, Blocked: 4, Not Applicable: 0, Partial: 0

Executed means a recorded Pass/Fail/Blocked scenario; N/A is a disposition, not execution.

## Unresolved results (entire session)

- H06: Partial
- R06: Partial
- K04: Fail
- K06: Fail
- K07: Partial
- P01: Fail
- P02: Blocked
- P03: Blocked
- P04: Blocked
- D03: Blocked
- D04: Fail

## Results (all recorded tests, including outside selected suite)

### H01

Manual test: H01 — Windows/macOS installer and key availability
Status: Pass

Environment:
- session name: Windows baseline acceptance — 2026-10-16
- tester: Scarfmeister
- test datetime: 2026-10-16T20:39:25-05:00
- os product: Windows 11 Pro 25H2
- os build: 26200.9457
- host application: Elgato Stream Deck
- host version: 7.4.2.22730
- device model: Stream Deck Plus
- firmware: 2.0.3.7
- plugin branch: dev/pear-port
- plugin commit: a6f89eefc707d999478abce8c9e5ca8245381b09
- plugin package sha256:
- pear version:
- pear branch: feature/streamdeck-api-extensions
- pear commit: a9ea223c99ede0876343db5898b944ea5170ad1f
- api endpoint: 127.0.0.1:26538
- protocol: HTTP
- authorization mode: AUTH_AT_FIRST
- host language: English
- environment notes:
- environment notes:

Steps:
1. Open the corrected `.streamDeckPlugin` installer; on Windows 11 record numeric OS version 10.0; confirm host prompt; place one of every key action.

Expected:
Windows 11 is not rejected by an incorrect manifest minimum of 11; the packaged Windows minimum is 10. Pear Desktop category/name and 12 keys appear; no YTMD promotional/brand assets, missing icons or startup error.

Actual:


Evidence:


Scenarios:
- s1 — Open the corrected `.streamDeckPlugin` installer: Pass
  Actual:
  Evidence:
- s2 — on Windows 11 record numeric OS version 10.0: Pass
  Actual: Edition	Windows 11 Pro
Version	25H2
Installed on	‎9/‎18/‎2025
OS build	26200.9457
Experience	Windows Feature Experience Pack 1000.26100.360.0

  Evidence:
- s3 — confirm host prompt: Pass
  Actual:
  Evidence:
- s4 — place one of every key action: Pass
  Actual:
  Evidence:

### H02

Manual test: H02 — Plus installation and layouts
Status: Pass

Environment:
- session name: Windows baseline acceptance — 2026-10-16
- tester: Scarfmeister
- test datetime: 2026-10-16T20:39:25-05:00
- os product: Windows 11 Pro 25H2
- os build: 26200.9457
- host application: Elgato Stream Deck
- host version: 7.4.2.22730
- device model: Stream Deck Plus
- firmware: 2.0.3.7
- plugin branch: dev/pear-port
- plugin commit: a6f89eefc707d999478abce8c9e5ca8245381b09
- plugin package sha256:
- pear version:
- pear branch: feature/streamdeck-api-extensions
- pear commit: a9ea223c99ede0876343db5898b944ea5170ad1f
- api endpoint: 127.0.0.1:26538
- protocol: HTTP
- authorization mode: AUTH_AT_FIRST
- host language: English
- environment notes:
- environment notes:

Steps:
1. Install; place Volume, Transport, Selector on dials plus keys; clear custom title/icon overrides.

Expected:
Dedicated dial actions appear; touch layouts occupy their own 200×100 segments, with readable PNGs/text and no overlap.

Actual:


Evidence:


Scenarios:
- s1 — Install: Pass
  Actual:
  Evidence:
- s2 — place Volume, Transport, Selector on dials plus keys: Pass
  Actual:
  Evidence:
- s3 — clear custom title/icon overrides: Pass
  Actual:
  Evidence:

### H06

Manual test: H06 — Multi Actions and retained aliases
Status: Partial

Environment:
- session name: Windows baseline acceptance — 2026-10-16
- tester: Scarfmeister
- test datetime: 2026-10-16T20:39:25-05:00
- os product: Windows 11 Pro 25H2
- os build: 26200.9457
- host application: Elgato Stream Deck
- host version: 7.4.2.22730
- device model: Stream Deck Plus
- firmware: 2.0.3.7
- plugin branch: dev/pear-port
- plugin commit: a6f89eefc707d999478abce8c9e5ca8245381b09
- plugin package sha256:
- pear version:
- pear branch: feature/streamdeck-api-extensions
- pear commit: a9ea223c99ede0876343db5898b944ea5170ad1f
- api endpoint: 127.0.0.1:26538
- protocol: HTTP
- authorization mode: AUTH_AT_FIRST
- host language: English
- environment notes:
- environment notes:

Steps:
1. Inspect host Multi Action availability; place each supported ordinary key/dial and the retained encoder aliases.

Expected:
Pear actions are not offered for Multi Actions. Ordinary keys, dedicated encoders and documented aliases still operate; no unsupported absolute-state promise appears.

Actual:


Evidence:


Scenarios:
- s1 — Inspect host Multi Action availability: Pass
  Actual: Pear actions are correctly excluded from Multi Action, Multi Action Switch, and Random Action. They are available in Key Logic, Dial Stack, Action Wheel, and Action Trigger; these should be evaluated separately for intended compatibility.
  Evidence:
- s2 — place each supported ordinary key/dial and the retained encoder aliases: Not Run
  Actual:
  Evidence:

### A01

Manual test: A01 — Default API connection
Status: Pass

Environment:
- session name: Windows baseline acceptance — 2026-10-16
- tester: Scarfmeister
- test datetime: 2026-10-16T20:39:25-05:00
- os product: Windows 11 Pro 25H2
- os build: 26200.9457
- host application: Elgato Stream Deck
- host version: 7.4.2.22730
- device model: Stream Deck Plus
- firmware: 2.0.3.7
- plugin branch: dev/pear-port
- plugin commit: a6f89eefc707d999478abce8c9e5ca8245381b09
- plugin package sha256:
- pear version:
- pear branch: feature/streamdeck-api-extensions
- pear commit: a9ea223c99ede0876343db5898b944ea5170ad1f
- api endpoint: 127.0.0.1:26538
- protocol: HTTP
- authorization mode: AUTH_AT_FIRST
- host language: English
- environment notes:
- environment notes:

Steps:
1. Enable Plugins → API Server [Beta] in Pear; set local bind 127.0.0.1:26538; start fresh connector with defaults.

Expected:
One shared connection, matching defaults, initial snapshot; status becomes Connected. No companion port/connection is used.

Actual:


Evidence:


Scenarios:
- s1 — Enable Plugins → API Server [Beta] in Pear: Pass
  Actual:
  Evidence:
- s2 — set local bind 127.0.0.1:26538: Pass
  Actual:
  Evidence:
- s3 — start fresh connector with defaults: Pass
  Actual:
  Evidence:

### A02

Manual test: A02 — First authorization and shared connection
Status: Pass

Environment:
- session name: Windows baseline acceptance — 2026-10-16
- tester: Scarfmeister
- test datetime: 2026-10-16T20:39:25-05:00
- os product: Windows 11 Pro 25H2
- os build: 26200.9457
- host application: Elgato Stream Deck
- host version: 7.4.2.22730
- device model: Stream Deck Plus
- firmware: 2.0.3.7
- plugin branch: dev/pear-port
- plugin commit: a6f89eefc707d999478abce8c9e5ca8245381b09
- plugin package sha256:
- pear version:
- pear branch: feature/streamdeck-api-extensions
- pear commit: a9ea223c99ede0876343db5898b944ea5170ad1f
- api endpoint: 127.0.0.1:26538
- protocol: HTTP
- authorization mode: AUTH_AT_FIRST
- host language: English
- environment notes:
- environment notes:

Steps:
1. Use Authorize at first request; approve once in Pear; close/reopen several PIs; add duplicate keys/dials.

Expected:
One prompt for the shared client, Authorized status, working controls, no token in panel/status/logs; added contexts reuse the connection.

Actual:


Evidence:


Scenarios:
- s1 — Use Authorize at first request: Pass
  Actual:
  Evidence:
- s2 — approve once in Pear: Pass
  Actual:
  Evidence:
- s3 — close/reopen several PIs: Pass
  Actual:
  Evidence:
- s4 — add duplicate keys/dials: Pass
  Actual:
  Evidence:

### R01

Manual test: R01 — Pear start/stop and reconnect
Status: Pass

Environment:
- session name: Windows baseline acceptance — 2026-10-16
- tester: Scarfmeister
- test datetime: 2026-10-16T20:39:25-05:00
- os product: Windows 11 Pro 25H2
- os build: 26200.9457
- host application: Elgato Stream Deck
- host version: 7.4.2.22730
- device model: Stream Deck Plus
- firmware: 2.0.3.7
- plugin branch: dev/pear-port
- plugin commit: a6f89eefc707d999478abce8c9e5ca8245381b09
- plugin package sha256:
- pear version:
- pear branch: feature/streamdeck-api-extensions
- pear commit: a9ea223c99ede0876343db5898b944ea5170ad1f
- api endpoint: 127.0.0.1:26538
- protocol: HTTP
- authorization mode: AUTH_AT_FIRST
- host language: English
- environment notes:
- environment notes:

Steps:
1. Start host before Pear; later open/load Pear; stop/restart Pear while controls are visible.

Expected:
Offline/unknown display during outage, bounded reconnect, fresh real state on recovery; queued commands are discarded and never replayed. Cold incomplete state remains unknown until available.

Actual:


Evidence:


Scenarios:
- s1 — Start host before Pear: Pass
  Actual:
  Evidence:
- s2 — later open/load Pear: Pass
  Actual:
  Evidence:
- s3 — stop/restart Pear while controls are visible: Pass
  Actual:
  Evidence:

### R02

Manual test: R02 — Host restart and settings persistence
Status: Pass

Environment:
- session name: Windows baseline acceptance — 2026-10-16
- tester: Scarfmeister
- test datetime: 2026-10-16T20:39:25-05:00
- os product: Windows 11 Pro 25H2
- os build: 26200.9457
- host application: Elgato Stream Deck
- host version: 7.4.2.22730
- device model: Stream Deck Plus
- firmware: 2.0.3.7
- plugin branch: dev/pear-port
- plugin commit: a6f89eefc707d999478abce8c9e5ca8245381b09
- plugin package sha256:
- pear version:
- pear branch: feature/streamdeck-api-extensions
- pear commit: a9ea223c99ede0876343db5898b944ea5170ad1f
- api endpoint: 127.0.0.1:26538
- protocol: HTTP
- authorization mode: AUTH_AT_FIRST
- host language: English
- environment notes:
- environment notes:

Steps:
1. Restart Stream Deck/OpenDeck after authorizing and saving per-action settings/selector selection.

Expected:
Token/settings/selection persist in host storage; one fresh Pear connection; no unnecessary approval or playback on launch. Host disk persistence is a manual gate.

Actual:


Evidence:


Scenarios:
- s1 — Restart Stream Deck/OpenDeck after authorizing and saving per-action settings/selector selection: Pass
  Actual:
  Evidence:

### R06

Manual test: R06 — Context cleanup and bounded work
Status: Partial

Environment:
- session name: Windows baseline acceptance — 2026-10-16
- tester: Scarfmeister
- test datetime: 2026-10-16T20:39:25-05:00
- os product: Windows 11 Pro 25H2
- os build: 26200.9457
- host application: Elgato Stream Deck
- host version: 7.4.2.22730
- device model: Stream Deck Plus
- firmware: 2.0.3.7
- plugin branch: dev/pear-port
- plugin commit: a6f89eefc707d999478abce8c9e5ca8245381b09
- plugin package sha256:
- pear version:
- pear branch: feature/streamdeck-api-extensions
- pear commit: a9ea223c99ede0876343db5898b944ea5170ad1f
- api endpoint: 127.0.0.1:26538
- protocol: HTTP
- authorization mode: AUTH_AT_FIRST
- host language: English
- environment notes:
- environment notes:

Steps:
1. Repeatedly switch profiles/open-close PIs; rotate rapidly, then remove actions/disconnect.

Expected:
Shared connection remains one; contexts release work; at most bounded pending inputs; no late feedback on removed contexts or replay on reappearance.

Actual:


Evidence:


Scenarios:
- s1 — Repeatedly switch profiles/open-close PIs: Pass
  Actual:
  Evidence:
- s2 — rotate rapidly, then remove actions/disconnect: Not Run
  Actual:
  Evidence:

### R07

Manual test: R07 — Release after removal/reassignment
Status: Pass

Environment:
- session name: Windows baseline acceptance — 2026-10-16
- tester: Scarfmeister
- test datetime: 2026-10-16T20:39:25-05:00
- os product: Windows 11 Pro 25H2
- os build: 26200.9457
- host application: Elgato Stream Deck
- host version: 7.4.2.22730
- device model: Stream Deck Plus
- firmware: 2.0.3.7
- plugin branch: dev/pear-port
- plugin commit: a6f89eefc707d999478abce8c9e5ca8245381b09
- plugin package sha256:
- pear version:
- pear branch: feature/streamdeck-api-extensions
- pear commit: a9ea223c99ede0876343db5898b944ea5170ad1f
- api endpoint: 127.0.0.1:26538
- protocol: HTTP
- authorization mode: AUTH_AT_FIRST
- host language: English
- environment notes:
- environment notes:

Steps:
1. Hold a key, switch profile/remove/reassign its action before release, then press a newly visible action normally.

Expected:
Release for an absent/replaced context sends no command. A matching newly visible key activates once. Record actual host lifecycle ordering, including Encoder aliases.

Actual:


Evidence:


Scenarios:
- s1 — Hold a key, switch profile/remove/reassign its action before release, then press a newly visible action normally: Pass
  Actual: No action was activated when holding a key, switching profiles, then releasing the key, which is good. New profile worked as expected.
  Evidence:

### K01

Manual test: K01 — Play / Pause
Status: Pass

Environment:
- session name: Windows baseline acceptance — 2026-10-16
- tester: Scarfmeister
- test datetime: 2026-10-16T20:39:25-05:00
- os product: Windows 11 Pro 25H2
- os build: 26200.9457
- host application: Elgato Stream Deck
- host version: 7.4.2.22730
- device model: Stream Deck Plus
- firmware: 2.0.3.7
- plugin branch: dev/pear-port
- plugin commit: a6f89eefc707d999478abce8c9e5ca8245381b09
- plugin package sha256:
- pear version:
- pear branch: feature/streamdeck-api-extensions
- pear commit: a9ea223c99ede0876343db5898b944ea5170ad1f
- api endpoint: 127.0.0.1:26538
- protocol: HTTP
- authorization mode: AUTH_AT_FIRST
- host language: English
- environment notes:
- environment notes:

Steps:
1. Play/pause/stop from Pear and from duplicate keys.

Expected:
Play icon when paused/stopped, Pause while playing; both keys follow external updates. Command acceptance alone cannot confirm state.

Actual:


Evidence:


Scenarios:
- s1 — Play/pause/stop from Pear and from duplicate keys: Pass
  Actual:
  Evidence:

### K02

Manual test: K02 — Next / Previous
Status: Pass

Environment:
- session name: Windows baseline acceptance — 2026-10-16
- tester: Scarfmeister
- test datetime: 2026-10-16T20:39:25-05:00
- os product: Windows 11 Pro 25H2
- os build: 26200.9457
- host application: Elgato Stream Deck
- host version: 7.4.2.22730
- device model: Stream Deck Plus
- firmware: 2.0.3.7
- plugin branch: dev/pear-port
- plugin commit: a6f89eefc707d999478abce8c9e5ca8245381b09
- plugin package sha256:
- pear version:
- pear branch: feature/streamdeck-api-extensions
- pear commit: a9ea223c99ede0876343db5898b944ea5170ad1f
- api endpoint: 127.0.0.1:26538
- protocol: HTTP
- authorization mode: AUTH_AT_FIRST
- host language: English
- environment notes:
- environment notes:

Steps:
1. Press Next/Previous and change tracks in Pear.

Expected:
Correct transport once per press; Track Info/transport display follows the resulting track.

Actual:


Evidence:


Scenarios:
- s1 — Press Next/Previous and change tracks in Pear: Pass
  Actual:
  Evidence:

### K03

Manual test: K03 — Like / Dislike
Status: Pass

Environment:
- session name: Windows baseline acceptance — 2026-10-16
- tester: Scarfmeister
- test datetime: 2026-10-16T20:39:25-05:00
- os product: Windows 11 Pro 25H2
- os build: 26200.9457
- host application: Elgato Stream Deck
- host version: 7.4.2.22730
- device model: Stream Deck Plus
- firmware: 2.0.3.7
- plugin branch: dev/pear-port
- plugin commit: a6f89eefc707d999478abce8c9e5ca8245381b09
- plugin package sha256:
- pear version:
- pear branch: feature/streamdeck-api-extensions
- pear commit: a9ea223c99ede0876343db5898b944ea5170ad1f
- api endpoint: 127.0.0.1:26538
- protocol: HTTP
- authorization mode: AUTH_AT_FIRST
- host language: English
- environment notes:
- environment notes:

Steps:
1. Like → press active Like to clear; Dislike → press active Dislike to clear; switch ratings/tracks.

Expected:
Native supported transitions and real fetched rating appear; Like/Dislike states are distinct. Same-track external rating may remain stale (known 3.12.0 limitation).

Actual:


Evidence:


Scenarios:
- s1 — Like → press active Like to clear: Pass
  Actual: Icons should be more different between their intendend states. The hearts should be filled instead of just their outlines being colored when the state is true. Since YouTube Music and Pear use thumbs up and down iconography, we should switch to use the same icons.
  Evidence:
- s2 — Dislike → press active Dislike to clear: Pass
  Actual:
  Evidence:
- s3 — switch ratings/tracks: Pass
  Actual:
  Evidence:

### K04

Manual test: K04 — Mute
Status: Fail

Environment:
- session name: Windows baseline acceptance — 2026-10-16
- tester: Scarfmeister
- test datetime: 2026-10-16T20:39:25-05:00
- os product: Windows 11 Pro 25H2
- os build: 26200.9457
- host application: Elgato Stream Deck
- host version: 7.4.2.22730
- device model: Stream Deck Plus
- firmware: 2.0.3.7
- plugin branch: dev/pear-port
- plugin commit: a6f89eefc707d999478abce8c9e5ca8245381b09
- plugin package sha256:
- pear version:
- pear branch: feature/streamdeck-api-extensions
- pear commit: a9ea223c99ede0876343db5898b944ea5170ad1f
- api endpoint: 127.0.0.1:26538
- protocol: HTTP
- authorization mode: AUTH_AT_FIRST
- host language: English
- environment notes:
- environment notes:

Steps:
1. Toggle mute in Pear/key; set volume to zero while unmuted; restore volume.

Expected:
Actual mute state/icon follows Pear; zero unmuted volume does not appear muted.

Actual:


Evidence:


Scenarios:
- s1 — Toggle mute externally in Pear and from key: Pass
  Actual:
  Evidence:
- s2 — Zero while unmuted remains distinct from mute: Fail
  Actual: It appears Pear reports a volume level of 0 as muted as the icon in Pear changed when the volume hit zero. Unmuting in Pear set the volume to 5%.
  Evidence:
- s3 — Restore volume and verify real mute state: Pass
  Actual:
  Evidence:

### K05

Manual test: K05 — Volume Up / Down
Status: Pass

Environment:
- session name: Windows baseline acceptance — 2026-10-16
- tester: Scarfmeister
- test datetime: 2026-10-16T20:39:25-05:00
- os product: Windows 11 Pro 25H2
- os build: 26200.9457
- host application: Elgato Stream Deck
- host version: 7.4.2.22730
- device model: Stream Deck Plus
- firmware: 2.0.3.7
- plugin branch: dev/pear-port
- plugin commit: a6f89eefc707d999478abce8c9e5ca8245381b09
- plugin package sha256:
- pear version:
- pear branch: feature/streamdeck-api-extensions
- pear commit: a9ea223c99ede0876343db5898b944ea5170ad1f
- api endpoint: 127.0.0.1:26538
- protocol: HTTP
- authorization mode: AUTH_AT_FIRST
- host language: English
- environment notes:
- environment notes:

Steps:
1. Save steps 1, 5, 7 and 100; test Up at 97 and Down at 3; submit 0/negative/decimal/text; load malformed older settings.

Expected:
Whole valid steps take effect; bounds stay 0–100; invalid edits do not save; invalid stored steps safely use 5. Display remains confirmed volume.

Actual:


Evidence:


Scenarios:
- s1 — Save and exercise step = 1: Pass
  Actual:
  Evidence:
- s2 — Save and exercise default step = 5: Pass
  Actual:
  Evidence:
- s3 — Save and exercise step = 7: Pass
  Actual:
  Evidence:
- s4 — Save and exercise step = 100: Pass
  Actual:
  Evidence:
- s5 — Up at 97 and Down at 3: bounds: Pass
  Actual:
  Evidence:
- s6 — Reject 0 / negative / decimal / text edits: Pass
  Actual:
  Evidence:
- s7 — Malformed older settings safely default to 5: Pass
  Actual: Malformed settings revert to the last stable setting or 5 if they were never correct. This is good. If the dial was set to 7 and then set to 7.5, the dial still acts as 7.
  Evidence:
- s8 — Repeated volume changes and confirmed displays: Pass
  Actual:
  Evidence:

### K06

Manual test: K06 — Track Info formats
Status: Fail

Environment:
- session name: Windows baseline acceptance — 2026-10-16
- tester: Scarfmeister
- test datetime: 2026-10-16T20:39:25-05:00
- os product: Windows 11 Pro 25H2
- os build: 26200.9457
- host application: Elgato Stream Deck
- host version: 7.4.2.22730
- device model: Stream Deck Plus
- firmware: 2.0.3.7
- plugin branch: dev/pear-port
- plugin commit: a6f89eefc707d999478abce8c9e5ca8245381b09
- plugin package sha256:
- pear version:
- pear branch: feature/streamdeck-api-extensions
- pear commit: a9ea223c99ede0876343db5898b944ea5170ad1f
- api endpoint: 127.0.0.1:26538
- protocol: HTTP
- authorization mode: AUTH_AT_FIRST
- host language: English
- environment notes:
- environment notes:

Steps:
1. Select/save all five Track Info formats; pause; test long/Unicode/missing-album/podcast metadata; enable Show Title/clear custom title.

Expected:
Correct per-key fields, bounded lines/ellipsis and localized fallbacks; supplied titles/artists remain unchanged. No remote artwork loading or stale artwork claim.

Actual:


Evidence:


Scenarios:
- s1 — Select/save all five Track Info formats: Pass
  Actual:
  Evidence:
- s2 — pause: Fail
  Actual:
  Evidence:
- s3 — test long/Unicode/missing-album/podcast metadata: Not Run
  Actual:
  Evidence:
- s4 — enable Show Title/clear custom title: Not Run
  Actual:
  Evidence:

### K07

Manual test: K07 — Shuffle
Status: Partial

Environment:
- session name: Windows baseline acceptance — 2026-10-16
- tester: Scarfmeister
- test datetime: 2026-10-16T20:39:25-05:00
- os product: Windows 11 Pro 25H2
- os build: 26200.9457
- host application: Elgato Stream Deck
- host version: 7.4.2.22730
- device model: Stream Deck Plus
- firmware: 2.0.3.7
- plugin branch: dev/pear-port
- plugin commit: a6f89eefc707d999478abce8c9e5ca8245381b09
- plugin package sha256:
- pear version:
- pear branch: feature/streamdeck-api-extensions
- pear commit: a9ea223c99ede0876343db5898b944ea5170ad1f
- api endpoint: 127.0.0.1:26538
- protocol: HTTP
- authorization mode: AUTH_AT_FIRST
- host language: English
- environment notes:
- environment notes:

Steps:
1. Toggle shuffle from Pear/key off→on→off; include a legacy queue if available.

Expected:
Real off/on images update. Unsupported legacy off alerts and remains actual on; no guessed off transition.

Actual:


Evidence:


Scenarios:
- s1 — Toggle shuffle from Pear/key off→on→off: Pass
  Actual:
  Evidence:
- s2 — include a legacy queue if available: Not Run
  Actual:
  Evidence:

### K08

Manual test: K08 — Repeat modes
Status: Pass

Environment:
- session name: Windows baseline acceptance — 2026-10-16
- tester: Scarfmeister
- test datetime: 2026-10-16T20:39:25-05:00
- os product: Windows 11 Pro 25H2
- os build: 26200.9457
- host application: Elgato Stream Deck
- host version: 7.4.2.22730
- device model: Stream Deck Plus
- firmware: 2.0.3.7
- plugin branch: dev/pear-port
- plugin commit: a6f89eefc707d999478abce8c9e5ca8245381b09
- plugin package sha256:
- pear version:
- pear branch: feature/streamdeck-api-extensions
- pear commit: a9ea223c99ede0876343db5898b944ea5170ad1f
- api endpoint: 127.0.0.1:26538
- protocol: HTTP
- authorization mode: AUTH_AT_FIRST
- host language: English
- environment notes:
- environment notes:

Steps:
1. Start at NONE; press through ALL, ONE, NONE; change repeat in Pear.

Expected:
Native documented cycle and three distinct images/labels on every copy, including external changes.

Actual:


Evidence:


Scenarios:
- s1 — Start at NONE: Pass
  Actual:
  Evidence:
- s2 — press through ALL, ONE, NONE: Pass
  Actual:
  Evidence:
- s3 — change repeat in Pear: Pass
  Actual:
  Evidence:

### P01

Manual test: P01 — Playlist configuration and validation
Status: Fail

Environment:
- session name: Windows baseline acceptance — 2026-10-16
- tester: Scarfmeister
- test datetime: 2026-10-16T20:39:25-05:00
- os product: Windows 11 Pro 25H2
- os build: 26200.9457
- host application: Elgato Stream Deck
- host version: 7.4.2.22730
- device model: Stream Deck Plus
- firmware: 2.0.3.7
- plugin branch: dev/pear-port
- plugin commit: a6f89eefc707d999478abce8c9e5ca8245381b09
- plugin package sha256:
- pear version:
- pear branch: feature/streamdeck-api-extensions
- pear commit: a9ea223c99ede0876343db5898b944ea5170ad1f
- api endpoint: 127.0.0.1:26538
- protocol: HTTP
- authorization mode: AUTH_AT_FIRST
- host language: English
- environment notes:
- environment notes:

Steps:
1. Save raw ID and accepted playlist/watch URL; close/reopen PI; try missing/duplicate `list`, wrong host, malformed encoding and blank input.

Expected:
URL normalizes to canonical case-sensitive ID; valid settings persist; invalid input reports a localized error without replacing saved configuration.

Actual:


Evidence:


Scenarios:
- s1 — Save raw ID and accepted playlist/watch URL: Fail
  Actual: The key just says "Start failed" and there is a Pear request failed (HTTP 503). It fails with public, unlisted, and private playlists.
  Evidence:
- s2 — close/reopen PI: Not Run
  Actual:
  Evidence:
- s3 — try missing/duplicate `list`, wrong host, malformed encoding and blank input: Not Run
  Actual:
  Evidence:

### P02

Manual test: P02 — Native Always Normal
Status: Blocked

Environment:
- session name: Windows baseline acceptance — 2026-10-16
- tester: Scarfmeister
- test datetime: 2026-10-16T20:39:25-05:00
- os product: Windows 11 Pro 25H2
- os build: 26200.9457
- host application: Elgato Stream Deck
- host version: 7.4.2.22730
- device model: Stream Deck Plus
- firmware: 2.0.3.7
- plugin branch: dev/pear-port
- plugin commit: a6f89eefc707d999478abce8c9e5ca8245381b09
- plugin package sha256:
- pear version:
- pear branch: feature/streamdeck-api-extensions
- pear commit: a9ea223c99ede0876343db5898b944ea5170ad1f
- api endpoint: 127.0.0.1:26538
- protocol: HTTP
- authorization mode: AUTH_AT_FIRST
- host language: English
- environment notes:
- environment notes:

Steps:
1. With extension, Always Normal from a different playlist and same playlist, old shuffle off/on; compare native normal baseline.

Expected:
Supported native command gives normal startup before audio; queue/first-track/events match native behavior. Unsafe shuffled same-playlist legacy reuse returns Unavailable/501 before dispatch, not a false normal-start pass.

Actual:


Evidence:


Scenarios:
- s1 — With extension, Always Normal from a different playlist and same playlist, old shuffle off/on: Blocked
  Actual:
  Evidence:
- s2 — compare native normal baseline: Not Run
  Actual:
  Evidence:

### P03

Manual test: P03 — Native Always Shuffle
Status: Blocked

Environment:
- session name: Windows baseline acceptance — 2026-10-16
- tester: Scarfmeister
- test datetime: 2026-10-16T20:39:25-05:00
- os product: Windows 11 Pro 25H2
- os build: 26200.9457
- host application: Elgato Stream Deck
- host version: 7.4.2.22730
- device model: Stream Deck Plus
- firmware: 2.0.3.7
- plugin branch: dev/pear-port
- plugin commit: a6f89eefc707d999478abce8c9e5ca8245381b09
- plugin package sha256:
- pear version:
- pear branch: feature/streamdeck-api-extensions
- pear commit: a9ea223c99ede0876343db5898b944ea5170ad1f
- api endpoint: 127.0.0.1:26538
- protocol: HTTP
- authorization mode: AUTH_AT_FIRST
- host language: English
- environment notes:
- environment notes:

Steps:
1. Always Shuffle from same/different playlist and old shuffle off/on; compare native Shuffle Play; repeat several trials.

Expected:
One native shuffle-start dispatch before playback, no normal-start/enable-shuffle/skip sequence. A first track selected by chance proves neither success nor failure; verify command and queue semantics.

Actual:


Evidence:


Scenarios:
- s1 — Always Shuffle from same/different playlist and old shuffle off/on: Blocked
  Actual:
  Evidence:
- s2 — compare native Shuffle Play: Not Run
  Actual:
  Evidence:
- s3 — repeat several trials: Not Run
  Actual:
  Evidence:

### P04

Manual test: P04 — Follow real shuffle state
Status: Blocked

Environment:
- session name: Windows baseline acceptance — 2026-10-16
- tester: Scarfmeister
- test datetime: 2026-10-16T20:39:25-05:00
- os product: Windows 11 Pro 25H2
- os build: 26200.9457
- host application: Elgato Stream Deck
- host version: 7.4.2.22730
- device model: Stream Deck Plus
- firmware: 2.0.3.7
- plugin branch: dev/pear-port
- plugin commit: a6f89eefc707d999478abce8c9e5ca8245381b09
- plugin package sha256:
- pear version:
- pear branch: feature/streamdeck-api-extensions
- pear commit: a9ea223c99ede0876343db5898b944ea5170ad1f
- api endpoint: 127.0.0.1:26538
- protocol: HTTP
- authorization mode: AUTH_AT_FIRST
- host language: English
- environment notes:
- environment notes:

Steps:
1. Follow mode with actual shuffle off/on; externally change shuffle just before press; test unknown-state session.

Expected:
Mode captures current real state; unknown gets one bounded refresh or clear failure without guessed startup. Keys and dials behave consistently.

Actual:


Evidence:


Scenarios:
- s1 — Follow mode with actual shuffle off/on: Blocked
  Actual:
  Evidence:
- s2 — externally change shuffle just before press: Not Run
  Actual:
  Evidence:
- s3 — test unknown-state session: Not Run
  Actual:
  Evidence:

### D01

Manual test: D01 — Volume Dial
Status: Pass

Environment:
- session name: Windows baseline acceptance — 2026-10-16
- tester: Scarfmeister
- test datetime: 2026-10-16T20:39:25-05:00
- os product: Windows 11 Pro 25H2
- os build: 26200.9457
- host application: Elgato Stream Deck
- host version: 7.4.2.22730
- device model: Stream Deck Plus
- firmware: 2.0.3.7
- plugin branch: dev/pear-port
- plugin commit: a6f89eefc707d999478abce8c9e5ca8245381b09
- plugin package sha256:
- pear version:
- pear branch: feature/streamdeck-api-extensions
- pear commit: a9ea223c99ede0876343db5898b944ea5170ad1f
- api endpoint: 127.0.0.1:26538
- protocol: HTTP
- authorization mode: AUTH_AT_FIRST
- host language: English
- environment notes:
- environment notes:

Steps:
1. Rotate volume both ways with default/custom steps and near bounds; press; change volume/mute externally.

Expected:
Signed step behavior/clamp, true mute, actual percentage/indicator/icon; press or rotation alone does not assume a result.

Actual:


Evidence:


Scenarios:
- s1 — Rotate both directions with default step: Pass
  Actual:
  Evidence:
- s2 — Rotate both directions with custom steps: Pass
  Actual:
  Evidence:
- s3 — Rotate near lower and upper bounds: Pass
  Actual:
  Evidence:
- s4 — Press toggles true mute: Pass
  Actual:
  Evidence:
- s5 — External volume/mute changes and confirmed feedback: Pass
  Actual:
  Evidence:

### D02

Manual test: D02 — Transport Dial
Status: Pass

Environment:
- session name: Windows baseline acceptance — 2026-10-16
- tester: Scarfmeister
- test datetime: 2026-10-16T20:39:25-05:00
- os product: Windows 11 Pro 25H2
- os build: 26200.9457
- host application: Elgato Stream Deck
- host version: 7.4.2.22730
- device model: Stream Deck Plus
- firmware: 2.0.3.7
- plugin branch: dev/pear-port
- plugin commit: a6f89eefc707d999478abce8c9e5ca8245381b09
- plugin package sha256:
- pear version:
- pear branch: feature/streamdeck-api-extensions
- pear commit: a9ea223c99ede0876343db5898b944ea5170ad1f
- api endpoint: 127.0.0.1:26538
- protocol: HTTP
- authorization mode: AUTH_AT_FIRST
- host language: English
- environment notes:
- environment notes:

Steps:
1. Rotate transport ±1/multiple detents; press once; test paused/stopped/external playback.

Expected:
One Next/Previous per accepted detent, one play/pause on release, current real playback/title/artist. Oversized/error/disconnected work is bounded/discarded.

Actual:


Evidence:


Scenarios:
- s1 — Rotate transport ±1/multiple detents: Pass
  Actual:
  Evidence:
- s2 — press once: Pass
  Actual:
  Evidence:
- s3 — test paused/stopped/external playback: Pass
  Actual:
  Evidence:

### D03

Manual test: D03 — Playlist Selector list and wrapping
Status: Blocked

Environment:
- session name: Windows baseline acceptance — 2026-10-16
- tester: Scarfmeister
- test datetime: 2026-10-16T20:39:25-05:00
- os product: Windows 11 Pro 25H2
- os build: 26200.9457
- host application: Elgato Stream Deck
- host version: 7.4.2.22730
- device model: Stream Deck Plus
- firmware: 2.0.3.7
- plugin branch: dev/pear-port
- plugin commit: a6f89eefc707d999478abce8c9e5ca8245381b09
- plugin package sha256:
- pear version:
- pear branch: feature/streamdeck-api-extensions
- pear commit: a9ea223c99ede0876343db5898b944ea5170ad1f
- api endpoint: 127.0.0.1:26538
- protocol: HTTP
- authorization mode: AUTH_AT_FIRST
- host language: English
- environment notes:
- environment notes:

Steps:
1. Save 0, 1, several and 16 selector entries; rotate/wrap; edit/remove/reorder; restart; use duplicate selectors.

Expected:
Empty is explicit; one remains selected; wrapping/bounds/position persistence work; duplicates are independent. Rotation never plays or overwrites an unsaved PI draft.

Actual:


Evidence:


Scenarios:
- s1 — Save 0, 1, several and 16 selector entries: Blocked
  Actual:
  Evidence:
- s2 — rotate/wrap: Not Run
  Actual:
  Evidence:
- s3 — edit/remove/reorder: Not Run
  Actual:
  Evidence:
- s4 — restart: Not Run
  Actual:
  Evidence:
- s5 — use duplicate selectors: Not Run
  Actual:
  Evidence:

### D04

Manual test: D04 — Playlist Selector images and startup
Status: Fail

Environment:
- session name: Windows baseline acceptance — 2026-10-16
- tester: Scarfmeister
- test datetime: 2026-10-16T20:39:25-05:00
- os product: Windows 11 Pro 25H2
- os build: 26200.9457
- host application: Elgato Stream Deck
- host version: 7.4.2.22730
- device model: Stream Deck Plus
- firmware: 2.0.3.7
- plugin branch: dev/pear-port
- plugin commit: a6f89eefc707d999478abce8c9e5ca8245381b09
- plugin package sha256:
- pear version:
- pear branch: feature/streamdeck-api-extensions
- pear commit: a9ea223c99ede0876343db5898b944ea5170ad1f
- api endpoint: 127.0.0.1:26538
- protocol: HTTP
- authorization mode: AUTH_AT_FIRST
- host language: English
- environment notes:
- environment notes:

Steps:
1. Add bounded PNG/JPEG images; switch entries including default-image entry; press with each mode; rotate before delayed failure.

Expected:
Correct selected image/name/index/mode; stock/unsupported mode fails honestly. A delayed result cannot mark another selection as failed. IDs and selected index persist.

Actual:


Evidence:


Scenarios:
- s1 — Add bounded PNG/JPEG images: Fail
  Actual: When saving the action settings, the image file entry is cleared.
  Evidence:
- s2 — switch entries including default-image entry: Not Run
  Actual:
  Evidence:
- s3 — press with each mode: Not Run
  Actual:
  Evidence:
- s4 — rotate before delayed failure: Not Run
  Actual:
  Evidence:

## Selected-suite tests still Not Run

- H03 — OpenDeck package import
- H04 — OpenDeck/Flatpak loopback
- H05 — Current and minimum host compatibility
- A03 — Denied/interrupted approval recovery
- A04 — Revoked authorization recovery
- A05 — No authorization (NONE)
- A06 — Endpoint/protocol validation
- R03 — API disable/re-enable
- R04 — WebSocket reconnect and duplicates
- R05 — Known silent half-open limitation
- K09 — Failure and state truthfulness
- P05 — Stock Pear and unavailable controls
- P06 — Concurrent startup and cancellation
- D05 — Current touch, press and encoder aliases
- I01 — PI settings, drafts and persistence
- I02 — English / German / French UI
- I03 — Icons and readability

Prior evidence is context only; no historical result was imported as a current Pass.
