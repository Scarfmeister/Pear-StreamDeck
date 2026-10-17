# Localization

Checked during Stage 8 on 2026-10-05. The canonical source language is **English (`en.json`)**. Supported locales are **English, German (`de.json`), and French (`fr.json`)**. These are every locale JSON inherited from [XeroxDev/YTMD-StreamDeck at `8b0c3320ce59b741b3165a1c8ac3a54b66c2c97a`](https://github.com/XeroxDev/YTMD-StreamDeck/tree/8b0c3320ce59b741b3165a1c8ac3a54b66c2c97a). No supported locale was deleted and no new locale was added. Original MIT attribution is retained.

## Inventory and restoration

[localization-inventory.json](localization-inventory.json) records every starting and final English leaf key, missing translated keys, changed English-copy values, removed identifiers, reused upstream translations, and newly translated keys. Stage 8 started at `f7b1ce245b3b015d5603e4e05754d1bd7f09619f`.

| Inventory item | Finding |
| --- | --- |
| Starting `en.json` | 72 leaf keys: root identity/description, eleven key actions, and the old companion Property Inspector namespace. |
| Starting German/French | Both lack `Localization.PI.CUSTOM_LAYOUT_FILE`, `DISPLAY_TITLE`, `VAR_USAGE_CUSTOMLAYOUT`, and `VAR_USAGE_TITLE`. Most existing translations survived the port. |
| English values introduced during the port | `Name`, `Category`, and `Description` in both translated files changed to the new English wording. Name/category are intentional Pear product names; the description needed translation. New active Pear forms/dials/help/errors were also English outside the old resources. The previous status note overstated the extent of English replacement. |
| Removed keys | All 47 `Localization.PI.*` identifiers were retired with the old bindings. Companion approval-code comparison, saved-library refresh/rate-limit messages, custom layouts, time/custom title variables, and obsolete YTMD references do not describe active Pear behavior. Common concepts remain under `Localization.Strings`. No stale action UUID remains. |
| Final required resources | **204 leaf keys per locale**, including 15 action names/tooltips, matching state arrays/encoder descriptions, and **136 active runtime strings**. Dynamic Repeat uses distinct PNGs and translated Off/All/One runtime labels; its manifest has one initial state, consistently localized. |

Reusable transport, mute, volume, repeat and several Track Info/shuffle names, tooltips, plus Host/Port/Playlist/Connected/Play/Pause concepts retain upstream translations where their meaning is unchanged. The inventory lists the exact reused paths (17 German, 21 French). Materially changed descriptions, native rating behavior, metadata wording, playlist startup modes, all dedicated dial descriptions, connection/authentication/retry statuses, validation errors, image controls, and Pear-specific help were translated from the final English wording. Newly translated paths are listed separately; array labels can reuse the corresponding translated action/control wording.

## Intentional identical strings and identifiers

[localization-exceptions.json](localization-exceptions.json) is an explicit per-locale, per-leaf allowlist with a reason for every correctly identical value. It covers stable Pear Desktop Connector/Pear Desktop names; standard networking terms such as Port/HTTPS (Host in German); shared local words such as Album/Pause/Normal; German Name; French Image/Volume; the established Playlist loanword; and German Pear offline, including its compact newline variant. These are deliberate localized terms, not English placeholders. There is no blanket exception for all labels or descriptions.

Keep Pear Desktop, API Server (Pear's plugin name), Stream Deck, Stream Deck Plus, OpenDeck, YouTube/YouTube Music, PNG/JPEG, HTTP/HTTPS, KiB and relevant product/protocol names intact inside translated prose. URLs, UUID keys, setting keys and option values (`TITLE_ARTIST`, `FOLLOW_SHUFFLE_STATE`, etc.), API routes/error codes, `list`, and IDs are programmatic values and remain unchanged. Song metadata and user-entered playlist names are displayed as supplied, even when they happen to match an English UI term.

## Runtime and validation

The [official localization guide](https://docs.elgato.com/streamdeck/sdk/guides/i18n/) establishes root locale files and action/state localization. The retained HTML framework supplies the host application language. A small bundled `src/streamdeck/localization.ts` adapter supplies static PI text, placeholders, dynamic editor controls, safe parameter substitution, error templates, and compact key/dial status/fallback labels from the same files. Regional `de-*`/`fr-*` variants select the base locale; other host languages fall back to English. Text is assigned with `textContent`; actual metadata/settings values are never passed through a general translation operation. No second settings/state store or network connection was introduced.

```sh
npm run validate:localization
npm test
```

`npm test` runs validation before bundling tests; CI and the release build workflow both run it. `scripts/validate-localization.js` parses JSON; checks all inherited locales; exact required keys and manifest action/state/encoder parity; object/array structure; nonblank strings; parameter preservation; obsolete companion branding/keys; the complete documented English key inventory; and PI binding keys. It rejects exact English copies and any identical leaf without its documented reason, including stale exceptions. Fault-injection tests exercise malformed JSON, missing locales/keys, obsolete keys/actions, wrong state arrays/encoder descriptions, parameter loss, and English placeholders. Browser tests verify German/French status/errors and unchanged settings dispatch; metadata/fallback tests verify no accidental translation of track text.

Stage 8's automatic validation passes. German and French are complete authored translations, **not native-speaker-certified**. Native speakers should review idiomatic playlist/native Shuffle Play terminology, short repeat/offline/mute labels, and the longer authentication/setup help. Real Stream Deck/OpenDeck language selection, accented glyphs, truncation and dial/key readability remain manual acceptance in [MANUAL_TESTING.md](MANUAL_TESTING.md). English remains available throughout.
