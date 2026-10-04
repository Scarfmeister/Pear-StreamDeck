import test from 'node:test';
import assert from 'node:assert/strict';
import {PearPlaylistError, PearSnapshot} from '../src/pear/pear-client';
import {PearRequestError} from '../src/pear/rest-client';
import {PlaylistStartupMode} from '../src/pear/playlist';
import {deferred, empty, harness, json, PLAYER_INFO, settle, untilAborted} from './helpers';

const posts = (h: ReturnType<typeof harness>) => h.requests.filter(r => r.init.method === 'POST');
const dispatched = (body: string) => json({...JSON.parse(body), status: 'dispatched'});

function unknownShuffle(h: ReturnType<typeof harness>): void {
    // Fault-inject the model's nullable gap. A valid 3.12.0 PLAYER_INFO always includes a boolean.
    const snapshot = h.client.getSnapshot();
    (h.client as unknown as {snapshot: PearSnapshot}).snapshot = Object.freeze({...snapshot,
        player: Object.freeze({...snapshot.player, shuffle: null})});
}

test('playlist client sends exactly one D013 request for every startup mode; dispatch leaves player state unchanged', async () => {
    for (const [mode, state, expected] of [
        ['FOLLOW_SHUFFLE_STATE', true, true], ['FOLLOW_SHUFFLE_STATE', false, false],
        ['ALWAYS_NORMAL', true, false], ['ALWAYS_NORMAL', null, false],
        ['ALWAYS_SHUFFLE', false, true], ['ALWAYS_SHUFFLE', null, true],
    ] as [PlaylistStartupMode, boolean | null, boolean][]) {
        const h = harness();
        await h.connect();
        if (state === null) unknownShuffle(h);
        else h.latestSocket().send({type: 'SHUFFLE_CHANGED', shuffle: state});
        await settle();
        h.respond(r => dispatched(String(r.init.body)));
        const before = h.client.getSnapshot().player;
        const result = await h.client.startPlaylist('https://music.youtube.com/playlist?list=PL_Test', mode);
        assert.deepEqual(result, {playlistId: 'PL_Test', shuffle: expected, status: 'dispatched'});
        assert.equal(h.client.getSnapshot().player, before, 'HTTP success is not a state update');
        assert.equal(posts(h).length, 1);
        assert.equal(posts(h)[0].url, 'http://127.0.0.1:26538/api/v1/play-playlist');
        assert.deepEqual(JSON.parse(String(posts(h)[0].init.body)), {playlistId: 'PL_Test', shuffle: expected});
        h.client.stop();
        assert.equal(h.clock.tasks.size, 0);
    }
});

test('Follow captures known state at activation even if shuffle changes while dispatch is pending', async () => {
    const h = harness(); await h.connect();
    const response = deferred<Response>(); h.respond(() => response.promise);
    const pending = h.client.startPlaylist('PL_Test');
    h.latestSocket().send({type: 'SHUFFLE_CHANGED', shuffle: true});
    response.resolve(dispatched(String(posts(h)[0].init.body)));
    assert.equal((await pending).shuffle, false);
    assert.equal(h.client.getSnapshot().player.shuffle, true);
    h.client.stop();
});

test('Follow unknown state performs one bounded refresh, respects newer pushed state, and otherwise sends no start', async () => {
    for (const outcome of ['valid', 'malformed', 'race'] as const) {
        const h = harness(); await h.connect();
        unknownShuffle(h);
        const read = deferred<Response>();
        h.respond(r => r.init.method === 'GET' ? read.promise : dispatched(String(r.init.body)));
        const pending = h.client.startPlaylist('PL_Test');
        const failed = outcome === 'malformed' ? assert.rejects(pending, {code: 'state-unavailable'}) : undefined;
        if (outcome === 'race') h.latestSocket().send({type: 'SHUFFLE_CHANGED', shuffle: false});
        read.resolve(json(outcome === 'malformed' ? {state: 'bad'} : {state: true}));
        if (failed) { await failed; assert.equal(posts(h).length, 0); }
        else { assert.equal((await pending).shuffle, outcome !== 'race'); assert.equal(posts(h).length, 1); }
        assert.equal(h.requests.filter(r => r.url.endsWith('/shuffle')).length, 1);
        h.client.stop();
    }
});

