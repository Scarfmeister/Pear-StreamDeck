import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {FakeScheduler, empty, json, PLAYER_INFO, settle} from './helpers';

function browser(entry: 'pear-plugin' | 'pear-pi') {
    const clock = new FakeScheduler();
    const sockets: HostSocket[] = [];
    const requests: {url: string; init?: RequestInit}[] = [];
    const elements = new Map<string, {value: string; textContent: string; disabled: boolean;
        onclick?: () => void; addEventListener(type: string, callback: () => void): void}>();
    let authorized = false;
    class HostSocket {
        onopen?: () => void;
        onclose?: (event: {code: number}) => void;
        onmessage?: (event: {data: string}) => void;
        onerror?: () => void;
        closed = false;
        readonly sent: Record<string, unknown>[] = [];
        constructor(readonly url: string) { sockets.push(this); }
        send(data: string): void { this.sent.push(JSON.parse(data)); }
        open(): void { this.onopen?.(); }
        receive(value: unknown): void { this.onmessage?.({data: JSON.stringify(value)}); }
        close(): void { this.closed = true; this.onclose?.({code: 1000}); }
    }
    const window: {connectElgatoStreamDeckSocket?: (...args: string[]) => void; addEventListener: () => void} = {
        addEventListener: () => {},
    };
    runInNewContext(readFileSync(`dist/browser-tests/${entry}.js`, 'utf8'), {
        window, document: {readyState: 'complete', addEventListener: () => {},
            getElementById: (id: string) => {
                if (!elements.has(id)) elements.set(id, {value: '', textContent: '', disabled: false, addEventListener: () => {}});
                return elements.get(id);
            }}, WebSocket: HostSocket, URL, AbortController, console,
        setTimeout: (callback: () => void, delay: number) => clock.setTimeout(callback, delay),
        clearTimeout: (handle: unknown) => clock.clearTimeout(handle),
        fetch: async (url: string, init?: RequestInit) => {
            requests.push({url: String(url), init});
            if (String(url).includes('/auth/')) { authorized = true; return json({accessToken: 'browser-secret'}); }
            if (!authorized && String(url).endsWith('/song')) return json({}, 401);
            return String(url).endsWith('/like-state') ? json({state: 'LIKE'}) : empty();
        },
    });
    const info = JSON.stringify({application: {language: 'en'}, devices: []});
    window.connectElgatoStreamDeckSocket!('12345', entry === 'pear-plugin' ? 'plugin' : 'ctx',
        entry === 'pear-plugin' ? 'registerPlugin' : 'registerPropertyInspector', info,
        JSON.stringify({action: 'io.github.scarfmeister.pear-streamdeck.next', context: 'ctx', payload: {settings: {}}}));
    const host = sockets[0];
    host.open();
    return {host, sockets, clock, requests, elements};
}

test('browser plugin registers, loads global settings, persists the token, and exposes token-free PI status', async () => {
    const b = browser('pear-plugin');
    assert.equal(b.requests.length, 0, 'no Pear request before host settings');
    assert.ok(b.host.sent.some(message => message.event === 'registerPlugin'));
    assert.ok(b.host.sent.some(message => message.event === 'getGlobalSettings'));
    await b.clock.advance(1); // Framework's DOM-ready callback, separate from Pear timers.
    b.host.receive({event: 'didReceiveGlobalSettings', payload: {settings: {other: 'preserved'}}});
    await settle();
    assert.equal(b.sockets.length, 2, 'one host socket and one Pear socket');
    assert.ok(b.sockets.every(socket => !socket.url.includes('9863')));
    const writes = b.host.sent.filter(message => message.event === 'setGlobalSettings');
    assert.equal((writes.at(-1)?.payload as {other: string}).other, 'preserved');
    assert.ok(JSON.stringify(writes.at(-1)).includes('browser-secret'));
    b.sockets[1].receive(PLAYER_INFO);
    await settle();
    const action = 'io.github.scarfmeister.pear-streamdeck.next';
    b.host.receive({event: 'sendToPlugin', action, context: 'ctx', payload: {type: 'pear-get-status'}});
    const status = b.host.sent.filter(message => message.event === 'sendToPropertyInspector').at(-1)!;
    assert.equal((status.payload as {connection: string}).connection, 'connected');
    assert.ok(!JSON.stringify(status).includes('secret'));
    b.host.receive({event: 'willAppear', action, context: 'ctx', payload: {controller: 'Keypad', settings: {}}});
    b.host.receive({event: 'keyUp', action, context: 'ctx', payload: {settings: {}}});
    await settle();
    assert.equal(b.requests.filter(request => request.url.endsWith('/next') && request.init?.method === 'POST').length, 1);
    assert.equal(b.host.sent.filter(message => message.event === 'showAlert').length, 0);
    b.host.close();
    await settle();
    assert.equal(b.sockets[1].closed, true);
    assert.equal(b.clock.tasks.size, 0);
});

