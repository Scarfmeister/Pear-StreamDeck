import test from 'node:test';
import assert from 'node:assert/strict';
import {MAX_PENDING_TRANSPORT_TICKS, PearDialActions, PearDialHost} from '../src/actions/pear-dial-actions';
import {PearKeyClient} from '../src/actions/pear-key-actions';
import {ActionTypes} from '../src/interfaces/enums';
import {PearPlaylistError, PearSnapshot} from '../src/pear/pear-client';
import {parsePlaylistInput, playlistShuffle} from '../src/pear/playlist';
import {emptyPlayerState, mergePlayerState, PlayerUpdate} from '../src/pear/state';
import {deferred, harness, settle, SONG} from './helpers';

class DialHost implements PearDialHost {
    readonly events: {type: string; context: string; value?: unknown}[] = [];
    setFeedback(context: string, payload: Record<string, unknown>) { this.events.push({type: 'feedback', context, value: payload}); }
    setFeedbackLayout(context: string, layout: string) { this.events.push({type: 'layout', context, value: layout}); }
    saveDialSettings(context: string, settings: Record<string, unknown>) { this.events.push({type: 'settings', context, value: settings}); }
    showAlert(context: string) { this.events.push({type: 'alert', context}); }
    playlistStatus(context: string, message: string) { this.events.push({type: 'status', context, value: message}); }
    latest(type: string, context = 'dial') { return this.events.filter(event => event.type === type && event.context === context).at(-1)?.value; }
    feedback(context = 'dial') { return this.latest('feedback', context) as Record<string, unknown>; }
}

function event(action: ActionTypes, context = 'dial', settings: unknown = {}, controller = 'Encoder') {
    return {action, context, payload: {settings, controller}};
}
function rotate(action: ActionTypes, ticks: unknown, context = 'dial', settings: unknown = {}) {
    return {action, context, payload: {ticks, controller: 'Encoder', settings}};
}

