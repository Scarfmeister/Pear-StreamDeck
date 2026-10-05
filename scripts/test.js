const esbuild = require('esbuild');
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

async function main() {
    const localization = spawnSync(process.execPath, ['scripts/validate-localization.js'], {stdio: 'inherit'});
    if (localization.status !== 0) throw new Error('Localization validation failed.');
    const entries = fs.readdirSync('tests').filter(name => name.endsWith('.test.ts')).map(name => `tests/${name}`);
    if (!entries.length) throw new Error('No client tests found.');
    fs.rmSync('dist/tests', {recursive: true, force: true});
    await esbuild.build({entryPoints: entries, outdir: 'dist/tests', bundle: true,
        platform: 'node', format: 'cjs', target: 'node24', outExtension: {'.js': '.cjs'}});
    await esbuild.build({entryPoints: ['src/pear-plugin.ts', 'src/pear-pi.ts'], outdir: 'dist/browser-tests',
        bundle: true, platform: 'browser', format: 'iife', target: 'es2017'});
    const files = entries.map(entry => `dist/tests/${path.basename(entry, '.ts')}.cjs`);
    const result = spawnSync(process.execPath, ['--test', ...files], {stdio: 'inherit'});
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
}

main().catch(error => { console.error(error); process.exitCode = 1; });
