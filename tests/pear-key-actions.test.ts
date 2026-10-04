import test from 'node:test';
import assert from 'node:assert/strict';
import {formatTrackInfo, PearKeyActions, PearKeyClient, PearKeyHost, trackInfoFormat, volumeStep} from '../src/actions/pear-key-actions';
import {ActionTypes} from '../src/interfaces/enums';
import {PearSnapshot} from '../src/pear/pear-client';
import {emptyPlayerState, mergePlayerState, PlayerUpdate} from '../src/pear/state';
import {harness, settle, SONG} from './helpers';

class KeyHost implements PearKeyHost {
    readonly events: {type: string; context: string; value?: unknown}[] = [];
    setState(state: 0 | 1, context: string) { this.events.push({type: 'state', context, value: state}); }
    setTitle(title: string, context: string) { this.events.push({type: 'title', context, value: title}); }
    setImage(image: string, context: string) { this.events.push({type: 'image', context, value: image}); }
    setFeedback(context: string, payload: Record<string, unknown>) { this.events.push({type: 'feedback', context, value: payload}); }
    showAlert(context: string) { this.events.push({type: 'alert', context}); }
    latest(type: string, context: string) { return this.events.filter(event => event.type === type && event.context === context).at(-1)?.value; }
}

function event(action: ActionTypes, context = 'key', settings: unknown = {}, controller = 'Keypad') {
    return {action, context, payload: {settings, controller}};
}

function fakeClient() {
    const calls: {name: string; delta?: number}[] = [];
    let snapshot: PearSnapshot = {connection: 'connected', authentication: 'disabled', retryAttempt: 0,
        retryInMs: null, lastError: null, player: mergePlayerState(emptyPlayerState(), {ready: true, song: SONG,
            isPlaying: true, muted: false, volume: 35, shuffle: false, repeat: 'NONE', likeState: 'INDIFFERENT'})};
    const listeners = new Set<(value: PearSnapshot) => void>();
    const command = (name: string) => async () => { calls.push({name}); };
    const client: PearKeyClient = {getSnapshot: () => snapshot,
        subscribe: listener => { listeners.add(listener); listener(snapshot); return () => { listeners.delete(listener); }; },
        commands: {play: command('play'), pause: command('pause'), togglePlay: command('togglePlay'), next: command('next'),
            previous: command('previous'), like: command('like'), dislike: command('dislike'), toggleMute: command('toggleMute'),
            changeVolume: async delta => { calls.push({name: 'changeVolume', delta}); },
            toggleShuffle: command('toggleShuffle'), cycleRepeat: command('cycleRepeat')}};
    return {client, calls, listeners, update: (update: PlayerUpdate, connection: PearSnapshot['connection'] = 'connected') => {
        snapshot = {...snapshot, connection, player: mergePlayerState(snapshot.player, update)};
        for (const listener of listeners) listener(snapshot);
    }};
}

test('all standard key activations call the shared commands with default/configured steps', async () => {
    const f = fakeClient();
    const host = new KeyHost();
    const keys = new PearKeyActions(f.client, host);
    const bindings: [ActionTypes, string, unknown, number?][] = [
        [ActionTypes.PLAY_PAUSE, 'togglePlay', {}], [ActionTypes.NEXT_TRACK, 'next', {}],
        [ActionTypes.PREV_TRACK, 'previous', {}], [ActionTypes.LIKE_TRACK, 'like', {}],
        [ActionTypes.DISLIKE_TRACK, 'dislike', {}], [ActionTypes.VOLUME_MUTE, 'toggleMute', {}],
        [ActionTypes.VOLUME_DOWN, 'changeVolume', {}, -5], [ActionTypes.VOLUME_UP, 'changeVolume', {}, 5],
        [ActionTypes.SONG_INFO, 'togglePlay', {}], [ActionTypes.SHUFFLE, 'toggleShuffle', {}],
        [ActionTypes.REPEAT, 'cycleRepeat', {}], [ActionTypes.VOLUME_UP, 'changeVolume', {steps: 2}, 2],
        [ActionTypes.VOLUME_DOWN, 'changeVolume', {steps: '10'}, -10],
        [ActionTypes.PLAY_PAUSE, 'play', {action: 'PLAY'}], [ActionTypes.PLAY_PAUSE, 'pause', {action: 'PAUSE'}],
    ];
    for (const [action, name, settings, delta] of bindings) {
        await keys.press(event(action, 'key', settings));
        assert.deepEqual(f.calls.at(-1), delta === undefined ? {name} : {name, delta});
    }
    assert.equal(f.calls.length, bindings.length);
    assert.equal(host.events.length, 0, 'button presses alone do not alter confirmed displays');
    keys.dispose();
});

