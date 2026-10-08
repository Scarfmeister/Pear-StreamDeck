import test from 'node:test';
import assert from 'node:assert/strict';
import {endpointKey, normalizeSettings, PEAR_CLIENT_ID} from '../src/pear/config';
import {PearSnapshot} from '../src/pear/pear-client';
import {deferred, empty, harness, json, PLAYER_INFO, settle, SONG, untilAborted} from './helpers';

const credentialSettings = () => normalizeSettings({credential: {
    accessToken: 'saved-secret', endpoint: 'http://127.0.0.1:26538', clientId: PEAR_CLIENT_ID}});

test('NONE connects without authorization, waits for PLAYER_INFO, and shares one socket/state', async t => {
    const h = harness();
    t.after(() => h.client.stop());
    const first: PearSnapshot[] = [];
    const second: PearSnapshot[] = [];
    const unsubscribe = h.client.subscribe(state => first.push(state));
    h.client.subscribe(state => second.push(state));
    h.client.start();
    h.client.start();
    await settle();
    assert.equal(h.sockets.length, 1);
    assert.equal(h.client.getSnapshot().connection, 'awaiting-snapshot');
    assert.equal(h.client.getSnapshot().player.ready, false);
    assert.equal(h.latestSocket().url, 'ws://127.0.0.1:26538/api/v1/ws');
    h.latestSocket().send({type: 'POSITION_CHANGED', position: 999});
    assert.equal(h.client.getSnapshot().player.position, null);
    h.latestSocket().send(PLAYER_INFO);
    await settle();
    assert.equal(h.client.getSnapshot().connection, 'connected');
    assert.equal(h.client.getSnapshot().authentication, 'disabled');
    assert.equal(h.requests.filter(request => request.url.includes('/auth/')).length, 0);
    assert.equal(h.requests.filter(request => request.url.endsWith('/like-state')).length, 1);
    const count = h.requests.length;
    for (let i = 0; i < 100; i++) h.latestSocket().send({type: 'POSITION_CHANGED', position: i});
    await settle();
    assert.equal(h.requests.length, count, 'pushed position updates must not trigger polling');
    assert.equal(h.client.getSnapshot().player.song?.title, SONG.title);
    assert.equal(first.at(-1), second.at(-1));
    unsubscribe();
    const observed = first.length;
    h.latestSocket().send({type: 'SHUFFLE_CHANGED', shuffle: true});
    assert.equal(first.length, observed);
});

test('AUTH_AT_FIRST probes, serializes approval, persists a bound token, and reuses it after restart', async t => {
    const h = harness();
    t.after(() => h.client.stop());
    let authorized = false;
    h.respond(request => {
        if (request.url.includes('/auth/')) { authorized = true; return json({accessToken: 'jwt.token'}); }
        if (request.url.endsWith('/song') && !authorized) return json({}, 401);
        return request.url.endsWith('/like-state') ? json({state: 'LIKE'}) : empty();
    });
    await h.connect();
    assert.equal(h.requests.filter(request => request.url.includes('/auth/')).length, 1);
    assert.equal(h.saved[0].authBlocked, 'interrupted');
    const saved = h.saved.at(-1)!;
    assert.equal(saved.authBlocked, undefined);
    assert.equal(saved.credential?.accessToken, 'jwt.token');
    assert.equal(saved.credential?.endpoint, endpointKey(saved));
    assert.equal(saved.credential?.clientId, PEAR_CLIENT_ID);
    const protectedRequest = h.requests.find(request => new Headers(request.init.headers).has('Authorization'))!;
    assert.equal(new Headers(protectedRequest.init.headers).get('Authorization'), 'Bearer jwt.token');
    assert.equal(new URL(h.latestSocket().url).searchParams.get('token'), 'jwt.token');
    assert.equal(h.client.getSnapshot().player.likeState, 'LIKE');
    h.client.stop();
    const restarted = harness(saved);
    t.after(() => restarted.client.stop());
    await restarted.connect();
    assert.equal(restarted.client.getSnapshot().connection, 'connected');
    assert.equal(restarted.requests.filter(request => request.url.includes('/auth/')).length, 0);
    assert.equal(new Headers(restarted.requests[0].init.headers).get('Authorization'), 'Bearer jwt.token');
});