test('missing/unsupported playlist route reports Stage 7 without any fallback or replay', async () => {
    for (const status of [404, 501]) {
        const h = harness(); await h.connect();
        h.respond(() => json({error: {code: 'private-secret', dispatch: 'not_dispatched'}}, status));
        await assert.rejects(h.client.startPlaylist('PL_Test', 'ALWAYS_SHUFFLE'), error =>
            error instanceof PearPlaylistError && error.reason === 'extension-required' && /Stage 7/.test(error.message));
        await h.clock.advance(60000);
        assert.equal(posts(h).length, 1);
        assert.equal(h.client.getSnapshot().player.shuffle, false);
        assert.ok(!h.logs.join('').includes('private-secret'));
        h.client.stop();
    }
});

test('204, mismatched/malformed dispatch responses, and ambiguous failures never claim startup success', async () => {
    for (const response of [empty(), json({playlistId: 'Wrong', shuffle: false, status: 'dispatched'}),
        json({playlistId: 'PL_Test', shuffle: true, status: 'dispatched'}), json({status: 'playing'}),
        json({playlistId: 'PL_Test', shuffle: false, status: 'dispatched'}, 201), json({}, 502), json({}, 504)]) {
        const h = harness(); await h.connect(); h.respond(() => response);
        await assert.rejects(h.client.startPlaylist('PL_Test'), error => error instanceof PearPlaylistError && error.reason === 'unconfirmed');
        assert.equal(posts(h).length, 1);
        h.client.stop();
    }
});

test('playlist busy, timeout, authorization failure, invalid input, and offline state send no duplicate startup', async () => {
    const h = harness(); await h.connect(); h.respond(r => untilAborted(r.init.signal));
    const pending = h.client.startPlaylist('PL_Test');
    const timedOut = assert.rejects(pending, error => error instanceof PearPlaylistError && error.reason === 'unconfirmed');
    await assert.rejects(h.client.startPlaylist('Other'), {code: 'command-busy'});
    await h.clock.advance(8000); await timedOut;
    assert.equal(posts(h).length, 1);
    h.respond(() => json({}, 401));
    await assert.rejects(h.client.startPlaylist('PL_Test'), error => error instanceof PearRequestError && error.status === 401);
    assert.equal(h.client.getSnapshot().connection, 'authorization-required');
    await assert.rejects(h.client.startPlaylist('PL_Test'), {code: 'not-connected'});
    await assert.rejects(h.client.startPlaylist('bad input'));
    assert.equal(posts(h).length, 2);
    h.client.stop();
    assert.equal(h.clock.tasks.size, 0);
});

test('endpoint changes during Follow refresh cancel old startup instead of submitting it to the new server', async () => {
    const h = harness(); await h.connect();
    unknownShuffle(h);
    const read = deferred<Response>(); h.respond(r => r.url.endsWith('/shuffle') ? read.promise : empty());
    const pending = h.client.startPlaylist('PL_Test');
    const cancelled = assert.rejects(pending, {code: 'aborted'});
    h.client.configure({host: 'other.local'}); await settle();
    h.latestSocket().send(PLAYER_INFO);
    read.resolve(json({state: true})); await cancelled;
    assert.equal(posts(h).length, 0);
    h.client.stop();
});

test('pre-dispatch HTTP rejections remain failures without alternative commands', async () => {
    for (const status of [400, 409, 422, 503]) {
        const h = harness(); await h.connect(); h.respond(() => json({error: {dispatch: 'not_dispatched'}}, status));
        await assert.rejects(h.client.startPlaylist('PL_Test'), error => error instanceof PearRequestError && error.status === status);
        assert.equal(posts(h).length, 1); h.client.stop();
    }
});
