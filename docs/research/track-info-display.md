# Track Info title/layout limits

Stage 5 investigation, 2026-10-04. Reviewed readable metadata formats and the host's title controls.

## Sources

- Elgato [key titles](https://docs.elgato.com/streamdeck/sdk/guides/keys/#titles), [setTitle protocol](https://docs.elgato.com/streamdeck/sdk/references/websocket/plugin/#settitle), and [manifest state fields](https://docs.elgato.com/streamdeck/sdk/references/manifest/), documentation read on the investigation date, version 3.0.0.
- Repository `manifest.json` Track Info state, `src/actions/pear-key-actions.ts`, and Stage 4 `docs/research/standard-key-actions.md`; locked framework 3.3.4 `setTitle` implementation.

## Conclusions and implementation effect

Titles overlay the key image. The manifest provides font, title visibility, and top/middle/bottom alignment; users can override presentation. A custom user title can prevent plugin title updates. The documented command supplies text rather than measured wrapping or independently styled metadata rows. It does not establish a universal character/line capacity across devices/fonts.

Keep the Stage 4 formatter: one metadata field per explicit newline, at most three lines, each bounded to twelve Unicode code points with ellipsis; collapse embedded whitespace and use missing-data fallbacks. Stage 5 exposes Title, Artist, Title + Artist (default), Album, and Title + Artist + Album. Retain the existing centered 10-point title. These are conservative implementation choices, not a guarantee that twelve wide CJK/emoji characters fit every host. Full metadata stays in the shared song model. No scrolling, per-tick title resend, or unstable artwork loading is added.

## Assumptions and unresolved questions

Check one/two/three lines, wide glyphs, combining sequences, title visibility/font changes, and custom-title overrides on a normal key and both hosts. Clear a custom host title and enable Show Title if metadata is hidden. Three-line layout and physical readability are manual acceptance; automated tests verify format selection, bounded text, and missing fields. Artwork remains deferred for the reliability reasons recorded in Stage 4.
