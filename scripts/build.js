const esbuild = require('esbuild');
const fs = require('fs');
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf-8'));
const outputDir = `build/${manifest.UUID}.sdPlugin`;
// Create release folder
console.log('Creating release folder');
if (fs.existsSync('build')) {
    fs.rmSync('build', {recursive: true, force: true});
}
fs.mkdirSync('build');

// Create plugin folder
console.log('Creating plugin folder');
fs.mkdirSync(outputDir);

// Build plugin
console.log('Building plugin');

async function bundle(entryPoint, outFile) {
    await esbuild.build({
        entryPoints: [entryPoint],
        outfile: outFile,
        bundle: true,
        format: 'iife',
        platform: 'browser',
        target: ['es2017'],
        minify: true
    });
}

async function main() {
    await Promise.all([
        bundle('src/pear-pi.ts', `${outputDir}/bundle-pi.js`),
        bundle('src/pear-plugin.ts', `${outputDir}/bundle.js`)
    ]);

    // Copy files
    console.log('Copying files');
    // Explicit runtime resources: development examples and future root files
    // must not enter the distributable just because they share an extension.
    for (const name of ['manifest.json', 'manifest.linux.json', 'dial-layout.json',
        'en.json', 'de.json', 'fr.json', 'action.html', 'property-inspector.html', 'sdpi.css']) {
        fs.copyFileSync(name, `${outputDir}/${name}`);
    }

    fs.mkdirSync(`${outputDir}/icons`);
    // SVGs are editable source assets. Ship one unambiguous raster rendition
    // family per icon, including the PNG feedback required by OpenDeck.
    for (const name of fs.readdirSync('icons').filter(name => name.endsWith('.png') || name === 'NOTICE.md')) {
        fs.copyFileSync(`icons/${name}`, `${outputDir}/icons/${name}`);
    }
    fs.copyFileSync('LICENSE', `${outputDir}/LICENSE`);

    // Done building plugin folder, check the build directory
    console.log('Done building plugin folder, check the build directory');
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
