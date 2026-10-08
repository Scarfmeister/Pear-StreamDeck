import test from 'node:test';
import assert from 'node:assert/strict';
import {PearSession} from '../src/streamdeck/pear-session';
import {normalizeSettings, PEAR_CLIENT_ID} from '../src/pear/config';
import {deferred, empty, harness, json, PLAYER_INFO, settle} from './helpers';

test('host settings wait, merge, persist and reload Pear credentials without changing unrelated global fields', async t => {
    const h = harness();
    const globalWrites: Record<string, unknown>[] = [];
    const session = new PearSession({saveGlobalSettings: global => globalWrites.push(global)}, h.dependencies);
    t.after(() => session.client.stop());
    h.respond(request => request.url.includes('/auth/') ? json({accessToken: 'host-secret'})
        : request.url.endsWith('/song') && !new Headers(request.init.headers).has('Authorization') ? json({}, 401) : empty());
    assert.equal(h.requests.length, 0);
    session.receiveGlobalSettings({unrelated: {keep: true}, token: 'old-secret', port: '9863'});
    await settle();
    assert.equal(h.requests[0].url, 'http://127.0.0.1:26538/api/v1/song');
    const latest = globalWrites.at(-1)!;
    assert.deepEqual(latest.unrelated, {keep: true});
    assert.equal(normalizeSettings(latest.pear).credential?.accessToken, 'host-secret');
    h.latestSocket().send(PLAYER_INFO);
    await settle();
    for (const echo of globalWrites) session.receiveGlobalSettings(echo);
    await settle();
    assert.equal(h.sockets.length, 1, 'delayed own writes must not restart authorization or the socket');
    assert.equal(session.client.getSnapshot().connection, 'connected');
    assert.ok(!JSON.stringify(session.status()).includes('secret'));
    assert.equal(session.status().authentication, 'authorized');
});

test('changing the saved endpoint closes the old socket and drops its bound credential', async t => {
    const h = harness();
    const writes: Record<string, unknown>[] = [];
    const session = new PearSession({saveGlobalSettings: settings => writes.push(settings)}, h.dependencies);
    t.after(() => session.client.stop());
    session.receiveGlobalSettings({pear: normalizeSettings({credential: {
        accessToken: 'old-host-secret', endpoint: 'http://127.0.0.1:26538', clientId: PEAR_CLIENT_ID}})});
    await settle();
    const old = h.latestSocket();
    old.send(PLAYER_INFO);
    await settle();
    session.saveConnection({host: 'other', port: '3000', protocol: 'http'});
    await settle();
    assert.equal(old.closed, true);
    assert.equal(session.client.getSettings().credential, undefined);
    assert.equal(h.latestSocket().url, 'ws://other:3000/api/v1/ws');
    assert.equal(new Headers(h.requests.find(request => request.url.startsWith('http://other'))!.init.headers).get('Authorization'), null);
    assert.equal(normalizeSettings(writes.at(-1)!.pear).credential, undefined);
});

test('settings echoes during approval do not start a second auth flow', async t => {
    const h = harness();
    const writes: Record<string, unknown>[] = [];
    const approval = deferred<Response>();
    h.respond(request => request.url.includes('/auth/') ? approval.promise : json({}, 401));
    const session = new PearSession({saveGlobalSettings: settings => writes.push(settings)}, h.dependencies);
    t.after(() => session.client.stop());
    session.receiveGlobalSettings({});
    await settle();
    session.receiveGlobalSettings(writes[0]);
    session.reauthorize();
    await settle();
    assert.equal(session.client.getSnapshot().connection, 'authorizing');
    assert.equal(h.requests.filter(request => request.url.includes('/auth/')).length, 1);
    h.respond(() => empty());
    approval.resolve(json({accessToken: 'approved'}));
    await settle();
    assert.equal(h.sockets.length, 1);
});

test('invalid saved settings can be repaired, while edits before host settings load are rejected', async t => {
    const h = harness();
    const session = new PearSession({saveGlobalSettings: () => {}}, h.dependencies);
    t.after(() => session.client.stop());
    assert.throws(() => session.saveConnection({}), /not loaded/);
    assert.throws(() => session.receiveGlobalSettings({pear: {host: 'http://bad'}}));
    assert.equal(h.requests.length, 0);
    session.saveConnection({host: '127.0.0.1', port: 26538});
    await settle();
    assert.equal(h.sockets.length, 1);
});
