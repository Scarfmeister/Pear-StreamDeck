import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {FakeScheduler, empty, json, PLAYER_INFO, settle} from './helpers';
import {ActionTypes} from '../src/interfaces/enums';

function browser(entry: 'pear-plugin' | 'pear-pi', options: {action?: string; settings?: unknown; piUuid?: string} = {}) {
    const clock = new FakeScheduler();
    const sockets: HostSocket[] = [];
    const requests: {url: string; init?: RequestInit}[] = [];
    const elements = new Map<string, Element>();
    class Element {
        private identifier = '';
        value = ''; textContent = ''; disabled = false; hidden = true; src = '';
        files?: {type: string; size: number}[];
        onclick?: () => void;
        parent?: Element;
        readonly children: Element[] = [];
        private readonly listeners = new Map<string, (() => void)[]>();
        get id() { return this.identifier; }
        set id(value: string) { this.identifier = value; elements.set(value, this); }
        input(): void { this.emit('input'); }
        change(): void { this.emit('change'); }
        emit(type: string): void { this.listeners.get(type)?.forEach(callback => callback()); }
        addEventListener(type: string, callback: () => void): void {
            this.listeners.set(type, [...(this.listeners.get(type) ?? []), callback]);
        }
        appendChild(child: Element): void { this.children.push(child); child.parent = this; }
        replaceChildren(): void { for (const child of [...this.children]) child.remove(); }
        remove(): void {
            this.replaceChildren(); if (this.id) elements.delete(this.id);
            this.parent?.children.splice(this.parent.children.indexOf(this), 1);
        }
        removeAttribute(name: string): void { if (name === 'src') this.src = ''; }
    }
    const readers: Reader[] = [];
    class Reader {
        result: unknown;
        onload?: () => void; onerror?: () => void; onabort?: () => void;
        readAsDataURL(): void { readers.push(this); }
        finish(result: string): void { this.result = result; this.onload?.(); }
    }
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
            createElement: () => new Element(),
            getElementById: (id: string) => {
                if (!elements.has(id)) { const element = new Element(); element.id = id; }
                return elements.get(id);
            }}, FileReader: Reader, WebSocket: HostSocket, URL, AbortController, console,
        setTimeout: (callback: () => void, delay: number) => clock.setTimeout(callback, delay),
        clearTimeout: (handle: unknown) => clock.clearTimeout(handle),
        fetch: async (url: string, init?: RequestInit) => {
            requests.push({url: String(url), init});
            if (String(url).includes('/auth/')) { authorized = true; return json({accessToken: 'browser-secret'}); }
            if (!authorized && String(url).endsWith('/song')) return json({}, 401);
            if (String(url).endsWith('/play-playlist')) return json({}, 404);
            return String(url).endsWith('/like-state') ? json({state: 'LIKE'}) : empty();
        },
    });
    const info = JSON.stringify({application: {language: 'en'}, devices: []});
    window.connectElgatoStreamDeckSocket!('12345', entry === 'pear-plugin' ? 'plugin' : options.piUuid ?? 'ctx',
        entry === 'pear-plugin' ? 'registerPlugin' : 'registerPropertyInspector', info,
        JSON.stringify({action: options.action ?? 'io.github.scarfmeister.pear-streamdeck.next', context: 'ctx', payload: {settings: options.settings ?? {}}}));
    const host = sockets[0];
    host.open();
    return {host, sockets, clock, requests, elements, readers};
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