function fakeClient() {
    const calls: {name: string; delta?: number; playlistId?: string; mode?: string; shuffle?: boolean}[] = [];
    let snapshot: PearSnapshot = {connection: 'connected', authentication: 'disabled', retryAttempt: 0,
        retryInMs: null, lastError: null, player: mergePlayerState(emptyPlayerState(), {ready: true, song: SONG,
            isPlaying: true, muted: false, volume: 35, shuffle: false, repeat: 'NONE', likeState: 'INDIFFERENT'})};
    const listeners = new Set<(value: PearSnapshot) => void>();
    const command = (name: string) => async () => { calls.push({name}); };
    const client: PearKeyClient = {getSnapshot: () => snapshot,
        startPlaylist: async (input, mode = 'FOLLOW_SHUFFLE_STATE') => {
            const playlistId = parsePlaylistInput(input);
            const shuffle = playlistShuffle(mode, snapshot.player.shuffle);
            if (shuffle === null) throw new Error('Unknown shuffle');
            calls.push({name: 'startPlaylist', playlistId, mode, shuffle});
            return {playlistId, shuffle, status: 'dispatched'};
        },
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
const playlists = [
    {name: 'First', playlistId: 'First', startupMode: 'FOLLOW_SHUFFLE_STATE'},
    {name: 'Second', playlistId: 'Second', startupMode: 'ALWAYS_NORMAL'},
    {name: 'Third', playlistId: 'Third', startupMode: 'ALWAYS_SHUFFLE'}];

test('volume rotations use signed batches and configured/default steps; press toggles mute without confirming it', async () => {
    const f = fakeClient(), host = new DialHost(), dials = new PearDialActions(f.client, host);
    dials.appear(event(ActionTypes.VOLUME_DIAL));
    assert.equal(host.latest('layout'), '$B1');
    await dials.rotate(rotate(ActionTypes.VOLUME_DIAL, 2));
    dials.settings(event(ActionTypes.VOLUME_DIAL, 'dial', {steps: 2}));
    await dials.rotate(rotate(ActionTypes.VOLUME_DIAL, -3));
    await dials.press(event(ActionTypes.VOLUME_DIAL));
    assert.deepEqual(f.calls, [{name: 'changeVolume', delta: 10}, {name: 'changeVolume', delta: -6}, {name: 'toggleMute'}]);
    assert.equal(host.feedback().title, 'Volume'); assert.equal(host.feedback().value, '35%');
    f.update({volume: 0, muted: false}); assert.equal(host.feedback().title, 'Volume', 'zero is not mute');
    f.update({volume: 70, muted: true}); assert.equal(host.feedback().title, 'Muted');
    assert.equal(host.feedback().value, '70%'); assert.equal(host.feedback().icon, 'icons/volume-mute.png');
    assert.deepEqual(host.feedback().indicator, {value: 70, enabled: true});
    dials.settings(event(ActionTypes.VOLUME_DIAL, 'dial', {steps: 'bad'}));
    await dials.rotate(rotate(ActionTypes.VOLUME_DIAL, -1)); assert.equal(f.calls.at(-1)?.delta, -5);
    await dials.rotate(rotate(ActionTypes.VOLUME_DIAL, Number.MAX_SAFE_INTEGER)); assert.equal(f.calls.at(-1)?.delta, 100);
    dials.dispose();
});

test('real volume queue clamps both bounds and uses external confirmed changes between rotations', async () => {
    const h = harness(); await h.connect();
    const host = new DialHost(), dials = new PearDialActions(h.client, host);
    dials.appear(event(ActionTypes.VOLUME_DIAL, 'dial', {steps: 7}));
    h.latestSocket().send({type: 'VOLUME_CHANGED', volume: 97, muted: false});
    const up = dials.rotate(rotate(ActionTypes.VOLUME_DIAL, 2)); await settle();
    const volumePosts = () => h.requests.filter(r => r.url.endsWith('/volume') && r.init.method === 'POST');
    assert.equal(volumePosts().at(-1)?.init.body, '{"volume":100}');
    assert.equal(host.feedback().value, '97%', 'HTTP acceptance cannot confirm volume');
    h.latestSocket().send({type: 'VOLUME_CHANGED', volume: 100, muted: false}); await up;
    h.latestSocket().send({type: 'VOLUME_CHANGED', volume: 4, muted: true});
    const down = dials.rotate(rotate(ActionTypes.VOLUME_DIAL, -1)); await settle();
    assert.equal(volumePosts().at(-1)?.init.body, '{"volume":0}');
    assert.equal(host.feedback().title, 'Muted');
    h.latestSocket().send({type: 'VOLUME_CHANGED', volume: 0, muted: true}); await down;
    const mute = dials.press(event(ActionTypes.VOLUME_DIAL)); await settle();
    assert.equal(h.requests.filter(r => r.url.endsWith('/toggle-mute') && r.init.method === 'POST').length, 1);
    assert.equal(host.feedback().title, 'Muted');
    h.latestSocket().send({type: 'VOLUME_CHANGED', volume: 0, muted: false}); await mute;
    assert.equal(host.feedback().title, 'Volume');
    dials.dispose(); h.client.stop(); assert.equal(h.clock.tasks.size, 0);
});

test('transport dispatches one command per signed detent and renders real playback and metadata', async () => {
    const f = fakeClient(), host = new DialHost(), dials = new PearDialActions(f.client, host);
    dials.appear(event(ActionTypes.TRANSPORT_DIAL));
    assert.equal(host.latest('layout'), 'dial-layout.json');
    assert.deepEqual(host.feedback(), {title: 'Track', detail: 'Artist', status: 'Playing', icon: 'icons/music-pause.png'});
    await dials.rotate(rotate(ActionTypes.TRANSPORT_DIAL, 3)); await settle();
    await dials.rotate(rotate(ActionTypes.TRANSPORT_DIAL, -2)); await settle();
    await dials.press(event(ActionTypes.TRANSPORT_DIAL));
    assert.deepEqual(f.calls.map(call => call.name), ['next', 'next', 'next', 'previous', 'previous', 'togglePlay']);
    assert.equal(host.feedback().status, 'Playing');
    f.update({isPlaying: false, song: {...SONG, title: 'New title', artist: 'Other artist'}});
    assert.equal(host.feedback().status, 'Paused / stopped'); assert.equal(host.feedback().icon, 'icons/music-play.png');
    assert.equal(host.feedback().title, 'New title'); assert.equal(host.feedback().detail, 'Other artist');
    f.update({song: null, isPlaying: false}); assert.equal(host.feedback().title, 'No track');
    dials.dispose();
});

test('transport bounds pending input and discards it on errors, disconnects, disappearance, replacement, or disposal', async () => {
    for (const outcome of ['error', 'disconnect', 'disappear', 'replace', 'dispose']) {
        const f = fakeClient(), host = new DialHost(), dials = new PearDialActions(f.client, host);
        const pending = deferred<unknown>(); let sent = 0;
        f.client.commands.next = () => { ++sent; return pending.promise; };
        dials.appear(event(ActionTypes.TRANSPORT_DIAL));
        await dials.rotate(rotate(ActionTypes.TRANSPORT_DIAL, MAX_PENDING_TRANSPORT_TICKS));
        assert.equal(sent, 1);
        await dials.rotate(rotate(ActionTypes.TRANSPORT_DIAL, 2));
        assert.equal(host.events.at(-1)?.type, 'alert', 'an oversized batch is rejected');
        if (outcome === 'disconnect') f.update({ready: false}, 'retrying');
        if (outcome === 'disappear') dials.disappear('dial');
        if (outcome === 'replace') dials.appear(event(ActionTypes.VOLUME_DIAL));
        if (outcome === 'dispose') dials.dispose();
        if (outcome === 'error') pending.reject(new Error('private transport detail')); else pending.resolve(undefined);
        await settle(); assert.equal(sent, 1, `${outcome} must discard unsent ticks`);
        if (outcome === 'disconnect') {
            f.update({ready: true}); await settle(); assert.equal(sent, 1, 'no reconnect replay');
        }
        dials.dispose();
    }
});

test('selector rotates and wraps independently, persists canonical settings, and ignores stale input snapshots', async () => {
    const f = fakeClient(), host = new DialHost(), dials = new PearDialActions(f.client, host);
    const settings = {playlists, selectedIndex: 0, unrelated: true};
    dials.appear(event(ActionTypes.PLAYLIST_SELECTOR, 'a', settings));
    dials.appear(event(ActionTypes.PLAYLIST_SELECTOR, 'b', {...settings, selectedIndex: 99}));
    assert.equal(host.feedback('a').title, 'First'); assert.equal(host.feedback('b').title, 'Third');
    await dials.rotate(rotate(ActionTypes.PLAYLIST_SELECTOR, -1, 'a', settings));
    assert.deepEqual(host.latest('settings', 'a'), {...settings, selectedIndex: 2});
    await dials.rotate(rotate(ActionTypes.PLAYLIST_SELECTOR, 1, 'a', settings));
    assert.equal(host.feedback('a').title, 'First'); assert.equal(host.feedback('b').title, 'Third');
    assert.equal(f.calls.length, 0, 'selection does not issue a Pear command');
    f.update({shuffle: true});
    await dials.press(event(ActionTypes.PLAYLIST_SELECTOR, 'a', settings));
    assert.deepEqual(f.calls.at(-1), {name: 'startPlaylist', playlistId: 'First', mode: 'FOLLOW_SHUFFLE_STATE', shuffle: true});
    assert.match(String(host.feedback('a').detail), /Follow: shuffle/);
    await dials.press(event(ActionTypes.PLAYLIST_SELECTOR, 'b'));
    assert.equal(f.calls.at(-1)?.shuffle, true);
    await dials.rotate(rotate(ActionTypes.PLAYLIST_SELECTOR, -1, 'b')); await dials.press(event(ActionTypes.PLAYLIST_SELECTOR, 'b'));
    assert.equal(f.calls.at(-1)?.shuffle, false, 'Always Normal ignores current shuffle');
    const saved = host.latest('settings', 'b'); dials.disappear('b');
    dials.appear(event(ActionTypes.PLAYLIST_SELECTOR, 'b', saved)); assert.equal(host.feedback('b').title, 'Second');
    dials.settings(event(ActionTypes.PLAYLIST_SELECTOR, 'b', {playlists: [playlists[0]], selectedIndex: 99}));
    assert.equal(host.feedback('b').title, 'First', 'list shrink clamps saved index');
    dials.dispose();
});

test('selector keeps invalid/empty slots explicit; unsupported native startup fails honestly and does not affect a newly selected slot', async () => {
    const f = fakeClient(), host = new DialHost(), dials = new PearDialActions(f.client, host);
    dials.appear(event(ActionTypes.PLAYLIST_SELECTOR));
    assert.equal(host.feedback().title, 'Set playlists');
    await dials.press(event(ActionTypes.PLAYLIST_SELECTOR)); assert.equal(f.calls.length, 0);
    dials.settings(event(ActionTypes.PLAYLIST_SELECTOR, 'dial', {playlists: [{name: 'Bad', playlistId: 'bad input'}, playlists[1]]}));
    assert.equal(host.feedback().status, 'Invalid playlist entry');
    await dials.press(event(ActionTypes.PLAYLIST_SELECTOR)); assert.equal(f.calls.length, 0);
    await dials.rotate(rotate(ActionTypes.PLAYLIST_SELECTOR, 1));
    f.client.startPlaylist = async () => { throw new PearPlaylistError('extension-required'); };
    await dials.press(event(ActionTypes.PLAYLIST_SELECTOR));
    assert.equal(host.feedback().status, 'Update Pear'); assert.match(String(host.latest('status')), /playlist API extension/);
    f.client.startPlaylist = async () => { throw new PearPlaylistError('native-unavailable'); };
    await dials.press(event(ActionTypes.PLAYLIST_SELECTOR, 'dial'));
    assert.equal(host.feedback().status, 'Unavailable');
    const result = deferred<never>(); f.client.startPlaylist = () => result.promise;
    const press = dials.press(event(ActionTypes.PLAYLIST_SELECTOR));
    await dials.rotate(rotate(ActionTypes.PLAYLIST_SELECTOR, -1));
    const count = host.events.length; result.reject(new PearPlaylistError('extension-required')); await press;
    assert.equal(host.events.length, count, 'old startup must not mark another selected slot as failed');
    dials.dispose();
});

test('selector image resets on selection change and delayed startup never writes to a disappeared context', async () => {
    const f = fakeClient(), host = new DialHost(), dials = new PearDialActions(f.client, host);
    const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRmkAAAAASUVORK5CYII=';
    dials.appear(event(ActionTypes.PLAYLIST_SELECTOR, 'dial', {playlists: [{...playlists[0], image}, playlists[1]]}));
    assert.equal(host.feedback().icon, image);
    await dials.rotate(rotate(ActionTypes.PLAYLIST_SELECTOR, 1)); assert.equal(host.feedback().icon, 'icons/music-play.png');
    const result = deferred<never>(); f.client.startPlaylist = () => result.promise;
    const pressed = dials.press(event(ActionTypes.PLAYLIST_SELECTOR));
    dials.disappear('dial'); const count = host.events.length;
    result.reject(new PearPlaylistError('extension-required')); await pressed;
    assert.equal(host.events.length, count);
    dials.dispose();
});

test('selector can change while offline, but sends no offline startup; unknown state never invents confirmed values', async () => {
    const f = fakeClient(), host = new DialHost(), dials = new PearDialActions(f.client, host);
    dials.appear(event(ActionTypes.PLAYLIST_SELECTOR, 'selector', {playlists}));
    dials.appear(event(ActionTypes.VOLUME_DIAL, 'volume')); dials.appear(event(ActionTypes.TRANSPORT_DIAL, 'transport'));
    f.update({volume: null, muted: null, isPlaying: null, shuffle: null});
    assert.equal(host.feedback('volume').title, 'Mute unknown'); assert.equal(host.feedback('volume').value, '?');
    assert.deepEqual(host.feedback('volume').indicator, {value: 0, enabled: false});
    assert.equal(host.feedback('transport').status, 'Playback unknown'); assert.match(String(host.feedback('selector').detail), /Follow \(\?\)/);
    f.update({ready: false}, 'retrying');
    await dials.rotate(rotate(ActionTypes.PLAYLIST_SELECTOR, 1, 'selector'));
    assert.equal(host.feedback('selector').title, 'Second'); assert.equal(host.feedback('selector').status, 'Pear offline');
    await dials.press(event(ActionTypes.PLAYLIST_SELECTOR, 'selector'));
    await dials.rotate(rotate(ActionTypes.VOLUME_DIAL, 1, 'volume')); await dials.press(event(ActionTypes.TRANSPORT_DIAL, 'transport'));
    assert.equal(f.calls.length, 0);
    f.update({ready: false}, 'authorizing'); assert.equal(host.feedback('volume').title, 'Approve in Pear');
    dials.dispose();
});

test('controller/context/input guards, legacy aliases, touch refresh, display caching, and cleanup keep dispatch isolated', async () => {
    const f = fakeClient(), host = new DialHost(), dials = new PearDialActions(f.client, host);
    dials.appear(event(ActionTypes.VOLUME_DIAL, 'key', {}, 'Keypad')); assert.equal(host.events.length, 0);
    dials.appear(event(ActionTypes.VOLUME_UP, 'volume')); dials.appear(event(ActionTypes.PLAY_PAUSE, 'transport'));
    await dials.rotate(rotate(ActionTypes.VOLUME_UP, -1, 'volume')); await dials.press(event(ActionTypes.PLAY_PAUSE, 'transport'));
    assert.deepEqual(f.calls, [{name: 'changeVolume', delta: -5}, {name: 'togglePlay'}]);
    const count = host.events.length;
    for (let position = 0; position < 20; ++position) f.update({position}); assert.equal(host.events.length, count);
    for (const ticks of [0, undefined, '1', 0.5, Infinity, Number.MAX_SAFE_INTEGER + 1]) await dials.rotate(rotate(ActionTypes.VOLUME_UP, ticks, 'volume'));
    await dials.rotate({...rotate(ActionTypes.VOLUME_UP, 1, 'volume'), payload: {controller: 'Keypad', ticks: 1}});
    await dials.press(event(ActionTypes.VOLUME_DIAL, 'volume')); await dials.press(event(ActionTypes.VOLUME_UP, 'missing'));
    await dials.rotate(null); dials.touch({});
    assert.equal(f.calls.length, 2); assert.equal(host.events.length, count);
    dials.touch({...event(ActionTypes.VOLUME_UP, 'volume'), payload: {controller: 'Encoder', hold: true}}); assert.equal(host.events.length, count);
    dials.touch({...event(ActionTypes.VOLUME_UP, 'volume'), payload: {controller: 'Encoder', hold: false}}); assert.equal(host.events.length, count + 1);
    assert.equal(f.calls.length, 2, 'touch never duplicates a press command');
    assert.equal(f.listeners.size, 1);
    dials.disappear('volume'); f.update({volume: 20}); assert.equal(host.events.length, count + 1);
    dials.dispose(); assert.equal(f.listeners.size, 0);
    await dials.press(event(ActionTypes.PLAY_PAUSE, 'transport')); dials.appear(event(ActionTypes.VOLUME_DIAL));
    assert.equal(f.calls.length, 2); assert.equal(host.events.length, count + 1);
});