test('denial is persisted, has no retry loop, and explicit Reauthorize recovers', async t => {
    const h = harness();
    t.after(() => h.client.stop());
    h.respond(request => json({}, request.url.includes('/auth/') ? 403 : 401));
    h.client.start();
    await settle();
    assert.equal(h.client.getSnapshot().connection, 'authorization-required');
    assert.equal(h.client.getSnapshot().authentication, 'denied');
    assert.equal(h.saved.at(-1)?.authBlocked, 'denied');
    await h.clock.advance(300000);
    assert.equal(h.requests.length, 2);
    assert.equal(h.clock.tasks.size, 0);
    const restarted = harness(h.saved.at(-1));
    t.after(() => restarted.client.stop());
    restarted.client.start();
    await settle();
    assert.equal(restarted.requests.length, 0);
    restarted.client.reauthorize();
    await settle();
    restarted.latestSocket().send(PLAYER_INFO);
    await settle();
    assert.equal(restarted.client.getSnapshot().authentication, 'disabled');
});

test('repeated Reauthorize while approval is pending creates only one dialog', async t => {
    const h = harness();
    t.after(() => h.client.stop());
    const approval = deferred<Response>();
    let approved = false;
    h.respond(request => {
        if (request.url.includes('/auth/')) return approval.promise;
        if (!approved) return json({}, 401);
        return empty();
    });
    h.client.start();
    await settle();
    assert.equal(h.client.getSnapshot().connection, 'authorizing');
    h.client.reauthorize(); h.client.reauthorize(); h.client.start();
    await settle();
    assert.equal(h.requests.filter(request => request.url.includes('/auth/')).length, 1);
    approved = true;
    approval.resolve(json({accessToken: 'approved'}));
    await settle();
    assert.equal(h.sockets.length, 1);
});

test('malformed auth responses block further attempts without exposing response data', async t => {
    for (const response of [{}, {token: 'legacy-secret'}, {accessToken: 42}, {accessToken: ''}]) {
        const h = harness();
        t.after(() => h.client.stop());
        h.respond(request => request.url.includes('/auth/') ? json(response) : json({}, 401));
        h.client.start();
        await settle();
        assert.equal(h.saved.at(-1)?.authBlocked, 'invalid-response');
        assert.equal(h.client.getSnapshot().connection, 'authorization-required');
        assert.equal(h.sockets.length, 0);
        assert.equal(h.clock.tasks.size, 0);
        assert.ok(!h.logs.join().includes('legacy-secret'));
    }
});

test('approval timeout preserves a blocked marker and does not repeat an ambiguous dialog', async t => {
    const h = harness({}, {authorizationTimeoutMs: 120000});
    t.after(() => h.client.stop());
    h.respond(request => request.url.includes('/auth/') ? untilAborted(request.init.signal) : json({}, 401));
    h.client.start();
    await settle();
    await h.clock.advance(119999);
    assert.equal(h.client.getSnapshot().connection, 'authorizing');
    await h.clock.advance(1);
    assert.equal(h.client.getSnapshot().connection, 'authorization-required');
    assert.equal(h.saved.at(-1)?.authBlocked, 'interrupted');
    await h.clock.advance(300000);
    assert.equal(h.requests.length, 2);
});

test('saved invalid/expired authorization stops instead of silently requesting another prompt', async t => {
    const h = harness(credentialSettings());
    t.after(() => h.client.stop());
    h.respond(() => json({}, 401));
    h.client.start();
    await settle();
    assert.equal(h.client.getSnapshot().connection, 'authorization-required');
    assert.equal(h.client.getSettings().credential, undefined);
    assert.equal(h.saved.at(-1)?.authBlocked, 'invalid');
    assert.equal(h.requests.length, 1);
    assert.equal(h.clock.tasks.size, 0);
});

test('WebSocket policy close 1008 invalidates authorization with no reconnect/prompt loop', async t => {
    const h = harness(credentialSettings());
    t.after(() => h.client.stop());
    h.client.start();
    await settle();
    h.latestSocket().serverClose(1008);
    await h.clock.advance(300000);
    assert.equal(h.client.getSnapshot().connection, 'authorization-required');
    assert.equal(h.sockets.length, 1);
    assert.equal(h.client.getSettings().credential, undefined);
    assert.equal(h.clock.tasks.size, 0);
});

test('Pear starting after the plugin recovers with one bounded timer and one socket', async t => {
    const h = harness();
    t.after(() => h.client.stop());
    let online = false;
    h.respond(request => {
        if (!online) throw new Error('Connection refused');
        return request.url.endsWith('/like-state') ? json({state: null}) : empty();
    });
    h.client.start();
    await settle();
    assert.equal(h.client.getSnapshot().retryInMs, 1000);
    assert.equal(h.clock.tasks.size, 1);
    await h.clock.advance(1000);
    assert.equal(h.client.getSnapshot().retryInMs, 2000);
    assert.equal(h.clock.tasks.size, 1);
    online = true;
    await h.clock.advance(2000);
    assert.equal(h.client.getSnapshot().connection, 'awaiting-snapshot');
    assert.equal(h.sockets.length, 1);
    h.latestSocket().send(PLAYER_INFO);
    await settle();
    assert.equal(h.client.getSnapshot().retryAttempt, 0);
    assert.equal(h.client.getSnapshot().connection, 'connected');
    assert.equal(h.clock.tasks.size, 0);
    assert.equal(h.logs.filter(line => line.includes('unavailable')).length, 1);
});

