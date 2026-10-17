import test from 'node:test';
import assert from 'node:assert/strict';
import {PearRequestError} from '../src/pear/rest-client';
import {deferred, empty, harness, json, PLAYER_INFO, settle} from './helpers';

async function connected() { const h = harness(); await h.connect(); return h; }
function posts(h: ReturnType<typeof harness>) { return h.requests.filter(request => request.init.method === 'POST'); }
const failure = (code: string) => (error: unknown) => error instanceof PearRequestError && error.code === code;

test('playback chooses explicit pause/play from confirmed playing and stopped state; transport sends once', async () => {
    const h = await connected();
    const pause = h.client.commands.togglePlay();
    await settle();
    assert.equal(posts(h).at(-1)?.url, 'http://127.0.0.1:26538/api/v1/pause');
    assert.equal(h.client.getSnapshot().player.isPlaying, true, '204 is not a state confirmation');
    h.latestSocket().send({type: 'PLAYER_STATE_CHANGED', isPlaying: false, position: 0});
    await pause;
    h.latestSocket().send({...PLAYER_INFO, song: undefined, isPlaying: false});
    const play = h.client.commands.togglePlay();
    await settle();
    assert.equal(posts(h).at(-1)?.url, 'http://127.0.0.1:26538/api/v1/play');
    h.latestSocket().send({type: 'PLAYER_STATE_CHANGED', isPlaying: true, position: 0});
    await play;
    const count = posts(h).length;
    await h.client.commands.play();
    assert.equal(posts(h).length, count, 'explicit Play is idempotent when already playing');
    await h.client.commands.next();
    await h.client.commands.previous();
    assert.deepEqual(posts(h).slice(-2).map(request => new URL(request.url).pathname), ['/api/v1/next', '/api/v1/previous']);
    assert.ok(posts(h).every(request => request.init.body === undefined));
    h.client.stop();
});

test('mute uses actual mute independently of zero volume and rejects overlapping toggles', async () => {
    const h = await connected();
    h.latestSocket().send({type: 'VOLUME_CHANGED', volume: 0, muted: false});
    const mute = h.client.commands.toggleMute();
    await assert.rejects(h.client.commands.toggleMute(), failure('command-busy'));
    assert.equal(posts(h).at(-1)?.url.endsWith('/toggle-mute'), true);
    assert.equal(h.client.getSnapshot().player.muted, false);
    h.latestSocket().send({type: 'VOLUME_CHANGED', volume: 0, muted: true});
    await mute;
    const unmute = h.client.commands.toggleMute();
    h.latestSocket().send({type: 'VOLUME_CHANGED', volume: 0, muted: false});
    await unmute;
    assert.equal(h.client.getSnapshot().player.volume, 0);
    assert.equal(posts(h).filter(request => request.url.endsWith('/volume')).length, 0);
    h.client.stop();
});

test('volume inputs serialize across contexts and compute from confirmed state, including external changes', async () => {
    const h = await connected();
    const first = h.client.commands.changeVolume(5);
    const second = h.client.commands.changeVolume(5);
    await settle();
    assert.equal(posts(h).length, 1);
    assert.deepEqual(JSON.parse(String(posts(h)[0].init.body)), {volume: 40});
    assert.equal(h.client.getSnapshot().player.volume, 35);
    h.latestSocket().send({type: 'VOLUME_CHANGED', volume: 40, muted: false});
    h.latestSocket().send({type: 'VOLUME_CHANGED', volume: 70, muted: false});
    await settle();
    assert.deepEqual(JSON.parse(String(posts(h)[1].init.body)), {volume: 75});
    assert.equal(h.client.getSnapshot().player.volume, 70);
    h.latestSocket().send({type: 'VOLUME_CHANGED', volume: 75, muted: false});
    await Promise.all([first, second]);
    h.client.stop();
});

