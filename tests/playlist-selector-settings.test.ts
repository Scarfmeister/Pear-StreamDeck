import test from 'node:test';
import assert from 'node:assert/strict';
import {ActionTypes} from '../src/interfaces/enums';
import {saveActionSettings, volumeStep} from '../src/streamdeck/action-settings';
import {MAX_PLAYLIST_ENTRIES, MAX_PLAYLIST_IMAGE_BYTES, playlistEntries, playlistImage,
    rotatePlaylistIndex, selectedPlaylistIndex} from '../src/streamdeck/playlist-selector-settings';

export const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRmkAAAAASUVORK5CYII=';

test('selector saves canonical IDs, Follow defaults, and current per-context selection without duplicating globals', () => {
    const current = {selectedIndex: 1, unrelated: 'kept'};
    const saved = saveActionSettings(ActionTypes.PLAYLIST_SELECTOR, current, {playlists: [
        {name: ' First\nplaylist ', playlistInput: 'https://music.youtube.com/playlist?list=New'},
        {name: 'Second', playlistId: 'Other', startupMode: 'ALWAYS_SHUFFLE', image: PNG}], selectedIndex: 0});
    assert.deepEqual(saved, {selectedIndex: 1, unrelated: 'kept', playlists: [
        {name: 'First playlist', playlistId: 'New', startupMode: 'FOLLOW_SHUFFLE_STATE'},
        {name: 'Second', playlistId: 'Other', startupMode: 'ALWAYS_SHUFFLE', image: PNG}]});
    assert.deepEqual(current, {selectedIndex: 1, unrelated: 'kept'});
    assert.deepEqual(saveActionSettings(ActionTypes.PLAYLIST_SELECTOR, saved, {playlists: []}), {selectedIndex: 0, unrelated: 'kept', playlists: []});
    assert.equal(saveActionSettings(ActionTypes.VOLUME_DIAL, {}, {steps: '2'}).steps, 2);
    assert.equal(volumeStep({steps: 'old'}), 5);
});

test('malformed selector entries fail explicit saves without echoing supplied input', () => {
    const save = (playlists: unknown) => saveActionSettings(ActionTypes.PLAYLIST_SELECTOR, {}, {playlists});
    for (const entry of [null, {}, {name: '', playlistId: 'ID'}, {name: 'a'.repeat(65), playlistId: 'ID'},
        {name: 'Name', playlistInput: 'https://user:secret@evil.test/playlist?list=A'},
        {name: 'Name', playlistId: 'ID', startupMode: 'bad'}, {name: 'Name', playlistId: 'ID', image: 'https://evil.test/image.png'}]) {
        assert.throws(() => save([entry]), error => error instanceof Error && !error.message.includes('secret'));
    }
    assert.throws(() => save({}));
    assert.throws(() => save(Array(MAX_PLAYLIST_ENTRIES + 1).fill({name: 'A', playlistId: 'A'})));
    assert.equal((save(Array(MAX_PLAYLIST_ENTRIES).fill({name: '🍐'.repeat(64), playlistId: 'A'})).playlists as unknown[]).length, 16);
});

test('tolerant settings retain invalid slots and legacy inputs, with bounded lists and safe defaults', () => {
    for (const settings of [undefined, null, [], {}, {playlists: 'old'}]) assert.deepEqual(playlistEntries(settings), []);
    const entries = playlistEntries({playlists: [
        {name: 'Good', playlistUrl: 'https://music.youtube.com/playlist?list=New', playlistId: 'Old', startupMode: 'old'},
        {name: 'Bad', playlistId: 'bad input'}, null,
        {name: 'No image', playlistId: 'ID', image: 'file:///secret.png'}]});
    assert.equal(entries.length, 4);
    assert.equal(entries[0].playlistId, 'New'); assert.equal(entries[0].startupMode, 'FOLLOW_SHUFFLE_STATE');
    assert.equal(entries[1].valid, false); assert.equal(entries[1].input, 'bad input');
    assert.equal(entries[2].valid, false); assert.equal(entries[3].image, undefined);
    assert.equal(playlistEntries({playlists: Array(30).fill({name: 'A', playlistId: 'A'})}).length, MAX_PLAYLIST_ENTRIES);
});

test('selector bounds and signed wrapping work for empty lists, batched rotations, old indices, and large safe ticks', () => {
    for (const index of [undefined, null, '2', -100, NaN, Infinity, 1.5]) assert.equal(selectedPlaylistIndex({selectedIndex: index}, 3), 0);
    assert.equal(selectedPlaylistIndex({selectedIndex: 99}, 3), 2);
    assert.equal(selectedPlaylistIndex({selectedIndex: 1}, 0), 0);
    assert.equal(rotatePlaylistIndex(0, -1, 3), 2);
    assert.equal(rotatePlaylistIndex(2, 1, 3), 0);
    assert.equal(rotatePlaylistIndex(1, -5, 3), 2);
    assert.equal(rotatePlaylistIndex(1, 5, 3), 0);
    assert.equal(rotatePlaylistIndex(2, Number.MAX_SAFE_INTEGER, 3), 0);
    for (const ticks of ['1', null, Infinity, 1.1]) assert.equal(rotatePlaylistIndex(1, ticks, 3), 1);
    assert.equal(rotatePlaylistIndex(3, 5, 0), 0);
    assert.equal(rotatePlaylistIndex(0, -32768, 1), 0);
});

test('playlist images accept bounded embedded rasters and reject paths, SVG, malformed data, and oversized images', () => {
    assert.equal(playlistImage(PNG), PNG);
    const jpeg = 'data:image/jpeg;base64,/9j/AA==';
    assert.equal(playlistImage(jpeg), jpeg);
    for (const input of [undefined, '', 'icons/test.png', 'https://host/image.png', 'data:image/svg+xml;base64,PHN2Zz4=',
        'data:image/png;base64,not_an_image', 'data:image/png;base64,AAAA', 'data:image/png;base64,iVBORw0KGgo=',
        `data:image/png;base64,iVBORw0KGgo${'A'.repeat(4 * Math.ceil(MAX_PLAYLIST_IMAGE_BYTES / 3))}=`]) {
        assert.equal(playlistImage(input), undefined);
    }
});
