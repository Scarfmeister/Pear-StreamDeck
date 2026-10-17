const {buildSync} = require('esbuild');
const {execFileSync} = require('node:child_process');
const {existsSync, mkdtempSync, rmSync} = require('node:fs');
const {tmpdir} = require('node:os');
const {join, resolve} = require('node:path');

// Optional cross-repository contract verification. Pear source stays in its own checkout.
// node scripts/test-pear-extension.js /path/to/pear-desktop [public-browse-json]
const pear = process.argv[2] && resolve(process.argv[2]);
if (!pear || !existsSync(join(pear, 'tests/api-playlist-fixtures.ts'))) {
    throw new Error('Supply a Pear checkout containing the Stage 7 playlist extension and its tests.');
}
const root = resolve(__dirname, '..');
const temporary = mkdtempSync(join(tmpdir(), 'pear-playlist-integration-'));
const output = join(temporary, 'integration.cjs');
const quoted = value => JSON.stringify(value);
const dependency = name => quoted(require.resolve(name, {paths: [pear]}));
try {
    buildSync({stdin: {sourcefile: 'pear-extension-integration.ts', resolveDir: root, loader: 'ts', contents: `
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {readFileSync} from 'node:fs';
import {serve} from ${dependency('@hono/node-server')};
import {sign} from ${dependency('hono/jwt')};
import {AuthStrategy} from ${quoted(join(pear, 'src/plugins/api-server/config.ts'))};
import {fixture, ID, state, normal, shuffle, browse, deferred} from ${quoted(join(pear, 'tests/api-playlist-fixtures.ts'))};
import {resolvePlaylistCommand} from ${quoted(join(pear, 'src/plugins/api-server/renderer/playlist-command.ts'))};
import {PEAR_CLIENT_ID} from ${quoted(join(root, 'src/pear/config.ts'))};
import {PearPlaylistError} from ${quoted(join(root, 'src/pear/pear-client.ts'))};
import {harness, settle} from ${quoted(join(root, 'tests/helpers.ts'))};

async function main() {
    const f = fixture(AuthStrategy.AUTH_AT_FIRST);
    f.setConfig({authorizedClients: [PEAR_CLIENT_ID]});
    f.adapter.start();
    const server = serve({fetch: f.app.fetch, hostname: '127.0.0.1', port: 0});
    let h: ReturnType<typeof harness> | undefined;
    try {
        if (!server.listening) await once(server, 'listening');
        const address = server.address();
        assert.ok(address && typeof address !== 'string');
        const port = address.port;
        const token = await sign({id: PEAR_CLIENT_ID, iat: 1}, f.getConfig().secret, 'HS256');
        h = harness({port, credential: {accessToken: token, endpoint: 'http://127.0.0.1:' + port, clientId: PEAR_CLIENT_ID}});
        await h.connect();
        h.respond(r => fetch(r.url, r.init));
        for (const [mode, currentShuffle, expected] of [
            ['FOLLOW_SHUFFLE_STATE', false, false], ['FOLLOW_SHUFFLE_STATE', true, true],
            ['ALWAYS_NORMAL', true, false], ['ALWAYS_NORMAL', false, false],
            ['ALWAYS_SHUFFLE', false, true], ['ALWAYS_SHUFFLE', true, true],
        ] as const) {
            h.latestSocket().send({type: 'SHUFFLE_CHANGED', shuffle: currentShuffle});
            f.setState(state(currentShuffle, 'PL_other'));
            await settle();
            const before = h.client.getSnapshot().player;
            const count = f.nativeEvents.length;
            const result = await h.client.startPlaylist('https://music.youtube.com/playlist?list=' + ID, mode);
            assert.deepEqual(result, {playlistId: ID, shuffle: expected, status: 'dispatched'});
            assert.equal(h.client.getSnapshot().player, before);
            assert.equal(f.nativeEvents.length, count + 1);
            assert.deepEqual(f.nativeEvents.at(-1)?.args[0], expected ? shuffle : normal);
        }
        f.setState(state(true, ID));
        await assert.rejects(h.client.startPlaylist(ID, 'ALWAYS_NORMAL'), error => error instanceof PearPlaylistError && error.reason === 'native-unavailable');
        assert.equal(f.nativeEvents.length, 6);
        const invoke = f.rendererIpc.invoke;
        f.rendererIpc.invoke = async (channel, value: unknown) => {
            const permit: unknown = await invoke(channel, value);
            f.broker.reset(); // Cancellation after permission is an unknown HTTP 503 outcome.
            return permit;
        };
        await assert.rejects(h.client.startPlaylist(ID, 'ALWAYS_SHUFFLE'), error => error instanceof PearPlaylistError && error.reason === 'unconfirmed');
        assert.equal(f.nativeEvents.length, 6);
        f.rendererIpc.invoke = invoke;
        const delayed = deferred<unknown>();
        f.setResponse(() => delayed.promise);
        const fetchCount = f.fetches.length;
        const aborted = h.client.startPlaylist(ID, 'ALWAYS_SHUFFLE');
        const failed = assert.rejects(aborted, error => error instanceof PearPlaylistError && error.reason === 'unconfirmed');
        const until = async (condition: () => boolean) => {
            const deadline = Date.now() + 2000;
            while (!condition()) {
                assert.ok(Date.now() < deadline, 'Loopback cancellation did not propagate before dispatch.');
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        };
        await until(() => f.fetches.length === fetchCount + 1);
        const canceledRequest = f.last();
        h.client.stop(); await failed;
        await until(() => f.window.webContents.sent.some(message => message.channel === 'peard:api-playlist-cancel'
            && (message.value as {requestId: string}).requestId === canceledRequest.requestId));
        assert.deepEqual(await f.permit(canceledRequest), {allowed: false});
        delayed.resolve(browse());
        await new Promise(resolve => setTimeout(resolve, 10));
        assert.equal(f.nativeEvents.length, 6);
        f.setResponse(() => Promise.resolve(browse()));
        h.respond(() => new Response(null, {status: 204}));
        await h.connect();
        h.respond(r => fetch(r.url, r.init));
        f.setConfig({authorizedClients: []});
        await assert.rejects(h.client.startPlaylist(ID, 'ALWAYS_SHUFFLE'), {status: 401});
        await h.clock.advance(60000);
        const posts = h.requests.filter(r => r.init.method === 'POST');
        assert.equal(posts.length, 10);
        assert.ok(posts.every(r => new URL(r.url).pathname === '/api/v1/play-playlist'));
        assert.ok(h.logs.every(message => !message.includes(token)));
        console.log('PASS: actual Pear HTTP route/broker/adapter + shared Stream Deck client; six mode/state combinations, safe 501, post-permit 503, HTTP abort/late browse, auth 401, no replay or optimistic state.');
        if (process.argv[2]) {
            let data: unknown;
            try { data = JSON.parse(readFileSync(process.argv[2], 'utf8')); }
            catch { throw new Error('Invalid browse fixture JSON.'); }
            const publicId = 'RDCLAK5uy_nDL8KeBrUagwyISwNmyEiSfYgz1gVCesg';
            for (const selectedShuffle of [false, true]) {
                const resolved = resolvePlaylistCommand(data, {playlistId: publicId, shuffle: selectedShuffle}, state());
                assert.equal(resolved.actionName, selectedShuffle ? 'yt-watch-playlist-endpoint' : 'yt-watch-endpoint');
            }
            console.log('PASS: fresh anonymous public browse data resolves both native command shapes. No signed-in playback/audio claim.');
        }
    } finally {
        h?.client.stop();
        f.dispose();
        if (server.listening) {
            server.closeAllConnections();
            await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
        }
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
`}, bundle: true, platform: 'node', target: 'node24', format: 'cjs', outfile: output});
    execFileSync(process.execPath, [output, ...process.argv.slice(3).map(value => resolve(value))], {stdio: 'inherit'});
} finally {
    rmSync(temporary, {recursive: true, force: true});
}