test('PI volume defaults/validation/persistence use the action context, retaining early host settings and unsaved edits', async () => {
    const action = 'io.github.scarfmeister.pear-streamdeck.volume-down';
    const b = browser('pear-pi', {action, settings: {steps: 1}, piUuid: 'ui-registration'});
    const update = (settings: unknown) => b.host.receive({event: 'didReceiveSettings', action, context: 'ctx', payload: {settings}});
    assert.ok(b.host.sent.some(message => message.event === 'getSettings' && message.action === action && message.context === 'ctx'));
    update({steps: '10', retained: true}); // Arrives before setupReady.
    b.host.receive({event: 'didReceiveGlobalSettings', payload: {settings: {}}});
    await b.clock.advance(1);
    assert.equal(b.elements.get('volumeSettings')?.hidden, false);
    assert.equal(b.elements.get('playlistSettings')?.hidden, true);
    assert.equal(b.elements.get('volumeStep')?.value, '10');
    const input = b.elements.get('volumeStep')!;
    input.value = '2.5'; input.input();
    update({steps: 5, retained: 'new'});
    assert.equal(input.value, '2.5', 'incoming state/settings do not erase unsaved edits');
    b.elements.get('actionSave')?.onclick?.();
    assert.match(b.elements.get('actionMessage')!.textContent, /whole percentage/);
    assert.equal(b.host.sent.filter(m => m.event === 'setSettings').length, 0);
    input.value = '2'; input.input(); b.elements.get('actionSave')?.onclick?.();
    const write = b.host.sent.filter(m => m.event === 'setSettings').at(-1)!;
    assert.equal(write.action, action); assert.equal(write.context, 'ctx');
    assert.deepEqual(write.payload, {steps: 2, retained: 'new'});
    assert.equal(b.host.sent.filter(m => m.event === 'setGlobalSettings').length, 0);
    assert.equal(b.requests.length, 0); assert.equal(b.sockets.length, 1);
    update({steps: 'invalid'}); assert.equal(input.value, '5');
    b.host.close();
});

test('PI displays every Track Info selection and saves it per context without changing globals', async () => {
    const action = 'io.github.scarfmeister.pear-streamdeck.song-info';
    const b = browser('pear-pi', {action});
    b.host.receive({event: 'didReceiveGlobalSettings', payload: {settings: {}}}); await b.clock.advance(1);
    assert.equal(b.elements.get('trackInfoSettings')?.hidden, false);
    const select = b.elements.get('trackInfoFormat')!;
    assert.equal(select.value, 'TITLE_ARTIST');
    for (const format of ['TITLE', 'ARTIST', 'TITLE_ARTIST', 'ALBUM', 'TITLE_ARTIST_ALBUM']) {
        select.value = format; select.input(); b.elements.get('actionSave')?.onclick?.();
        assert.equal((b.host.sent.filter(m => m.event === 'setSettings').at(-1)?.payload as {displayFormat: string}).displayFormat, format);
    }
    assert.equal(b.requests.length, 0); b.host.close();
});

test('PI playlist URL normalizes to stored ID, validates malformed edits, and defaults Follow while exposing Stage 7', async () => {
    const action = 'io.github.scarfmeister.pear-streamdeck.play-playlist';
    const b = browser('pear-pi', {action, settings: {playlistUrl: 'https://music.youtube.com/playlist?list=New', playlistId: 'Old', retained: true}});
    b.host.receive({event: 'didReceiveGlobalSettings', payload: {settings: {}}}); await b.clock.advance(1);
    assert.equal(b.elements.get('playlistSettings')?.hidden, false);
    assert.equal(b.elements.get('playlistStartupMode')?.value, 'FOLLOW_SHUFFLE_STATE');
    b.elements.get('actionSave')?.onclick?.();
    assert.deepEqual(b.host.sent.filter(m => m.event === 'setSettings').at(-1)?.payload,
        {playlistId: 'New', retained: true, startupMode: 'FOLLOW_SHUFFLE_STATE'});
    assert.equal(b.elements.get('playlistInput')?.value, 'New');
    const input = b.elements.get('playlistInput')!;
    input.value = 'https://evil.test/playlist?list=bad'; input.input(); b.elements.get('actionSave')?.onclick?.();
    assert.equal(b.host.sent.filter(m => m.event === 'setSettings').length, 1);
    assert.match(b.elements.get('actionMessage')!.textContent, /playlist ID/);
    assert.ok(readFileSync('property-inspector.html', 'utf8').includes('Stage 7'));
    assert.equal(b.requests.length, 0); b.host.close();
});

