const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const SUPPORTED_LOCALES = ['en', 'de', 'fr']; // All inherited upstream locales; no silent expansion.
const placeholders = text => (text.match(/\{[a-z]+\}/g) ?? []).sort();

function leaves(value, prefix = '') {
    if (typeof value === 'string') return {[prefix]: value};
    return Object.fromEntries(Object.entries(value).flatMap(([key, child]) =>
        Object.entries(leaves(child, Array.isArray(value) ? `${prefix}[${key}]` : prefix ? `${prefix}.${key}` : key))));
}

function compare(source, target, where) {
    if (typeof source === 'string') {
        assert.equal(typeof target, 'string', `${where}: expected a string`);
        assert.ok(target.trim(), `${where}: blank translation`);
        assert.deepEqual(placeholders(target), placeholders(source), `${where}: placeholder mismatch`);
        assert.ok(!/YTMD|YTMDesktop|fun\.shiro|ytmdesktop|YouTube Music Desktop/.test(target), `${where}: obsolete branding`);
    } else {
        assert.ok(target && typeof target === 'object', `${where}: expected an object/array`);
        assert.equal(Array.isArray(target), Array.isArray(source), `${where}: object/array mismatch`);
        assert.deepEqual(Object.keys(target).sort(), Object.keys(source).sort(), `${where}: missing/stale keys or array size`);
        for (const key of Object.keys(source)) compare(source[key], target[key], `${where}.${key}`);
    }
}

function validateResources(resources, exceptions, manifest) {
    assert.deepEqual(Object.keys(resources).sort(), [...SUPPORTED_LOCALES].sort(), 'Required locales must be retained');
    const source = resources.en;
    const actions = manifest.Actions.map(action => action.UUID).sort();
    assert.deepEqual(Object.keys(source).filter(key => key.startsWith('io.')).sort(), actions, 'Canonical action UUID parity');
    assert.deepEqual(Object.keys(source).sort(), ['Name', 'Category', 'Description', 'Localization', ...actions].sort(), 'Obsolete root localization keys');
    assert.deepEqual(Object.keys(source.Localization), ['Strings'], 'Removed companion PI keys must not return');
    for (const key of ['Name', 'Category', 'Description']) assert.equal(source[key], manifest[key], `English ${key} must match manifest`);
    for (const action of manifest.Actions) {
        const expected = {Name: action.Name, Tooltip: action.Tooltip,
            States: action.States.map(state => ({Name: state.Name}))};
        if (action.Encoder) expected.Encoder = {TriggerDescription: action.Encoder.TriggerDescription};
        assert.deepEqual(source[action.UUID], expected, `${action.UUID}: state/encoder/English manifest parity`);
    }
    const english = leaves(source);
    for (const lang of SUPPORTED_LOCALES) {
        compare(source, resources[lang], lang);
        if (lang === 'en') continue;
        const localized = leaves(resources[lang]);
        assert.ok(Object.keys(english).some(key => english[key] !== localized[key]), `${lang}: exact English copy`);
        const allowed = exceptions[lang] ?? {};
        for (const [key, reason] of Object.entries(allowed)) {
            assert.ok(english[key] !== undefined && localized[key] === english[key], `${lang}.${key}: stale exception`);
            assert.ok(typeof reason === 'string' && reason.trim(), `${lang}.${key}: document the identical string`);
        }
        for (const [key, value] of Object.entries(localized)) {
            if (value === english[key]) assert.ok(Object.hasOwn(allowed, key), `${lang}.${key}: undocumented English placeholder`);
        }
    }
    return Object.keys(english).length;
}

function validate(root = path.resolve(__dirname, '..')) {
    const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
    const resources = Object.fromEntries(SUPPORTED_LOCALES.map(lang => [lang, read(`${lang}.json`)]));
    const count = validateResources(resources, read('docs/localization-exceptions.json'), read('manifest.json'));
    const inventory = read('docs/localization-inventory.json');
    assert.deepEqual(inventory.supportedLocales, SUPPORTED_LOCALES, 'Document locale expansion explicitly');
    assert.deepEqual([...inventory.finalEnglishKeys].sort(), Object.keys(leaves(resources.en)).sort(), 'Update the complete localization inventory');
    const html = fs.readFileSync(path.join(root, 'property-inspector.html'), 'utf8');
    const decode = value => value.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&');
    for (const [, raw] of html.matchAll(/data-i18n(?:-placeholder)?="([^"]+)"/g)) {
        assert.ok(Object.hasOwn(resources.en.Localization.Strings, decode(raw)), `Unknown PI text: ${raw}`);
    }
    return {locales: SUPPORTED_LOCALES.length, keys: count};
}

module.exports = {validateResources, validate, leaves, SUPPORTED_LOCALES};
if (require.main === module) {
    const result = validate();
    console.log(`Localization passes: ${result.locales} locales, ${result.keys} required leaf keys, manifest/state/encoder/placeholder parity and documented identical terms.`);
}
