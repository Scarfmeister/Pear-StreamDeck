const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');

const sourceManifest = JSON.parse(fs.readFileSync('manifest.json', 'utf-8'));
const manifestPath = path.join('build', `${sourceManifest.UUID}.sdPlugin`, 'manifest.json');

if (!fs.existsSync(manifestPath)) {
  console.error(`Manifest not found at ${manifestPath}`);
  process.exit(1);
}

// The canonical manifest now satisfies current CLI rules. Retain the existing
// command as a check, rather than silently shipping a different manifest.
assert.match(sourceManifest.Version, /^\d+\.\d+\.\d+\.\d+$/);
assert.ok(!Object.hasOwn(sourceManifest, 'URL'), 'Use the canonical supported manifest fields');
assert.deepEqual(JSON.parse(fs.readFileSync(manifestPath, 'utf-8')), sourceManifest);
console.log('Canonical and built manifests agree: numeric four-part version, supported fields.');