test('PI connection validation errors preserve user edits until the plugin confirms saving', async () => {
    const b = browser('pear-pi');
    b.host.receive({event: 'didReceiveGlobalSettings', payload: {settings: {}}}); await b.clock.advance(1);
    const status = {type: 'pear-status', connection: 'connected', authentication: 'authorized',
        settings: {host: '127.0.0.1', port: 26538, protocol: 'http'}};
    b.host.receive({event: 'sendToPropertyInspector', payload: status});
    const port = b.elements.get('globalPort')!;
    port.value = 'bad'; port.input(); b.elements.get('globalSave')?.onclick?.();
    b.host.receive({event: 'sendToPropertyInspector', payload: {...status, error: 'Port is invalid.'}});
    assert.equal(port.value, 'bad');
    assert.equal(b.elements.get('connectionError')?.textContent, 'Port is invalid.');
    b.host.receive({event: 'sendToPropertyInspector', payload: {type: 'pear-connection-saved'}});
    b.host.receive({event: 'sendToPropertyInspector', payload: status});
    assert.equal(port.value, '26538');
    assert.equal(b.elements.get('globalAuthStatus')?.textContent, 'Authorized');
    assert.ok(!JSON.stringify(b.host.sent).includes('accessToken'));
    b.host.close();
});

test('browser playlist activation calls only the documented route and surfaces missing capability to its PI/key', async () => {
    const b = browser('pear-plugin');
    b.host.receive({event: 'didReceiveGlobalSettings', payload: {settings: {}}}); await b.clock.advance(1); await settle();
    b.sockets[1].receive(PLAYER_INFO); await settle();
    const action = 'io.github.scarfmeister.pear-streamdeck.play-playlist';
    const settings = {playlistId: 'PL_Test', startupMode: 'ALWAYS_SHUFFLE'};
    b.host.receive({event: 'sendToPlugin', action, context: 'ctx', payload: {type: 'pear-get-status'}});
    b.host.receive({event: 'willAppear', action, context: 'ctx', payload: {settings, controller: 'Keypad'}});
    b.host.receive({event: 'keyUp', action, context: 'ctx', payload: {settings}}); await settle();
    const commands = b.requests.filter(r => r.init?.method === 'POST' && !r.url.includes('/auth/'));
    assert.equal(commands.length, 1); assert.ok(commands[0].url.endsWith('/play-playlist'));
    assert.deepEqual(JSON.parse(String(commands[0].init?.body)), {playlistId: 'PL_Test', shuffle: true});
    assert.ok(b.host.sent.some(m => m.event === 'showAlert'));
    assert.ok(b.host.sent.some(m => m.event === 'setTitle' && (m.payload as {title: string}).title === 'Stage 7\nrequired'));
    assert.ok(b.host.sent.some(m => m.event === 'sendToPropertyInspector' && (m.payload as {message?: string}).message?.includes('Stage 7')));
    assert.ok(!JSON.stringify(b.host.sent.filter(m => m.event === 'sendToPropertyInspector')).includes('browser-secret'));
    b.host.close(); assert.equal(b.clock.tasks.size, 0);
});

