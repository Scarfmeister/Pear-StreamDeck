import {PearClient, PearClientOptions} from '../src/pear/pear-client';
import {Scheduler, SocketHandlers} from '../src/pear/runtime';
import {PearSettings} from '../src/pear/config';

export async function settle(): Promise<void> {
    // Drain the short fetch/body/persistence chains without sleeping in real time.
    for (let i = 0; i < 30; i++) await Promise.resolve();
}

export class FakeScheduler implements Scheduler {
    now = 0;
    private nextId = 0;
    readonly tasks = new Map<number, {due: number; callback: () => void}>();
    setTimeout(callback: () => void, delay: number): number {
        const id = ++this.nextId;
        this.tasks.set(id, {due: this.now + delay, callback});
        return id;
    }
    clearTimeout(handle: unknown): void { this.tasks.delete(handle as number); }
    async advance(ms: number): Promise<void> {
        const target = this.now + ms;
        await settle();
        while (true) {
            const next = [...this.tasks.entries()].filter(([, task]) => task.due <= target)
                .sort((a, b) => a[1].due - b[1].due)[0];
            if (!next) break;
            this.now = next[1].due;
            this.tasks.delete(next[0]);
            next[1].callback();
            await settle();
        }
        this.now = target;
        await settle();
    }
}

export class FakeSocket {
    closed = false;
    constructor(readonly url: string, readonly handlers: SocketHandlers) {}
    send(value: unknown): void { this.handlers.message(typeof value === 'string' ? value : JSON.stringify(value)); }
    serverClose(code = 1006): void { this.closed = true; this.handlers.close(code); }
    close(): void { this.closed = true; this.handlers.close(1000); }
}

export interface RecordedRequest {url: string; init: RequestInit;}
export type Responder = (request: RecordedRequest) => Response | Promise<Response>;

export function json(value: unknown, status = 200, headers?: HeadersInit): Response {
    return new Response(JSON.stringify(value), {status, headers});
}
export function empty(): Response { return new Response(null, {status: 204}); }

export const SONG = {title: 'Track', artist: 'Artist', videoId: 'abc', songDuration: 180,
    album: 'Album', imageSrc: null, isPaused: false, elapsedSeconds: 12};
export const PLAYER_INFO = {type: 'PLAYER_INFO', song: SONG, isPlaying: true, muted: false,
    volume: 35, position: 12, repeat: 'NONE', shuffle: false};

export function deferred<T>(): {promise: Promise<T>; resolve(value: T): void; reject(reason: unknown): void} {
    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((resolveValue, rejectValue) => { resolve = resolveValue; reject = rejectValue; });
    return {promise, resolve, reject};
}

export function untilAborted(signal: AbortSignal | null | undefined): Promise<Response> {
    return new Promise((_, reject) => {
        if (signal?.aborted) reject(new Error('aborted'));
        else signal?.addEventListener('abort', () => reject(new Error('aborted')), {once: true});
    });
}

export function harness(settings: unknown = {}, options: PearClientOptions = {}) {
    const clock = new FakeScheduler();
    const requests: RecordedRequest[] = [];
    const sockets: FakeSocket[] = [];
    const saved: PearSettings[] = [];
    const logs: string[] = [];
    let responder: Responder = request => request.url.endsWith('/like-state')
        ? json({state: 'INDIFFERENT'}) : empty();
    const fetcher: typeof fetch = async (input, init) => {
        const request = {url: String(input), init: init ?? {}};
        requests.push(request);
        return responder(request);
    };
    const dependencies: PearClientOptions = {scheduler: clock, fetch: fetcher,
        socketFactory: (url, handlers) => { const socket = new FakeSocket(url, handlers); sockets.push(socket); return socket; },
        random: () => 0.5, saveSettings: value => saved.push(value),
        log: (_level, message) => logs.push(message), ...options};
    const client = new PearClient(settings, dependencies);
    return {client, clock, requests, sockets, saved, logs, dependencies,
        respond: (next: Responder) => { responder = next; },
        latestSocket: () => { const socket = sockets.at(-1); if (!socket) throw new Error('No socket'); return socket; },
        connect: async () => { client.start(); await settle(); sockets.at(-1)?.send(PLAYER_INFO); await settle(); }};
}