test('Pear restart closes old generation, gets a new snapshot, and ignores old socket callbacks', async t => {
    const h = harness();
    t.after(() => h.client.stop());
    await h.connect();
    const old = h.latestSocket();
    old.serverClose();
    assert.equal(h.client.getSnapshot().player.ready, false);
    await h.clock.advance(1000);
    assert.equal(h.client.getSnapshot().player.volume, null);
    old.send({...PLAYER_INFO, volume: 99});
    old.serverClose(1008);
    assert.equal(h.client.getSnapshot().connection, 'awaiting-snapshot');
    const current = h.latestSocket();
    current.send({...PLAYER_INFO, isPlaying: false, volume: 20});
    await settle();
    assert.equal(h.client.getSnapshot().player.volume, 20);
    assert.equal(h.client.getSnapshot().player.isPlaying, false);
    assert.equal(h.sockets.filter(socket => !socket.closed).length, 1);
    current.serverClose();
    assert.equal(h.client.getSnapshot().retryInMs, 1000);
});

test('a socket open without PLAYER_INFO times out and closes before retrying', async t => {
    const h = harness();
    t.after(() => h.client.stop());
    h.client.start();
    await settle();
    h.latestSocket().handlers.error();
    await h.clock.advance(15000);
    assert.equal(h.latestSocket().closed, true);
    assert.equal(h.client.getSnapshot().connection, 'retrying');
    assert.equal(h.client.getSnapshot().retryInMs, 1000);
    assert.equal(h.clock.tasks.size, 1);
});

test('connection failures cap retry delays at 30 seconds and coalesce outage logs', async t => {
    const h = harness();
    t.after(() => h.client.stop());
    h.respond(() => { throw new Error('offline'); });
    h.client.start();
    await settle();
    for (const delay of [1000, 2000, 4000, 8000, 16000, 30000, 30000]) {
        assert.equal(h.client.getSnapshot().retryInMs, delay);
        assert.equal(h.clock.tasks.size, 1);
        await h.clock.advance(delay);
    }
    assert.equal(h.logs.length, 1);
    h.client.stop();
    assert.equal(h.clock.tasks.size, 0);
});

test('probe rate limiting respects Retry-After without retrying a command', async t => {
    const h = harness();
    t.after(() => h.client.stop());
    h.respond(() => json({}, 429, {'Retry-After': '60'}));
    h.client.start();
    await settle();
    assert.equal(h.client.getSnapshot().retryInMs, 60000);
    await h.clock.advance(59999);
    assert.equal(h.requests.length, 1);
    await h.clock.advance(1);
    assert.equal(h.requests.length, 2);
});

test('endpoint changes cancel HTTP work and never save a late approval for the old host', async t => {
    const h = harness();
    t.after(() => h.client.stop());
    const oldApproval = deferred<Response>();
    h.respond(request => {
        if (request.url.startsWith('http://127.0.0.1')) {
            return request.url.includes('/auth/') ? oldApproval.promise : json({}, 401);
        }
        return empty();
    });
    h.client.start();
    await settle();
    const oldSignal = h.requests.at(-1)!.init.signal;
    h.client.configure({host: 'other', port: 26538});
    await settle();
    assert.equal(oldSignal?.aborted, true);
    oldApproval.resolve(json({accessToken: 'stale-secret'}));
    await settle();
    assert.equal(h.client.getSettings().credential, undefined);
    assert.ok(!h.saved.some(settings => settings.credential?.accessToken === 'stale-secret'));
    assert.equal(h.latestSocket().url, 'ws://other:26538/api/v1/ws');
});

test('stop cancels pending probes, ignores late results, and schedules no reconnect', async () => {
    const h = harness();
    const pending = deferred<Response>();
    h.respond(() => pending.promise);
    h.client.start();
    await settle();
    h.client.stop();
    assert.equal(h.requests[0].init.signal?.aborted, true);
    pending.resolve(empty());
    await settle();
    assert.equal(h.client.getSnapshot().connection, 'stopped');
    assert.equal(h.sockets.length, 0);
    assert.equal(h.clock.tasks.size, 0);
});