test('browser encoder dispatch uses one Pear socket, documented feedback, release-only press, and the typed touch adapter', async () => {
    const b = browser('pear-plugin');
    b.host.receive({event: 'didReceiveGlobalSettings', payload: {settings: {}}}); await b.clock.advance(1); await settle();
    const pear = b.sockets[1]; pear.receive(PLAYER_INFO); await settle();
    const action = ActionTypes.VOLUME_DIAL;
    const send = (event: string, payload: Record<string, unknown> = {}) => b.host.receive({event, action, context: 'volume',
        payload: {controller: 'Encoder', settings: {steps: 2}, ...payload}});
    send('willAppear');
    assert.ok(b.host.sent.some(m => m.event === 'setFeedbackLayout' && m.context === 'volume' && (m.payload as {layout: string}).layout === '$B1'));
    send('dialRotate', {ticks: 3, pressed: false}); await settle();
    const volume = b.requests.filter(r => r.url.endsWith('/volume') && r.init?.method === 'POST');
    assert.equal(volume.length, 1); assert.deepEqual(JSON.parse(String(volume[0].init?.body)), {volume: PLAYER_INFO.volume + 6});
    const feedback = () => b.host.sent.filter(m => m.event === 'setFeedback' && m.context === 'volume');
    assert.equal((feedback().at(-1)?.payload as {value: string}).value, `${PLAYER_INFO.volume}%`);
    pear.receive({type: 'VOLUME_CHANGED', volume: PLAYER_INFO.volume + 6, muted: false}); await settle();
    send('dialDown'); await settle(); assert.equal(b.requests.filter(r => r.url.endsWith('/toggle-mute')).length, 0);
    send('dialUp'); await settle(); assert.equal(b.requests.filter(r => r.url.endsWith('/toggle-mute')).length, 1);
    pear.receive({type: 'VOLUME_CHANGED', volume: PLAYER_INFO.volume + 6, muted: true}); await settle();
    assert.equal((feedback().at(-1)?.payload as {title: string}).title, 'Muted');
    const count = feedback().length;
    send('touchTap', {hold: false, tapPos: [30, 30]}); assert.equal(feedback().length, count + 1);
    send('touchTap', {hold: true, tapPos: [30, 30]}); assert.equal(feedback().length, count + 1);
    assert.equal(b.requests.filter(r => r.url.endsWith('/toggle-mute')).length, 1, 'touch/down must not duplicate presses');
    const transport = ActionTypes.TRANSPORT_DIAL;
    b.host.receive({event: 'willAppear', action: transport, context: 'transport', payload: {controller: 'Encoder', settings: {}}});
    b.host.receive({event: 'dialRotate', action: transport, context: 'transport', payload: {controller: 'Encoder', ticks: -2, settings: {}}}); await settle();
    assert.equal(b.requests.filter(r => r.url.endsWith('/previous')).length, 2);
    b.host.receive({event: 'dialUp', action: transport, context: 'transport', payload: {controller: 'Encoder', settings: {}}}); await settle();
    assert.equal(b.requests.filter(r => r.url.endsWith('/pause')).length, 1);
    pear.receive({type: 'PLAYER_STATE_CHANGED', isPlaying: false, position: 5}); await settle();
    assert.equal((b.host.sent.filter(m => m.event === 'setFeedback' && m.context === 'transport').at(-1)?.payload as {status: string}).status, 'Paused / stopped');
    b.host.receive({event: 'dialUp', action: transport, context: 'transport', payload: {controller: 'Encoder', settings: {}}}); await settle();
    assert.equal(b.requests.filter(r => r.url.endsWith('/play')).length, 1);
    pear.receive({type: 'PLAYER_STATE_CHANGED', isPlaying: true, position: 5}); await settle();
    b.host.receive({event: 'willAppear', action: ActionTypes.VOLUME_UP, context: 'legacy', payload: {controller: 'Encoder', settings: {}}});
    const postCount = b.requests.filter(r => r.init?.method === 'POST').length;
    b.host.receive({event: 'keyUp', action: ActionTypes.VOLUME_UP, context: 'legacy', payload: {settings: {}}}); await settle();
    assert.equal(b.requests.filter(r => r.init?.method === 'POST').length, postCount, 'keyUp without a controller cannot activate a visible legacy encoder');
    assert.equal(b.sockets.length, 2, 'keys and all encoders share the one Pear connection');
    const before = b.host.sent.length; send('willDisappear'); pear.receive({type: 'VOLUME_CHANGED', volume: 10, muted: false});
    assert.equal(b.host.sent.slice(before).filter(m => m.context === 'volume').length, 0);
    b.host.close(); assert.equal(pear.closed, true); assert.equal(b.clock.tasks.size, 0);
});

