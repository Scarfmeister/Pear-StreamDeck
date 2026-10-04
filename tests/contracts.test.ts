import test from 'node:test';
import assert from 'node:assert/strict';
import {apiUrl, authUrl, changeEndpoint, DEFAULT_CONFIGURATION, endpointKey, normalizeConfiguration,
    normalizeSettings, PEAR_CLIENT_ID, readGlobalSettings, websocketUrl} from '../src/pear/config';
import {parseAuthorizationResponse} from '../src/pear/auth';
import {PearRequestError, PearRestClient} from '../src/pear/rest-client';
import {clampVolume, emptyPlayerState, mergePlayerState} from '../src/pear/state';
import {parsePearMessage} from '../src/pear/websocket';
import {reconnectDelay} from '../src/pear/reconnect';
import {empty, FakeScheduler, json, PLAYER_INFO, settle, SONG, untilAborted} from './helpers';

test('defaults, v1 route variants, auth path, IPv6 and TLS URLs', () => {
    const config = normalizeConfiguration();
    assert.deepEqual(config, DEFAULT_CONFIGURATION);
    for (const path of ['volume', '/volume', '/api/v1/volume']) {
        assert.equal(apiUrl(config, path), 'http://127.0.0.1:26538/api/v1/volume');
    }
    assert.equal(authUrl(config), `http://127.0.0.1:26538/auth/${PEAR_CLIENT_ID}`);
    assert.equal(authUrl(config, 'a/b'), 'http://127.0.0.1:26538/auth/a%2Fb');
    const tls = normalizeConfiguration({host: '[::1]', port: '3000', protocol: 'https'});
    assert.equal(endpointKey(tls), 'https://[::1]:3000');
    assert.equal(websocketUrl(tls), 'wss://[::1]:3000/api/v1/ws');
    const token = 'abc+/=?';
    const ws = new URL(websocketUrl(config, token));
    assert.equal(ws.searchParams.get('token'), token);
    assert.equal(normalizeConfiguration({host: 'localhost'}).host, '127.0.0.1');
});

test('invalid endpoint and route input cannot add credentials, paths or another API version', () => {
    for (const host of ['', 'http://example.com', 'name:123', 'a/b', 'a?token=x', 'user@host', 'a b']) {
        assert.throws(() => normalizeConfiguration({host}));
    }
    for (const port of [0, 65536, -1, 1.2, '26538oops', '', NaN]) assert.throws(() => normalizeConfiguration({port}));
    for (const path of ['../auth/x', '/api/v2/volume', 'http://evil/volume', 'volume?token=x', '//next', '']) {
        assert.throws(() => apiUrl({...DEFAULT_CONFIGURATION}, path));
    }
    assert.throws(() => normalizeConfiguration({protocol: 'ftp'}));
});

test('settings version and endpoint binding prevent legacy or cross-host token reuse', () => {
    assert.equal(readGlobalSettings({host: 'old', port: '9863', token: 'old-token'}).credential, undefined);
    const settings = normalizeSettings({...DEFAULT_CONFIGURATION, credential: {
        accessToken: 'secret', endpoint: endpointKey({...DEFAULT_CONFIGURATION}), clientId: PEAR_CLIENT_ID}});
    assert.equal(settings.credential?.accessToken, 'secret');
    assert.equal(normalizeSettings({...settings, host: 'other'}).credential, undefined);
    assert.equal(changeEndpoint({host: 'other'}, {...settings, authBlocked: 'denied'}).authBlocked, undefined);
    assert.equal(changeEndpoint(DEFAULT_CONFIGURATION, settings).credential?.accessToken, 'secret');
    assert.throws(() => readGlobalSettings({pear: {schemaVersion: 2}}));
});

test('REST builds bearer headers and JSON bodies, and handles empty 204 responses', async () => {
    const requests: {url: string; init: RequestInit}[] = [];
    const rest = new PearRestClient(async (input, init) => {
        requests.push({url: String(input), init: init ?? {}});
        return empty();
    });
    assert.equal(await rest.api({...DEFAULT_CONFIGURATION}, 'next', {method: 'POST', accessToken: 'secret'}), undefined);
    await rest.api({...DEFAULT_CONFIGURATION}, 'volume', {method: 'POST', body: {volume: 42}});
    await rest.api({...DEFAULT_CONFIGURATION}, 'song');
    await rest.authorize({...DEFAULT_CONFIGURATION}, new AbortController().signal);
    assert.equal(requests[0].url, 'http://127.0.0.1:26538/api/v1/next');
    assert.equal(new Headers(requests[0].init.headers).get('Authorization'), 'Bearer secret');
    assert.equal(new Headers(requests[1].init.headers).get('Authorization'), null);
    assert.equal(new Headers(requests[1].init.headers).get('Content-Type'), 'application/json');
    assert.equal(requests[1].init.body, '{"volume":42}');
    assert.equal(requests[2].init.method, 'GET');
    assert.equal(new Headers(requests[2].init.headers).get('Content-Type'), null);
    assert.equal(new Headers(requests[3].init.headers).get('Authorization'), null);
    assert.equal(requests[3].init.method, 'POST');
    assert.equal(requests[0].init.redirect, 'error');
    assert.equal(requests[0].init.credentials, 'omit');
});