test('volume commands clamp and send once, without marking the target as confirmed', async t => {
    const h = harness();
    t.after(() => h.client.stop());
    await assert.rejects(h.client.setVolume(20), {code: 'not-connected'});
    await h.connect();
    await h.client.setVolume(120);
    assert.equal(h.requests.at(-1)!.init.body, '{"volume":100}');
    assert.equal(h.client.getSnapshot().player.volume, 35);
    h.latestSocket().send({type: 'VOLUME_CHANGED', volume: 100, muted: false});
    assert.equal(h.client.getSnapshot().player.volume, 100);
    h.respond(() => json({}, 500));
    const before = h.requests.length;
    await assert.rejects(h.client.request('POST', 'next'), {status: 500});
    assert.equal(h.requests.length, before + 1);
    assert.equal(h.client.getSnapshot().connection, 'connected');
    assert.equal(h.client.getSnapshot().player.volume, 100);
});

test('a REST command authorization failure closes the socket and requires explicit recovery', async t => {
    const h = harness(credentialSettings());
    t.after(() => h.client.stop());
    await h.connect();
    h.respond(() => json({}, 401));
    await assert.rejects(h.client.request('POST', 'toggle-play'), {status: 401});
    assert.equal(h.latestSocket().closed, true);
    assert.equal(h.client.getSnapshot().connection, 'authorization-required');
    assert.equal(h.clock.tasks.size, 0);
});

test('rating refresh ignores the previous track response and coalesces track changes', async t => {
    const h = harness();
    t.after(() => h.client.stop());
    const oldRating = deferred<Response>();
    let ratingRequests = 0;
    h.respond(request => {
        if (!request.url.endsWith('/like-state')) return empty();
        return ++ratingRequests === 1 ? oldRating.promise : json({state: 'DISLIKE'});
    });
    h.client.start();
    await settle();
    h.latestSocket().send(PLAYER_INFO);
    await settle();
    for (const videoId of ['second', 'third']) {
        h.latestSocket().send({type: 'VIDEO_CHANGED', song: {...SONG, videoId}, position: 0});
    }
    assert.equal(ratingRequests, 1);
    oldRating.resolve(json({state: 'LIKE'}));
    await settle();
    assert.equal(ratingRequests, 2);
    assert.equal(h.client.getSnapshot().player.song?.videoId, 'third');
    assert.equal(h.client.getSnapshot().player.likeState, 'DISLIKE');
});

test('malformed messages and raw transport errors are logged once with no secrets', async t => {
    const h = harness(credentialSettings());
    t.after(() => h.client.stop());
    await h.connect();
    for (let i = 0; i < 20; i++) h.latestSocket().send('{"token":"saved-secret"');
    assert.equal(h.logs.filter(line => line.includes('malformed')).length, 1);
    assert.equal(h.client.getSnapshot().player.volume, 35);
    assert.ok(!h.logs.join().includes('saved-secret'));
    h.latestSocket().serverClose();
    h.respond(() => { throw new Error('Authorization: Bearer saved-secret'); });
    await h.clock.advance(1000);
    assert.ok(!h.logs.join().includes('saved-secret'));
});

test('settings persistence failure is terminal and does not leave an approval/socket retry loop', async t => {
    const h = harness({}, {saveSettings: () => { throw new Error('host unavailable'); }});
    t.after(() => h.client.stop());
    h.respond(() => json({}, 401));
    h.client.start();
    await settle();
    assert.equal(h.client.getSnapshot().connection, 'error');
    assert.equal(h.client.getSnapshot().lastError, 'settings-save');
    assert.equal(h.requests.length, 1);
    assert.equal(h.clock.tasks.size, 0);
});

test('a missing rating response leaves player state connected and unknown rating', async t => {
    const h = harness();
    t.after(() => h.client.stop());
    h.respond(request => request.url.endsWith('/like-state') ? json({unexpected: true}) : empty());
    await h.connect();
    assert.equal(h.client.getSnapshot().connection, 'connected');
    assert.equal(h.client.getSnapshot().player.likeState, null);
    assert.equal(h.client.getSnapshot().player.song?.videoId, SONG.videoId);
});

test('a failed subscriber cannot break the connection or flood logs on position updates', async t => {
    const h = harness();
    t.after(() => h.client.stop());
    const unsubscribe = h.client.subscribe(() => { throw new Error('subscriber-secret'); });
    await h.connect();
    for (let position = 0; position < 100; position++) h.latestSocket().send({type: 'POSITION_CHANGED', position});
    assert.equal(h.client.getSnapshot().player.position, 99);
    assert.equal(h.logs.filter(line => line.includes('subscriber')).length, 1);
    assert.ok(!h.logs.join().includes('subscriber-secret'));
    unsubscribe();
});
