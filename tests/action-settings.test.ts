import test from 'node:test';
import assert from 'node:assert/strict';
import {ActionTypes} from '../src/interfaces/enums';
import {saveActionSettings, TRACK_INFO_FORMATS, trackInfoFormat, validVolumeStep, volumeStep} from '../src/streamdeck/action-settings';
import {parsePlaylistInput, playlistInput, playlistShuffle, playlistStartupMode} from '../src/pear/playlist';

test('volume edits accept only integer percentages; invalid stored records safely default to five', () => {
    for (const input of [1, 2, 5, 10, 100, '1', '05', '100']) {
        assert.equal(validVolumeStep(input), Number(input));
        assert.deepEqual(saveActionSettings(ActionTypes.VOLUME_UP, {retained: true}, {steps: input}), {retained: true, steps: Number(input)});
    }
    for (const input of [undefined, null, {}, true, '', ' 5 ', '5%', '2.5', '1e2', NaN, Infinity, 0, -1, 101, 1.5]) {
        assert.equal(validVolumeStep(input), undefined);
        assert.equal(volumeStep({steps: input}), 5);
        assert.throws(() => saveActionSettings(ActionTypes.VOLUME_DOWN, {}, {steps: input}), /whole percentage/);
    }
    for (const record of [undefined, null, [], 'old', {}]) assert.equal(volumeStep(record), 5);
});

test('all Track Info choices round trip, with safe defaults and preservation of unrelated settings', () => {
    assert.equal(trackInfoFormat(undefined), 'TITLE_ARTIST');
    assert.equal(trackInfoFormat({displayFormat: 'old-format'}), 'TITLE_ARTIST');
    for (const displayFormat of TRACK_INFO_FORMATS) {
        const saved = saveActionSettings(ActionTypes.SONG_INFO, {other: 'kept'}, {displayFormat});
        assert.equal(trackInfoFormat(saved), displayFormat);
        assert.equal(saved.other, 'kept');
    }
    assert.throws(() => saveActionSettings(ActionTypes.SONG_INFO, {}, {displayFormat: 'bad'}));
});

test('playlist URLs and raw IDs normalize once and preserve case without guessed prefixes', () => {
    for (const input of [' PL_Example-123 ', 'a', '_', 'A'.repeat(256),
        'https://music.youtube.com/playlist?list=PL_Example-123',
        'https://youtube.com/playlist?extra=ok&list=PL_Example-123#section',
        'http://www.youtube.com/watch?v=video&list=PL_Example-123&index=2',
        'https://m.youtube.com/watch?list=PL_Example-123',
        'https://youtu.be/video?list=PL_Example-123',
        'https://MUSIC.YOUTUBE.COM/playlist?list=PL%5FExample-123']) {
        const expected = input.trim().length <= 256 && !input.includes('://') ? input.trim() : 'PL_Example-123';
        assert.equal(parsePlaylistInput(input), expected);
    }
});

test('malformed/unsafe playlist input fails cleanly without echoing input or falling back to video IDs', () => {
    for (const input of [undefined, {}, '', 'a'.repeat(257), 'bad id', 'VL:PL', 'https://music.youtube.com/playlist',
        'https://music.youtube.com/playlist?list=', 'https://music.youtube.com/watch?v=video',
        'https://youtu.be/video', 'https://music.youtube.com/playlist?list=A&list=B',
        'https://music.youtube.com/playlist?list=A&%6cist=B', 'https://music.youtube.com/playlist?list=%252F',
        'https://music.youtube.com/playlist?list=%', 'https://music.youtube.com/playlist?list=%FF',
        'https://music.youtube.com/playlist?list=A&other=%ZZ', 'https://music.youtube.com/playlist?list=A+B',
        'https://music.youtube.com/playlist?list=A%2FB', 'https://music.youtube.com/playlist?list=A%00',
        'https://music.youtube.com/browse?list=A', 'https://music.youtube.com/playlist/?list=A',
        'https://music.youtube.com.evil.test/playlist?list=A', 'https://evil.test/playlist?list=A',
        'https://user:secret@music.youtube.com/playlist?list=A', 'https://@music.youtube.com/playlist?list=A',
        'https://music.youtube.com:1234/playlist?list=A',
        'https://music.youtube.com\\@evil.test/playlist?list=A', 'https://music.youtube.com/playlist?list=A\nB',
        'ftp://music.youtube.com/playlist?list=A', 'javascript:secret', '//music.youtube.com/playlist?list=A']) {
        assert.throws(() => parsePlaylistInput(input), error => error instanceof Error && !error.message.includes('secret'));
    }
});

test('playlist settings migrate legacy URL/ID on explicit save; invalid URL never reuses an older ID', () => {
    const current = {playlistUrl: 'https://music.youtube.com/playlist?list=New', playlistId: 'Old', other: 'kept'};
    assert.equal(parsePlaylistInput(playlistInput(current)), 'New');
    const saved = saveActionSettings(ActionTypes.PLAY_PLAYLIST, current,
        {playlistInput: playlistInput(current), startupMode: playlistStartupMode(current)});
    assert.deepEqual(saved, {playlistId: 'New', other: 'kept', startupMode: 'FOLLOW_SHUFFLE_STATE'});
    assert.equal(current.playlistId, 'Old', 'read/save does not mutate the supplied record');
    assert.throws(() => parsePlaylistInput(playlistInput({...current, playlistUrl: 'https://evil.test/playlist?list=X'})));
    assert.equal(playlistInput({playlistUrl: ' ', playlistId: 'Existing'}), 'Existing');
    assert.equal(playlistStartupMode({startupMode: 'old'}), 'FOLLOW_SHUFFLE_STATE');
    assert.throws(() => saveActionSettings(ActionTypes.PLAY_PLAYLIST, current, {playlistInput: 'New', startupMode: 'bad'}));
});

test('playlist mode selection follows only confirmed shuffle, and Always modes ignore unknown state', () => {
    for (const state of [true, false, null]) {
        assert.equal(playlistShuffle('FOLLOW_SHUFFLE_STATE', state), state);
        assert.equal(playlistShuffle('ALWAYS_NORMAL', state), false);
        assert.equal(playlistShuffle('ALWAYS_SHUFFLE', state), true);
    }
    assert.equal(playlistStartupMode(null), 'FOLLOW_SHUFFLE_STATE');
});