test('volume clamps at both ends, avoids redundant bound commands, and rejects nonfinite input', async () => {
    const h = await connected();
    for (const [volume, delta, target] of [[99, 5, 100], [1, -5, 0], [40, 1000, 100], [40, -1000, 0]]) {
        h.latestSocket().send({type: 'VOLUME_CHANGED', volume, muted: false});
        const change = h.client.commands.changeVolume(delta);
        assert.deepEqual(JSON.parse(String(posts(h).at(-1)?.init.body)), {volume: target});
        h.latestSocket().send({type: 'VOLUME_CHANGED', volume: target, muted: false});
        await change;
    }
    const count = posts(h).length;
    await h.client.commands.changeVolume(-5);
    assert.equal(posts(h).length, count);
    await assert.rejects(h.client.commands.changeVolume(NaN), failure('state-unavailable'));
    h.client.stop();
});

test('failed volume commands retain confirmed state, discard waiting input, and permit a fresh retry', async () => {
    const h = await connected();
    h.respond(request => request.init.method === 'POST' ? json({}, 500) : json({state: 'INDIFFERENT'}));
    const first = h.client.commands.changeVolume(5);
    const second = h.client.commands.changeVolume(5);
    await Promise.all([assert.rejects(first, failure('http')), assert.rejects(second, failure('http'))]);
    assert.equal(posts(h).length, 1);
    assert.equal(h.client.getSnapshot().player.volume, 35);
    h.respond(() => empty());
    const retry = h.client.commands.changeVolume(5);
    h.latestSocket().send({type: 'VOLUME_CHANGED', volume: 40, muted: false});
    await retry;
    h.client.stop();
});

test('rapid input is bounded and cancellation discards all waiting volume commands without replay', async () => {
    const h = await connected();
    const changes = Array.from({length: 17}, () => h.client.commands.changeVolume(1));
    const results = Promise.allSettled(changes);
    await assert.rejects(h.client.commands.changeVolume(1), failure('command-busy'));
    assert.equal(posts(h).length, 1);
    h.client.stop();
    assert.ok((await results).every(result => result.status === 'rejected'));
    await h.connect();
    assert.equal(posts(h).length, 1, 'no canceled command is replayed on reconnect');
    assert.equal(h.clock.tasks.size, 0);
    h.client.stop();
});

test('shuffle toggles both directions using real updates; unsupported off transitions remain visibly on', async () => {
    const h = await connected();
    const on = h.client.commands.toggleShuffle();
    assert.equal(h.client.getSnapshot().player.shuffle, false);
    h.latestSocket().send({type: 'SHUFFLE_CHANGED', shuffle: true});
    await on;
    const off = h.client.commands.toggleShuffle();
    h.latestSocket().send({type: 'SHUFFLE_CHANGED', shuffle: false});
    await off;
    h.latestSocket().send({type: 'SHUFFLE_CHANGED', shuffle: true});
    h.respond(request => request.url.endsWith('/shuffle') && request.init.method === 'GET' ? json({state: true}) : empty());
    const unsupported = assert.rejects(h.client.commands.toggleShuffle(), failure('command-unconfirmed'));
    await h.clock.advance(2000);
    await unsupported;
    assert.equal(h.client.getSnapshot().player.shuffle, true);
    assert.equal(posts(h).length, 3);
    const reads = h.requests.filter(request => request.url.endsWith('/shuffle') && request.init.method === 'GET');
    assert.equal(reads.length, 1, 'one bounded confirmation read');
    await h.clock.advance(60000);
    assert.equal(h.requests.filter(request => request.url.endsWith('/shuffle')).length, 4, 'no polling or replay');
    h.client.stop();
});

test('repeat cycles NONE to ALL to ONE to NONE with one native iteration and confirmed state only', async () => {
    const h = await connected();
    for (const repeat of ['ALL', 'ONE', 'NONE']) {
        const previous = h.client.getSnapshot().player.repeat;
        const cycle = h.client.commands.cycleRepeat();
        await assert.rejects(h.client.commands.cycleRepeat(), failure('command-busy'));
        assert.deepEqual(JSON.parse(String(posts(h).at(-1)?.init.body)), {iteration: 1});
        assert.equal(h.client.getSnapshot().player.repeat, previous);
        h.latestSocket().send({type: 'REPEAT_CHANGED', repeat});
        await cycle;
        assert.equal(h.client.getSnapshot().player.repeat, repeat);
    }
    assert.ok(posts(h).every(request => request.url.endsWith('/switch-repeat')));
    h.client.stop();
});

