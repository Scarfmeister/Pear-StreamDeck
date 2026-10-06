const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

function files(directory) {
    return fs.readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
        const name = path.join(directory, entry.name);
        return entry.isDirectory() ? files(name) : [name];
    });
}

const read = name => fs.readFileSync(name, 'utf8');
const manifest = JSON.parse(read('manifest.json'));
const pkg = JSON.parse(read('package.json'));
const ids = Object.values(Object.fromEntries([...read('src/interfaces/enums.ts')
    .matchAll(/(\w+) = '([^']+)'/g)].map(([, key, value]) => [key, value])));
assert.equal(manifest.UUID, 'io.github.scarfmeister.pear-streamdeck');
assert.equal(new Set(ids).size, 15, 'Stable action IDs must remain unique');
assert.deepEqual(manifest.Actions.map(action => action.UUID).sort(), ids.sort(), 'Manifest/action UUID parity');
assert.deepEqual(Object.keys(pkg.dependencies), ['streamdeck-typescript'], 'Only the retained host framework is a runtime dependency');
assert.ok(!Object.hasOwn(pkg.devDependencies, 'ytmdesktop-ts-companion'), 'Remove the companion dependency');
const source = files('src').filter(name => name.endsWith('.ts'));
const text = source.map(read).join('\n');
assert.ok(!/CompanionConnector|ytmdesktop-ts-companion|fun\.shiro\.ytmd|9863|Dials pending/.test(text), 'Obsolete runtime source/branding');
assert.equal((text.match(/new PearClient\(/g) ?? []).length, 1, 'One session-owned Pear client');
assert.equal((text.match(/new WebSocket\(/g) ?? []).length, 1, 'One Pear socket factory');
assert.ok(!/\bfetch\s*\(|new (?:PearClient|WebSocket)\(/.test(read('src/pear-pi.ts')), 'PI must use the plugin, not a Pear transport');
assert.ok(!source.some(name => /plugins[/\\]api-server|playlist-broker|playlist-adapter/.test(name)), 'Pear implementation belongs in its own repository');
const html = read('property-inspector.html');
const htmlIds = [...html.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => id);
assert.equal(new Set(htmlIds).size, htmlIds.length, 'PI IDs must be unique');
for (const [, id] of read('src/pear-pi.ts').matchAll(/getElementById\('([^']+)'\)/g)) {
    assert.ok(htmlIds.includes(id), `Missing PI element ${id}`);
}
assert.ok(html.includes('src="bundle-pi.js"') && read('action.html').includes('src="bundle.js"'), 'HTML entry references');
for (const action of manifest.Actions) {
    assert.equal(action.SupportedInMultiActions, false, 'Do not advertise unimplemented Multi Action desired-state semantics');
    assert.equal(action.PropertyInspectorPath ?? manifest.PropertyInspectorPath, 'property-inspector.html');
}
assert.ok(!fs.existsSync('sdplus_customlayout.example.json') && !fs.existsSync('YTMD-Connector-Icons.psd'), 'Removed legacy examples/assets');
for (const name of files('.github/ISSUE_TEMPLATE')) assert.ok(!/YTMDesktop|fun\.shiro/.test(read(name)), `Stale issue form ${name}`);
for (const name of files('scripts').filter(name => name.endsWith('.js')).concat('commitlint.config.js')) {
    const result = spawnSync(process.execPath, ['--check', name], {encoding: 'utf8'});
    assert.equal(result.status, 0, `${name}: ${result.stderr}`);
}
console.log(`Source audit passes: ${source.length} TypeScript files, 15 UUIDs, one client/socket factory, PI references, dependency/runtime boundaries and JavaScript syntax.`);