test('browser selector saves selection and captures actual shuffle without legacy fallback or false playlist success', async () => {
    const b = browser('pear-plugin');
    b.host.receive({event: 'didReceiveGlobalSettings', payload: {settings: {}}}); await b.clock.advance(1); await settle();
    const pear = b.sockets[1]; pear.receive(PLAYER_INFO); await settle();
    const action = ActionTypes.PLAYLIST_SELECTOR;
    const settings = {playlists: [{name: 'A', playlistId: 'A'}, {name: 'B', playlistId: 'B'}], selectedIndex: 0, retained: true};
    b.host.receive({event: 'sendToPlugin', action, context: 'selector', payload: {type: 'pear-get-status'}});
    b.host.receive({event: 'willAppear', action, context: 'selector', payload: {controller: 'Encoder', settings}});
    b.host.receive({event: 'dialRotate', action, context: 'selector', payload: {controller: 'Encoder', settings, ticks: -1}});
    const write = b.host.sent.filter(m => m.event === 'setSettings').at(-1)!;
    assert.equal(write.context, 'selector'); assert.deepEqual(write.payload, {...settings, selectedIndex: 1});
    pear.receive({type: 'SHUFFLE_CHANGED', shuffle: true});
    b.host.receive({event: 'dialUp', action, context: 'selector', payload: {controller: 'Encoder', settings}}); await settle();
    const posts = b.requests.filter(r => r.init?.method === 'POST' && !r.url.includes('/auth/'));
    assert.equal(posts.length, 1); assert.ok(posts[0].url.endsWith('/play-playlist'));
    assert.deepEqual(JSON.parse(String(posts[0].init?.body)), {playlistId: 'B', shuffle: true});
    assert.ok(b.host.sent.some(m => m.event === 'sendToPropertyInspector' && (m.payload as {message?: string}).message?.includes('Stage 7')));
    assert.equal((b.host.sent.filter(m => m.event === 'setFeedback' && m.context === 'selector').at(-1)?.payload as {status: string}).status, 'Stage 7 required');
    assert.equal(b.sockets.length, 2); b.host.close(); assert.equal(b.clock.tasks.size, 0);
});

test('selector PI edits/normalizes entries, preserves rotation during edits, and stores bounded images without a Pear transport', async () => {
    const action = ActionTypes.PLAYLIST_SELECTOR;
    const settings = {playlists: [{name: 'First', playlistId: 'First'}, {name: 'Second', playlistId: 'Second'}], selectedIndex: 0, retained: true};
    const b = browser('pear-pi', {action, settings, piUuid: 'inspector-id'});
    b.host.receive({event: 'didReceiveGlobalSettings', payload: {settings: {}}}); await b.clock.advance(1);
    assert.equal(b.elements.get('selectorSettings')?.hidden, false);
    assert.equal(b.elements.get('selectorEntries')?.children.length, 2);
    const name = b.elements.get('playlist-1-name')!, input = b.elements.get('playlist-1-input')!;
    name.value = '<b>New name</b>'; name.input(); input.value = 'https://music.youtube.com/playlist?list=New'; input.input();
    b.host.receive({event: 'didReceiveSettings', action, context: 'ctx', payload: {settings: {...settings, selectedIndex: 1}}});
    assert.equal(name.value, '<b>New name</b>', 'rotation settings do not erase the draft');
    const image = b.elements.get('playlist-1-image')!;
    image.files = [{type: 'image/png', size: 25 * 1024}]; image.change(); assert.equal(b.readers.length, 0);
    assert.match(b.elements.get('actionMessage')!.textContent, /24 KiB/);
    image.files = [{type: 'image/png', size: 68}]; image.change();
    b.elements.get('actionSave')?.onclick?.(); assert.equal(b.host.sent.filter(m => m.event === 'setSettings').length, 0);
    assert.match(b.elements.get('actionMessage')!.textContent, /finish loading/);
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRmkAAAAASUVORK5CYII=';
    b.readers[0].finish(png); b.elements.get('actionSave')?.onclick?.();
    const saved = b.host.sent.filter(m => m.event === 'setSettings').at(-1)!;
    assert.equal(saved.action, action); assert.equal(saved.context, 'ctx');
    assert.deepEqual(saved.payload, {selectedIndex: 1, retained: true, playlists: [
        {name: '<b>New name</b>', playlistId: 'New', startupMode: 'FOLLOW_SHUFFLE_STATE', image: png},
        {name: 'Second', playlistId: 'Second', startupMode: 'FOLLOW_SHUFFLE_STATE'}]});
    b.elements.get('selectorAdd')?.onclick?.();
    assert.equal(b.elements.get('selectorEntries')?.children.length, 3);
    b.elements.get('actionSave')?.onclick?.(); assert.match(b.elements.get('actionMessage')!.textContent, /name/);
    assert.equal(b.host.sent.filter(m => m.event === 'setSettings').length, 1);
    assert.equal(b.requests.length, 0); assert.equal(b.sockets.length, 1); b.host.close();
});