test('visible duplicates render immediately and follow external playback, ratings, mute, shuffle, and repeat', () => {
    const f = fakeClient();
    const host = new KeyHost();
    const keys = new PearKeyActions(f.client, host);
    for (const [context, action] of [['play-a', ActionTypes.PLAY_PAUSE], ['play-b', ActionTypes.PLAY_PAUSE],
        ['like', ActionTypes.LIKE_TRACK], ['dislike', ActionTypes.DISLIKE_TRACK], ['mute', ActionTypes.VOLUME_MUTE],
        ['shuffle', ActionTypes.SHUFFLE], ['repeat', ActionTypes.REPEAT]] as const) keys.appear(event(action, context));
    assert.equal(host.latest('state', 'play-a'), 1);
    assert.equal(host.latest('state', 'play-b'), 1);
    assert.equal(host.latest('state', 'shuffle'), 0);
    for (const repeat of ['NONE', 'ALL', 'ONE'] as const) {
        f.update({repeat});
        assert.equal(host.latest('image', 'repeat'), `icons/repeat-${repeat.toLowerCase()}.svg`);
    }
    f.update({isPlaying: false, volume: 0, muted: false, shuffle: true, likeState: 'LIKE'});
    assert.equal(host.latest('state', 'play-a'), 0);
    assert.equal(host.latest('state', 'play-b'), 0);
    assert.equal(host.latest('state', 'mute'), 0, 'zero volume does not infer mute');
    assert.equal(host.latest('state', 'shuffle'), 1);
    assert.equal(host.latest('state', 'like'), 1);
    assert.equal(host.latest('state', 'dislike'), 0);
    f.update({likeState: 'DISLIKE', muted: true});
    assert.equal(host.latest('state', 'like'), 0);
    assert.equal(host.latest('state', 'dislike'), 1);
    assert.equal(host.latest('state', 'mute'), 1);
    f.update({likeState: 'INDIFFERENT'});
    assert.equal(host.latest('state', 'dislike'), 0);
    assert.equal(f.calls.length, 0, 'external events do not send commands');
    keys.dispose();
});

test('real Pear WebSocket updates drive key displays after commands and new profile appearances', async () => {
    const h = harness();
    await h.connect();
    const host = new KeyHost();
    const keys = new PearKeyActions(h.client, host);
    keys.appear(event(ActionTypes.PLAY_PAUSE, 'play'));
    const pressed = keys.press(event(ActionTypes.PLAY_PAUSE, 'play'));
    await settle();
    assert.equal(host.latest('state', 'play'), 1);
    h.latestSocket().send({type: 'PLAYER_STATE_CHANGED', isPlaying: false, position: 12});
    await pressed;
    assert.equal(host.latest('state', 'play'), 0);
    keys.appear(event(ActionTypes.PLAY_PAUSE, 'new-profile'));
    assert.equal(host.latest('state', 'new-profile'), 0);
    keys.appear(event(ActionTypes.SONG_INFO, 'info'));
    assert.equal(host.latest('title', 'info'), 'Track\nArtist', 'metadata is retained while paused');
    h.latestSocket().send({type: 'VIDEO_CHANGED', song: {...SONG, title: 'New title', artist: 'New artist', isPaused: true}, position: 0});
    assert.equal(host.latest('title', 'info'), 'New title\nNew artist');
    assert.equal(h.requests.filter(request => request.init.method === 'POST').length, 1);
    keys.dispose();
    h.client.stop();
});

test('position ticks do not resend displays; disappearance, replacement, and disposal release context work', () => {
    const f = fakeClient();
    const host = new KeyHost();
    const keys = new PearKeyActions(f.client, host);
    keys.appear(event(ActionTypes.SONG_INFO, 'a'));
    keys.appear(event(ActionTypes.SONG_INFO, 'b', {displayFormat: 'ARTIST'}));
    const count = host.events.length;
    for (let position = 1; position <= 50; ++position) f.update({position});
    assert.equal(host.events.length, count);
    keys.disappear('a');
    f.update({song: {...SONG, artist: 'Other'}});
    assert.equal(host.latest('title', 'a'), 'Track\nArtist');
    assert.equal(host.latest('title', 'b'), 'Other');
    keys.appear(event(ActionTypes.VOLUME_UP, 'b'));
    assert.equal(host.latest('title', 'b'), '35%');
    assert.equal(f.listeners.size, 1, 'all contexts share one subscription');
    keys.dispose();
    const disposedCount = host.events.length;
    f.update({volume: 80});
    keys.appear(event(ActionTypes.SONG_INFO));
    assert.equal(host.events.length, disposedCount);
    assert.equal(f.listeners.size, 0);
});

