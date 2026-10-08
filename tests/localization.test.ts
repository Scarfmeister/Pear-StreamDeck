import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {locale, localizeDocument, translator} from '../src/streamdeck/localization';
import {formatTrackInfo} from '../src/actions/pear-key-actions';
import {PlaylistInputError} from '../src/pear/playlist';
import {SONG} from './helpers';

const {validate, validateResources} = require('../scripts/validate-localization.js');
const read = (file: string) => JSON.parse(readFileSync(file, 'utf8'));
const resources = () => ({en: read('en.json'), de: read('de.json'), fr: read('fr.json')});
const check = (r: ReturnType<typeof resources>) =>
    validateResources(r, read('docs/localization-exceptions.json'), read('manifest.json'));
const uuid = 'io.github.scarfmeister.pear-streamdeck.play-pause';

test('all inherited locales, manifest actions/states, PI strings, and explicit identical terms validate', () => {
    assert.equal(validate(process.cwd()).locales, 3);
    assert.ok(check(resources()) > 200);
});

const broken: [string, (r: ReturnType<typeof resources>) => void][] = [
    ['missing locale', r => { delete (r as Partial<typeof r>).fr; }],
    ['missing translation', r => { delete r.de.Localization.Strings.Reauthorize; }],
    ['removed companion key', r => { r.en.Localization.PI = {OLD: 'Old'}; }],
    ['stale action UUID', r => { r.en['io.github.scarfmeister.pear-streamdeck.removed'] = r.en[uuid]; }],
    ['state array mismatch', r => { r.fr[uuid].States.pop(); }],
    ['encoder description mismatch', r => { delete r.de[uuid].Encoder.TriggerDescription.Push; }],
    ['exact English copy', r => { r.de = structuredClone(r.en); }],
    ['undocumented English placeholder', r => { r.fr.Localization.Strings.Reauthorize = 'Reauthorize'; }],
    ['parameter mismatch', r => { r.fr.Localization.Strings['; retry in {seconds}s'] = 'Réessayer'; }],
    ['obsolete branding', r => { r.de.Description = 'YTMD Connector'; }],
];
for (const [reason, change] of broken) test(`localization rejects ${reason}`, () => {
    const r = resources(); change(r); assert.throws(() => check(r));
});

test('malformed locale JSON fails before packaging', () => {
    const root = mkdtempSync(join(tmpdir(), 'pear-locale-test-'));
    try {
        writeFileSync(join(root, 'en.json'), readFileSync('en.json'));
        writeFileSync(join(root, 'de.json'), '{"Name":');
        assert.throws(() => validate(root), SyntaxError);
    } finally { rmSync(root, {recursive: true, force: true}); }
});

test('locale selection handles regional hosts and fallback; parameters remain literal and errors are translated', () => {
    assert.equal(locale('de-AT'), 'de'); assert.equal(locale('fr_CA'), 'fr');
    assert.equal(locale(undefined), 'en'); assert.equal(locale('zh'), 'en');
    const de = translator('de'), fr = translator('fr');
    assert.equal(de('Connected'), 'Verbunden'); assert.equal(fr('Connected'), 'Connecté');
    assert.ok(de('; retry in {seconds}s', {seconds: 3}).includes('3'));
    assert.ok(fr('Playlist 2 needs a valid playlist URL or ID.').includes('2'));
    assert.ok(!fr(new PlaylistInputError().message).startsWith('Enter'));
    assert.ok(de('Pear request failed (HTTP 401).').includes('HTTP 401'));
    assert.ok(fr('Pear request failed (not-connected).').includes('not-connected'));
    assert.ok(de('Pear request failed ({code}).', {code: '$&<img>'}).includes('$&<img>'));
    assert.equal(fr('Unrecognized message'), 'Unrecognized message');
});

test('document localization writes text and placeholders safely, leaving field values and IDs intact', () => {
    const caption = {dataset: {i18n: 'Connected'}, textContent: ''};
    const input = {dataset: {i18nPlaceholder: 'Playlist URL or ID'}, placeholder: '', value: 'PL_MyID', id: 'playlistInput'};
    const doc = {documentElement: {lang: ''}, querySelectorAll: (selector: string) =>
        selector === '[data-i18n]' ? [caption] : [input]};
    localizeDocument(doc as unknown as Document, 'fr-CA');
    assert.equal(doc.documentElement.lang, 'fr'); assert.equal(caption.textContent, 'Connecté');
    assert.ok(input.placeholder.includes('playlist')); assert.equal(input.value, 'PL_MyID');
    assert.equal(input.id, 'playlistInput');
});

test('localized Track Info fallbacks preserve actual metadata even when it is also an English UI term', () => {
    const fr = translator('fr');
    assert.equal(formatTrackInfo(null, 'TITLE', 64, fr), 'Aucune piste');
    assert.equal(formatTrackInfo({...SONG, album: null}, 'ALBUM', 64, fr), 'Aucun album');
    assert.equal(formatTrackInfo({...SONG, title: 'Playing', artist: 'Connected', album: 'Playlist'}, 'TITLE_ARTIST_ALBUM', 64, fr),
        'Playing\nConnected\nPlaylist');
});