test('REST errors retain status and retry hints, without raw response or transport details', async () => {
    const rest = new PearRestClient(async () => new Response('sensitive-body', {status: 401}));
    await assert.rejects(rest.api({...DEFAULT_CONFIGURATION}, 'song', {accessToken: 'secret'}), error => {
        assert.ok(error instanceof PearRequestError);
        assert.equal(error.status, 401);
        assert.ok(!error.message.includes('secret') && !error.message.includes('sensitive'));
        return true;
    });
    const limited = new PearRestClient(async () => json({}, 429, {'Retry-After': '60'}));
    await assert.rejects(limited.api({...DEFAULT_CONFIGURATION}, 'song'), {status: 429, retryAfterMs: 60000});
    const malformed = new PearRestClient(async () => new Response('{bad'));
    await assert.rejects(malformed.api({...DEFAULT_CONFIGURATION}, 'song'), {code: 'invalid-response'});
    const offline = new PearRestClient(async () => { throw new Error('ws://host?token=secret'); });
    await assert.rejects(offline.api({...DEFAULT_CONFIGURATION}, 'song'), {message: 'Pear request failed (network).'});
});

test('REST timeouts and lifecycle aborts release their timers', async () => {
    const clock = new FakeScheduler();
    const rest = new PearRestClient(async (_input, init) => untilAborted(init?.signal), clock);
    const timeout = assert.rejects(rest.api({...DEFAULT_CONFIGURATION}, 'song'), {code: 'timeout'});
    await clock.advance(8000);
    await timeout;
    assert.equal(clock.tasks.size, 0);
    const controller = new AbortController();
    const aborted = assert.rejects(rest.api({...DEFAULT_CONFIGURATION}, 'song', {signal: controller.signal}), {code: 'aborted'});
    controller.abort();
    await aborted;
    assert.equal(clock.tasks.size, 0);
    const alreadyAborted = assert.rejects(rest.api({...DEFAULT_CONFIGURATION}, 'song', {signal: controller.signal}), {code: 'aborted'});
    await alreadyAborted;
    await settle();
    assert.equal(clock.tasks.size, 0);
});

test('authorization accepts only accessToken, rejecting malformed and legacy responses', () => {
    assert.equal(parseAuthorizationResponse({accessToken: 'jwt.token'}), 'jwt.token');
    for (const value of [null, [], {}, {token: 'old'}, {accessToken: ''}, {accessToken: 123}, {accessToken: 'a\r\nb'}]) {
        assert.throws(() => parseAuthorizationResponse(value), {code: 'invalid-response'});
    }
});

test('all seven flat WebSocket events parse and partial updates preserve metadata', () => {
    const events = [PLAYER_INFO, {type: 'VIDEO_CHANGED', song: {...SONG, videoId: 'next'}, position: 0},
        {type: 'PLAYER_STATE_CHANGED', isPlaying: false, position: 13}, {type: 'POSITION_CHANGED', position: 14},
        {type: 'VOLUME_CHANGED', volume: 100, muted: true}, {type: 'REPEAT_CHANGED', repeat: 'ONE'},
        {type: 'SHUFFLE_CHANGED', shuffle: true}];
    let state = emptyPlayerState();
    for (const event of events) {
        const parsed = parsePearMessage(JSON.stringify(event));
        assert.ok(parsed);
        assert.equal(parsed.type, event.type);
        state = mergePlayerState(state, parsed.update);
    }
    assert.equal(state.song?.videoId, 'next');
    assert.equal(state.position, 14);
    assert.equal(state.isPlaying, false);
    assert.equal(state.volume, 100);
    assert.equal(state.muted, true);
    assert.equal(state.repeat, 'ONE');
    assert.equal(state.shuffle, true);
    assert.ok(Object.isFrozen(state) && Object.isFrozen(state.song));
    assert.ok(parsePearMessage(JSON.stringify({...PLAYER_INFO, song: undefined})));
});

test('malformed, oversized, unknown and incorrectly typed messages cannot corrupt state', () => {
    const invalid = ['{bad', 'null', '[]', '1', JSON.stringify({type: 'FUTURE_EVENT', volume: 10}),
        JSON.stringify({type: 'PLAYER_INFO', data: PLAYER_INFO}),
        JSON.stringify({type: 'VOLUME_CHANGED', volume: 101, muted: false}),
        JSON.stringify({type: 'VOLUME_CHANGED', volume: '40', muted: false}),
        JSON.stringify({type: 'VOLUME_CHANGED', volume: 40, muted: 'false'}),
        JSON.stringify({type: 'POSITION_CHANGED', position: -1}),
        JSON.stringify({type: 'REPEAT_CHANGED', repeat: 'BOGUS'}),
        JSON.stringify({type: 'VIDEO_CHANGED', song: {title: 'bad'}, position: 0}),
        JSON.stringify({type: 'VIDEO_CHANGED', song: {...SONG, imageSrc: 42}, position: 0}),
        JSON.stringify({type: 'PLAYER_INFO', isPlaying: false}), ' '.repeat(65537)];
    for (const value of invalid) assert.equal(parsePearMessage(value), null);
    assert.equal(parsePearMessage({type: 'POSITION_CHANGED', position: 0}), null);
});

test('volume clamping rejects non-finite inputs and preserves finite values within 0–100', () => {
    for (const [input, output] of [[-5, 0], [0, 0], [0.5, 0.5], [99, 99], [100, 100], [999, 100]]) {
        assert.equal(clampVolume(input), output);
    }
    for (const input of [NaN, Infinity, -Infinity]) assert.throws(() => clampVolume(input));
});

test('backoff follows 1, 2, 4, 8, 16, 30 seconds with bounded jitter', () => {
    assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 99].map(attempt => reconnectDelay(attempt, () => 0.5)),
        [1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000]);
    assert.equal(reconnectDelay(1, () => 0), 800);
    assert.equal(reconnectDelay(1, () => 1), 1200);
    assert.equal(reconnectDelay(99, () => 1), 30000);
});