test('browser PI sends connection messages through the host and opens no Pear transport', async () => {
    const b = browser('pear-pi');
    b.host.receive({event: 'didReceiveGlobalSettings', payload: {settings: {}}});
    await b.clock.advance(1);
    assert.equal(b.sockets.length, 1);
    assert.equal(b.requests.length, 0);
    assert.ok(b.host.sent.some(message => message.event === 'sendToPlugin' &&
        (message.payload as {type: string}).type === 'pear-get-status'));
    b.host.receive({event: 'sendToPropertyInspector', payload: {type: 'pear-status',
        connection: 'connected', authentication: 'disabled', settings: {host: '127.0.0.1', port: 26538, protocol: 'http'}}});
    assert.equal(b.elements.get('globalPort')?.value, '26538');
    assert.equal(b.elements.get('globalConnectionStatus')?.textContent, 'Connected');
    b.elements.get('globalSave')?.onclick?.();
    b.elements.get('globalAuthButton')?.onclick?.();
    const messageTypes = b.host.sent.filter(message => message.event === 'sendToPlugin')
        .map(message => (message.payload as {type: string}).type);
    assert.ok(messageTypes.includes('pear-save-connection') && messageTypes.includes('pear-reauthorize'));
    assert.equal(b.requests.length, 0);
    b.host.close();
});

test('browser host events render the manifest playback images and three distinct repeat images', async () => {
    const b = browser('pear-plugin');
    b.host.receive({event: 'didReceiveGlobalSettings', payload: {settings: {}}});
    await b.clock.advance(1);
    await settle();
    const pear = b.sockets[1];
    pear.receive(PLAYER_INFO);
    await settle();
    const action = 'io.github.scarfmeister.pear-streamdeck.play-pause';
    const manifest = JSON.parse(readFileSync('manifest.json', 'utf8')) as {
        Actions: {UUID: string; DisableAutomaticStates?: boolean; States: {Image: string}[]}[]};
    const playPause = manifest.Actions.find(entry => entry.UUID === action)!;
    const latestState = () => (b.host.sent.filter(message => message.event === 'setState' && message.context === 'play').at(-1)?.payload as {state: number}).state;
    b.host.receive({event: 'willAppear', action, context: 'play', payload: {controller: 'Keypad', settings: {}}});
    assert.equal(playPause.States[latestState()].Image, 'icons/music-pause');
    assert.equal(playPause.DisableAutomaticStates, true);
    pear.receive({type: 'PLAYER_STATE_CHANGED', isPlaying: false, position: 0});
    assert.equal(playPause.States[latestState()].Image, 'icons/music-play');
    b.host.receive({event: 'willAppear', action: 'io.github.scarfmeister.pear-streamdeck.repeat', context: 'repeat',
        payload: {controller: 'Keypad', settings: {}}});
    const images = new Set<string>();
    for (const repeat of ['NONE', 'ALL', 'ONE']) {
        pear.receive({type: 'REPEAT_CHANGED', repeat});
        const image = (b.host.sent.filter(message => message.event === 'setImage' && message.context === 'repeat').at(-1)?.payload as {image: string}).image;
        images.add(image);
        assert.ok(readFileSync(image, 'utf8').startsWith('<svg'));
    }
    assert.equal(images.size, 3);
    const count = b.host.sent.length;
    b.host.receive({event: 'willDisappear', action, context: 'play', payload: {controller: 'Keypad', settings: {}}});
    pear.receive({type: 'PLAYER_STATE_CHANGED', isPlaying: true, position: 0});
    assert.equal(b.host.sent.slice(count).filter(message => message.context === 'play').length, 0);
    b.host.close();
    assert.equal(pear.closed, true);
    assert.equal(b.clock.tasks.size, 0);
});