test('unknown/disconnected state remains explicit and recovers from real snapshots', () => {
    const f = fakeClient();
    const host = new KeyHost();
    const keys = new PearKeyActions(f.client, host);
    for (const action of [ActionTypes.PLAY_PAUSE, ActionTypes.LIKE_TRACK, ActionTypes.VOLUME_MUTE, ActionTypes.SHUFFLE, ActionTypes.REPEAT]) {
        keys.appear(event(action, action));
    }
    f.update({isPlaying: null, muted: null, shuffle: null, repeat: null, likeState: null});
    assert.ok(host.events.filter(record => record.type === 'title').slice(-5).every(record => record.value === '?'));
    f.update({ready: false}, 'retrying');
    assert.ok(host.events.filter(record => record.type === 'title').slice(-5).every(record => record.value === 'Pear\noffline'));
    f.update({ready: true, isPlaying: false, song: null, repeat: 'ALL', shuffle: false, muted: false, likeState: 'INDIFFERENT'});
    assert.equal(host.latest('state', ActionTypes.PLAY_PAUSE), 0, 'stopped displays Play');
    assert.equal(host.latest('title', ActionTypes.REPEAT), 'All');
    keys.dispose();
});

test('Track Info formats are independent per key, update with settings, and bound Unicode/missing metadata', () => {
    const f = fakeClient();
    const host = new KeyHost();
    const keys = new PearKeyActions(f.client, host);
    keys.appear(event(ActionTypes.SONG_INFO, 'a'));
    keys.appear(event(ActionTypes.SONG_INFO, 'b', {displayFormat: 'ARTIST'}));
    assert.equal(host.latest('title', 'a'), 'Track\nArtist');
    assert.equal(host.latest('title', 'b'), 'Artist');
    keys.settings(event(ActionTypes.SONG_INFO, 'a', {displayFormat: 'TITLE_ARTIST_ALBUM'}));
    assert.equal(host.latest('title', 'a'), 'Track\nArtist\nAlbum');
    assert.equal(host.latest('title', 'b'), 'Artist');
    assert.equal(formatTrackInfo(SONG, 'TITLE'), 'Track');
    assert.equal(formatTrackInfo(SONG, 'ALBUM'), 'Album');
    assert.equal(formatTrackInfo({...SONG, album: null}, 'ALBUM'), 'No album');
    assert.equal(formatTrackInfo(null, 'TITLE_ARTIST'), 'No track');
    assert.equal(formatTrackInfo({...SONG, title: '  One\nTwo   '}, 'TITLE'), 'One Two');
    assert.equal(formatTrackInfo({...SONG, title: '🍐'.repeat(15)}, 'TITLE'), '🍐'.repeat(11) + '…');
    assert.equal(trackInfoFormat({displayFormat: 'unsupported'}), 'TITLE_ARTIST');
    assert.equal(host.events.filter(record => record.type === 'image').length, 0, 'no unreliable artwork fetch or override');
    keys.dispose();
});

test('volume settings validate defaults and steps, and changed settings affect the next activation', async () => {
    for (const steps of [undefined, null, 0, -5, 101, Infinity, 'bad', '2.5', 2.5]) assert.equal(volumeStep({steps}), 5);
    for (const steps of [1, 2, 5, 10, 100]) assert.equal(volumeStep({steps}), steps);
    const f = fakeClient();
    const keys = new PearKeyActions(f.client, new KeyHost());
    keys.appear(event(ActionTypes.VOLUME_UP, 'a', {steps: 1}));
    keys.settings(event(ActionTypes.VOLUME_UP, 'a', {steps: 10}));
    await keys.press({action: ActionTypes.VOLUME_UP, context: 'a', payload: {}});
    assert.deepEqual(f.calls.at(-1), {name: 'changeVolume', delta: 10});
    keys.dispose();
});

test('playlist remains explicitly blocked and encoder events cannot activate key commands', async () => {
    const f = fakeClient();
    const host = new KeyHost();
    const keys = new PearKeyActions(f.client, host);
    keys.appear(event(ActionTypes.PLAY_PLAYLIST, 'playlist'));
    assert.equal(host.latest('title', 'playlist'), 'Pear API\nrequired');
    await keys.press(event(ActionTypes.PLAY_PLAYLIST, 'playlist'));
    assert.equal(host.events.at(-1)?.type, 'alert');
    keys.appear(event(ActionTypes.VOLUME_UP, 'dial', {}, 'Encoder'));
    await keys.press({action: ActionTypes.VOLUME_UP, context: 'dial', payload: {}});
    await keys.press(event(ActionTypes.PLAY_PAUSE, 'other-dial', {}, 'Encoder'));
    assert.equal(f.calls.length, 0);
    assert.deepEqual(host.latest('feedback', 'dial'), {title: 'Dials pending'});
    keys.dispose();
});

test('failed commands alert without inventing a state transition; errors after disposal do not touch the host', async () => {
    const f = fakeClient();
    const host = new KeyHost();
    const keys = new PearKeyActions(f.client, host);
    f.client.commands.togglePlay = async () => { throw new Error('private transport details'); };
    keys.appear(event(ActionTypes.PLAY_PAUSE));
    await keys.press(event(ActionTypes.PLAY_PAUSE));
    assert.equal(host.latest('state', 'key'), 1);
    assert.equal(host.events.at(-1)?.type, 'alert');
    const count = host.events.length;
    const pending = keys.press(event(ActionTypes.PLAY_PAUSE));
    keys.dispose();
    await pending;
    assert.equal(host.events.length, count);
});