test('dedicated Volume Dial PI reuses step settings and retains safe defaults', async () => {
    const b = browser('pear-pi', {action: ActionTypes.VOLUME_DIAL, settings: {steps: 'invalid'}});
    b.host.receive({event: 'didReceiveGlobalSettings', payload: {settings: {}}}); await b.clock.advance(1);
    assert.equal(b.elements.get('volumeSettings')?.hidden, false); assert.equal(b.elements.get('volumeStep')?.value, '5');
    b.elements.get('volumeStep')!.value = '3'; b.elements.get('volumeStep')!.input(); b.elements.get('actionSave')?.onclick?.();
    assert.deepEqual(b.host.sent.filter(m => m.event === 'setSettings').at(-1)?.payload, {steps: 3});
    assert.equal(b.requests.length, 0); b.host.close();
});

test('encoder manifest/layout resources and browser feedback agree within the 200×100 touch display', async () => {
    const manifest = JSON.parse(readFileSync('manifest.json', 'utf8')) as {SDKVersion: number; CodePath: string;
        Actions: {UUID: string; Controllers?: string[]; Encoder?: {layout: string}}[]};
    assert.equal(manifest.SDKVersion, 2); assert.equal(manifest.CodePath, 'action.html');
    const layout = JSON.parse(readFileSync('dial-layout.json', 'utf8')) as {items: {key: string; rect: number[]}[]};
    assert.equal(new Set(layout.items.map(item => item.key)).size, layout.items.length);
    for (const [i, item] of layout.items.entries()) {
        const [x, y, width, height] = item.rect;
        assert.ok(x >= 0 && y >= 0 && width > 0 && height > 0 && x + width <= 200 && y + height <= 100);
        for (const other of layout.items.slice(i + 1)) {
            const [ox, oy, ow, oh] = other.rect;
            assert.ok(x + width <= ox || ox + ow <= x || y + height <= oy || oy + oh <= y, 'layout items must not overlap');
        }
    }
    const b = browser('pear-plugin');
    b.host.receive({event: 'didReceiveGlobalSettings', payload: {settings: {}}}); await b.clock.advance(1); await settle();
    b.sockets[1].receive(PLAYER_INFO); await settle();
    for (const action of [ActionTypes.VOLUME_DIAL, ActionTypes.TRANSPORT_DIAL, ActionTypes.PLAYLIST_SELECTOR]) {
        const declaration = manifest.Actions.find(entry => entry.UUID === action)!;
        assert.deepEqual(declaration.Controllers, ['Encoder']);
        b.host.receive({event: 'willAppear', action, context: action, payload: {controller: 'Encoder', settings: {}}});
        const feedback = b.host.sent.filter(m => m.event === 'setFeedback' && m.context === action).at(-1)!.payload as Record<string, unknown>;
        if (declaration.Encoder?.layout === 'dial-layout.json') assert.deepEqual(Object.keys(feedback).sort(), layout.items.map(item => item.key).sort());
        else assert.equal(declaration.Encoder?.layout, '$B1');
        assert.deepEqual([...readFileSync(feedback.icon as string).subarray(0, 4)], [137, 80, 78, 71]);
    }
    b.host.close(); assert.equal(b.clock.tasks.size, 0);
});
