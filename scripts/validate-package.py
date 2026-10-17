"""Check the real CLI archive, runtime assets, attribution, and OpenDeck manifest view."""
import hashlib
import json
from pathlib import Path, PurePosixPath
import stat
import struct
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def merge_patch(target, patch):
    """RFC 7396, matching OpenDeck's json_patch::merge (arrays replace)."""
    if not isinstance(patch, dict):
        return patch
    result = dict(target) if isinstance(target, dict) else {}
    for key, value in patch.items():
        if value is None:
            result.pop(key, None)
        else:
            result[key] = merge_patch(result.get(key), value)
    return result


def main():
    source = json.loads((ROOT / 'manifest.json').read_text())
    uuid = source['UUID']
    directory = ROOT / 'build' / f'{uuid}.sdPlugin'
    package = ROOT / 'build' / f'{uuid}.streamDeckPlugin'
    runtime = {'manifest.json', 'manifest.linux.json', 'dial-layout.json',
               'en.json', 'de.json', 'fr.json', 'action.html', 'property-inspector.html',
               'sdpi.css', 'bundle.js', 'bundle-pi.js', 'LICENSE', 'icons/NOTICE.md'}
    originals = {path.stem for path in (ROOT / 'icons').glob('*.svg')}
    assert originals, 'Editable generic icon sources are required'
    runtime.update(f'icons/{name}{suffix}.png' for name in originals for suffix in ['', '@2x'])
    actual = {path.relative_to(directory).as_posix() for path in directory.rglob('*') if path.is_file()}
    assert actual == runtime, f'Unexpected/missing build resources: {actual ^ runtime}'

    with zipfile.ZipFile(package) as archive:
        assert archive.testzip() is None, 'Corrupt ZIP content'
        entries = archive.infolist()
        assert len({item.filename for item in entries}) == len(entries), 'Duplicate archive paths'
        prefix = f'{uuid}.sdPlugin/'
        assert {item.filename for item in entries} == {prefix + name for name in runtime}, 'Archive file allowlist mismatch'
        for item in entries:
            path = PurePosixPath(item.filename)
            assert not path.is_absolute() and '..' not in path.parts, 'Unsafe archive path'
            assert not stat.S_ISLNK(item.external_attr >> 16), 'Symlinks must not enter the installer'
            name = item.filename.removeprefix(prefix)
            data = archive.read(item)
            assert data == (directory / name).read_bytes(), f'Stale packaged file: {name}'
            # CLI pack serializes manifest JSON again (including final newline).
            # Compare its semantics below; other copied assets remain byte-exact.
            if name not in {'manifest.json', 'bundle.js', 'bundle-pi.js'}:
                assert data == (ROOT / name).read_bytes(), f'Build differs from source: {name}'

        manifest = json.loads(archive.read(prefix + 'manifest.json'))
        assert manifest == source
        assert manifest['SDKVersion'] == 2
        assert {os['Platform'] for os in manifest['OS']} == {'mac', 'windows'}
        linux = merge_patch(manifest, json.loads(archive.read(prefix + 'manifest.linux.json')))
        assert {os['Platform'] for os in linux['OS']} == {'linux'}
        assert linux['CodePathLin'] == manifest['CodePath'] == 'action.html'
        assert linux['Actions'] == manifest['Actions'], 'Linux view must retain action identities/settings'
        actions = manifest['Actions']
        assert len(actions) == len({action['UUID'] for action in actions}) == 15

        def resource(name):
            assert name in runtime, f'Missing runtime reference: {name}'

        def icon(name):
            resource(name + '.png')
            resource(name + '@2x.png')

        icon(manifest['Icon']); icon(manifest['CategoryIcon'])
        resource(manifest['PropertyInspectorPath']); resource(manifest['CodePath'])
        for action in actions:
            icon(action['Icon'])
            for state in action['States']:
                icon(state['Image'])
            layout = action.get('Encoder', {}).get('layout')
            if layout and not layout.startswith('$'):
                resource(layout)
        for name in runtime:
            if name.endswith('.png'):
                data = archive.read(prefix + name)
                assert data[:8] == b'\x89PNG\r\n\x1a\n', f'Invalid PNG: {name}'
                size = 28 if name.startswith('icons/category-icon') else 72
                if '@2x' in name:
                    size *= 2
                assert struct.unpack('>II', data[16:24]) == (size, size), f'Incorrect dimensions: {name}'
        for group in [('like-off', 'like-on'), ('dislike-off', 'dislike-on'),
                      ('volume-on', 'volume-mute'), ('shuffle-off', 'shuffle-on'),
                      ('repeat-none', 'repeat-all', 'repeat-one')]:
            assert len({archive.read(prefix + f'icons/{name}.png') for name in group}) == len(group), f'Indistinct states: {group}'
        for name in ['bundle.js', 'bundle-pi.js']:
            text = archive.read(prefix + name).decode()
            assert 'ytmdesktop' not in text and 'fun.shiro.ytmd' not in text and '9863' not in text, 'Legacy companion runtime in package'
        total = sum(item.file_size for item in entries)

    digest = hashlib.sha256(package.read_bytes()).hexdigest()
    print(f'Package passes: {len(runtime)} files, {total:,} unpacked bytes; source/ZIP/resource/PNG/MIT parity; canonical and merged Linux views.')
    print(f'Path: {package.relative_to(ROOT)}')
    print(f'SHA-256: {digest}')


if __name__ == '__main__':
    main()