test('a missed volume push can confirm through one REST read; stale reads cannot override newer events', async () => {
    const h = await connected();
    h.respond(request => request.init.method === 'GET' ? json({state: 40, isMuted: true}) : empty());
    const change = h.client.commands.changeVolume(5);
    await h.clock.advance(2000);
    await change;
    assert.equal(h.client.getSnapshot().player.volume, 40);
    assert.equal(h.client.getSnapshot().player.muted, true);
    const response = deferred<Response>();
    h.respond(() => response.promise);
    const read = h.client.refreshState('volume');
    h.latestSocket().send({type: 'VOLUME_CHANGED', volume: 90, muted: false});
    response.resolve(json({state: 1, isMuted: true}));
    await read;
    assert.equal(h.client.getSnapshot().player.volume, 90);
    assert.equal(h.client.getSnapshot().player.muted, false);
    h.client.stop();
});

test('like/dislike pass through all native rating transitions, including same-state clearing, and reread actual state', async () => {
    for (const initial of ['INDIFFERENT', 'LIKE', 'DISLIKE']) {
        for (const requested of ['LIKE', 'DISLIKE'] as const) {
            const h = await connected();
            let actual = initial;
            h.respond(request => {
                if (request.init.method === 'POST') {
                    actual = actual === requested ? 'INDIFFERENT' : requested; // Native service fake, not optimistic client state.
                    return empty();
                }
                return json({state: actual});
            });
            await h.client.refreshLikeState();
            const command = requested === 'LIKE' ? h.client.commands.like() : h.client.commands.dislike();
            await settle();
            assert.equal(h.client.getSnapshot().player.likeState, initial);
            assert.equal(posts(h).length, 1);
            assert.equal(posts(h)[0].url.endsWith(requested === 'LIKE' ? '/like' : '/dislike'), true);
            await h.clock.advance(150);
            await command;
            assert.equal(h.client.getSnapshot().player.likeState, initial === requested ? 'INDIFFERENT' : requested);
            h.client.stop();
        }
    }
});

test('rating commands cannot consume a pre-command read as their post-command refresh', async () => {
    const h = await connected();
    const old = deferred<Response>();
    let reads = 0;
    h.respond(request => request.init.method === 'POST' ? empty() : ++reads === 1 ? old.promise : json({state: 'LIKE'}));
    const pendingRead = h.client.refreshLikeState();
    const like = h.client.commands.like();
    await h.clock.advance(150);
    old.resolve(json({state: 'INDIFFERENT'}));
    await pendingRead;
    await like;
    assert.equal(h.client.getSnapshot().player.likeState, 'LIKE');
    assert.equal(reads, 2);
    h.client.stop();
});

test('disconnection cancels rating delay and playback confirmation, and unready commands never send', async () => {
    const h = await connected();
    const like = assert.rejects(h.client.commands.like(), failure('aborted'));
    const pause = assert.rejects(h.client.commands.togglePlay(), failure('aborted'));
    await settle();
    const count = h.requests.length;
    h.client.stop();
    await Promise.all([like, pause]);
    await h.clock.advance(60000);
    assert.equal(h.requests.length, count);
    await assert.rejects(h.client.commands.togglePlay(), failure('not-connected'));
    await assert.rejects(h.client.commands.changeVolume(5), failure('not-connected'));
    assert.equal(h.clock.tasks.size, 0);
});

test('malformed REST state cannot enter the shared model or make a command look confirmed', async () => {
    const h = await connected();
    h.respond(() => json({state: 200, isMuted: 'yes', mode: 'LOOP'}));
    for (const field of ['volume', 'shuffle', 'repeat'] as const) {
        await assert.rejects(h.client.refreshState(field), failure('invalid-response'));
    }
    assert.equal(h.client.getSnapshot().player.volume, 35);
    assert.equal(h.client.getSnapshot().player.repeat, 'NONE');
    h.client.stop();
});
