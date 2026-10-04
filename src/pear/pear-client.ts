import {AuthenticationState, isUnauthorized, parseAuthorizationResponse} from './auth';
import {endpointKey, normalizeSettings, PEAR_CLIENT_ID, PearSettings, websocketUrl} from './config';
import {reconnectDelay} from './reconnect';
import {FailureCode, PearRequestError, PearRestClient} from './rest-client';
import {browserSocket, PearSocket, Scheduler, SocketFactory, systemScheduler} from './runtime';
import {clampVolume, emptyPlayerState, LikeState, mergePlayerState, parseLikeState, parseStateResponse,
    PearPlayerState, StateField} from './state';
import {parsePearMessage} from './websocket';
import {PearCommands} from './commands';

export type ConnectionState = 'stopped' | 'connecting' | 'authorizing' | 'awaiting-snapshot' |
    'connected' | 'retrying' | 'authorization-required' | 'error';

export interface PearSnapshot {
    readonly connection: ConnectionState;
    readonly authentication: AuthenticationState;
    readonly retryAttempt: number;
    readonly retryInMs: number | null;
    readonly lastError: FailureCode | 'authorization' | 'settings-save' | null;
    readonly player: PearPlayerState;
}

export interface PearClientOptions {
    fetch?: typeof fetch;
    socketFactory?: SocketFactory;
    scheduler?: Scheduler;
    random?: () => number;
    saveSettings?: (settings: PearSettings) => void;
    log?: (level: 'info' | 'warn', message: string) => void;
    snapshotTimeoutMs?: number;
    authorizationTimeoutMs?: number;
}

/** One owner for REST, approval, the socket, and confirmed state. No action or PI transport. */
export class PearClient {
    readonly commands: PearCommands;
    private settings: PearSettings;
    private readonly rest: PearRestClient;
    private readonly scheduler: Scheduler;
    private readonly sockets: SocketFactory;
    private readonly options: PearClientOptions;
    private readonly listeners = new Set<(snapshot: PearSnapshot) => void>();
    private readonly failedListeners = new Set<(snapshot: PearSnapshot) => void>();
    private snapshot: PearSnapshot = Object.freeze({connection: 'stopped', authentication: 'unknown',
        retryAttempt: 0, retryInMs: null, lastError: null, player: emptyPlayerState()});
    private running = false;
    private generation = 0;
    private controller?: AbortController;
    private socket?: PearSocket;
    private retryTimer?: unknown;
    private snapshotTimer?: unknown;
    private retryAttempt = 0;
    private outageLogged = false;
    private malformedLogged = false;
    private commandFailureLogged = false;
    private trackRevision = 0;
    private likeRead?: {generation: number; promise: Promise<LikeState | null>};
    private likeReadAgain = false;
    private readonly fieldRevisions = {volume: 0, shuffle: 0, repeat: 0};

    constructor(settings: unknown = {}, options: PearClientOptions = {}) {
        this.settings = normalizeSettings(settings);
        this.options = options;
        this.scheduler = options.scheduler ?? systemScheduler;
        this.sockets = options.socketFactory ?? browserSocket;
        this.rest = new PearRestClient(options.fetch, this.scheduler);
        this.commands = new PearCommands(this, this.scheduler);
    }

    getSnapshot(): PearSnapshot { return this.snapshot; }

    getSettings(): PearSettings {
        return {...this.settings, credential: this.settings.credential ? {...this.settings.credential} : undefined};
    }

    subscribe(listener: (snapshot: PearSnapshot) => void): () => void {
        this.listeners.add(listener);
        this.notify(listener);
        return () => { this.listeners.delete(listener); this.failedListeners.delete(listener); };
    }

    configure(settings: unknown): void {
        const next = normalizeSettings(settings);
        if (JSON.stringify(next) === JSON.stringify(this.settings)) return;
        this.settings = next;
        this.retryAttempt = 0;
        this.cancelSession();
        if (this.running) this.launch();
    }

    start(): void {
        if (this.running) return;
        this.running = true;
        this.retryAttempt = 0;
        this.launch();
    }

    stop(): void {
        this.running = false;
        this.cancelSession();
        this.publish({connection: 'stopped', retryAttempt: 0, retryInMs: null,
            player: mergePlayerState(this.snapshot.player, {ready: false})});
    }

    reauthorize(): void {
        // Repeated clicks while Pear's dialog is outstanding must not create new prompts.
        if (this.snapshot.connection === 'authorizing') return;
        this.cancelSession();
        this.retryAttempt = 0;
        const {credential: _credential, authBlocked: _blocked, ...settings} = this.settings;
        if (!this.persist(settings)) return;
        this.running = true;
        this.launch();
    }

    /** Requests are sent once. Never automatically replay a playback command. */
    async request(method: 'GET' | 'POST', path: string, body?: unknown): Promise<unknown> {
        if (!this.running || this.snapshot.connection !== 'connected' || !this.controller) {
            throw new PearRequestError('not-connected');
        }
        const generation = this.generation;
        try {
            const result = await this.rest.api(this.settings, path, {method, body,
                accessToken: this.settings.credential?.accessToken, signal: this.controller.signal});
            if (!this.current(generation)) throw new PearRequestError('aborted');
            this.commandFailureLogged = false;
            return result;
        } catch (error) {
            if (this.current(generation)) {
                if (isUnauthorized(error)) this.requireAuthorization('invalid');
                else if (!this.commandFailureLogged) {
                    this.commandFailureLogged = true;
                    this.log('warn', 'Pear request failed; confirmed player state was retained.');
                }
            }
            throw error;
        }
    }

    setVolume(volume: number): Promise<unknown> {
        return this.request('POST', 'volume', {volume: clampVolume(volume)});
    }

    /** One bounded gap fill; an intervening WebSocket update wins over a stale REST response. */
    async refreshState(field: StateField): Promise<void> {
        const generation = this.generation;
        const revision = this.fieldRevisions[field];
        const value = await this.request('GET', field === 'repeat' ? 'repeat-mode' : field);
        const update = parseStateResponse(field, value);
        if (!update) throw new PearRequestError('invalid-response');
        if (this.current(generation) && revision === this.fieldRevisions[field]) {
            this.publish({player: mergePlayerState(this.snapshot.player, update)});
        }
    }

    /** Bounded gap fill: Pear 3.12.0 does not push ratings. Commands can require a fresh read. */
    refreshLikeState(afterPending = false): Promise<LikeState | null> {
        if (this.snapshot.connection !== 'connected' || !this.controller) return Promise.resolve(null);
        if (this.likeRead?.generation === this.generation) {
            if (afterPending) {
                const generation = this.generation;
                return this.likeRead.promise.then(() => this.current(generation) ? this.refreshLikeState() : null);
            }
            this.likeReadAgain = true;
            return this.likeRead.promise;
        }
        const generation = this.generation;
        const revision = this.trackRevision;
        const promise = this.request('GET', 'like-state').then(value => {
            const state = parseLikeState(value);
            if (state === undefined) throw new PearRequestError('invalid-response');
            if (this.current(generation) && revision === this.trackRevision) {
                this.publish({player: mergePlayerState(this.snapshot.player, {likeState: state})});
            }
            return state;
        }).catch(() => {
            // Optional metadata must not turn a healthy socket into a reconnect loop.
            if (this.current(generation) && revision === this.trackRevision) {
                this.publish({player: mergePlayerState(this.snapshot.player, {likeState: null})});
            }
            return null;
        }).finally(() => {
            if (this.likeRead?.promise !== promise) return;
            this.likeRead = undefined;
            const again = this.likeReadAgain;
            this.likeReadAgain = false;
            if (again && this.current(generation)) void this.refreshLikeState();
        });
        this.likeRead = {generation, promise};
        return promise;
    }

    private launch(): void {
        if (this.settings.authBlocked) {
            this.publish({connection: 'authorization-required',
                authentication: this.settings.authBlocked === 'denied' ? 'denied' : 'required',
                retryInMs: null, lastError: 'authorization', player: emptyPlayerState()});
            return;
        }
        const generation = ++this.generation;
        this.controller = new AbortController();
        this.publish({connection: 'connecting', authentication: 'unknown', retryInMs: null,
            lastError: null, retryAttempt: this.retryAttempt, player: emptyPlayerState()});
        void this.connect(generation, this.controller.signal);
    }

    private async connect(generation: number, signal: AbortSignal): Promise<void> {
        try {
            try {
                await this.rest.api(this.settings, 'song', {accessToken: this.settings.credential?.accessToken, signal});
            } catch (error) {
                if (!this.current(generation)) return;
                if (!isUnauthorized(error)) throw error;
                if (this.settings.credential) { this.requireAuthorization('invalid'); return; }
                this.publish({connection: 'authorizing', authentication: 'authorizing'});
                // Persist an in-progress marker: an interrupted dialog is only retried explicitly.
                if (!this.persist({...this.settings, authBlocked: 'interrupted'})) return;
                let token: string;
                try {
                    token = parseAuthorizationResponse(await this.rest.authorize(this.settings, signal,
                        this.options.authorizationTimeoutMs ?? 120000));
                } catch (authError) {
                    if (!this.current(generation)) return;
                    this.requireAuthorization(authError instanceof PearRequestError && authError.status === 403
                        ? 'denied' : authError instanceof PearRequestError && authError.code === 'invalid-response'
                            ? 'invalid-response' : 'interrupted');
                    return;
                }
                if (!this.current(generation)) return;
                const {authBlocked: _blocked, ...settings} = this.settings;
                if (!this.persist({...settings, credential: {accessToken: token,
                    endpoint: endpointKey(settings), clientId: PEAR_CLIENT_ID}})) return;
                // Confirm the new token through the protected REST guard before opening the socket.
                await this.rest.api(this.settings, 'song', {accessToken: token, signal});
            }
            if (!this.current(generation)) return;
            this.publish({connection: 'awaiting-snapshot',
                authentication: this.settings.credential ? 'authorized' : 'disabled'});
            this.malformedLogged = false;
            this.snapshotTimer = this.scheduler.setTimeout(() => {
                if (this.current(generation)) this.retry(new PearRequestError('timeout'));
            }, this.options.snapshotTimeoutMs ?? 15000);
            const socket = this.sockets(websocketUrl(this.settings, this.settings.credential?.accessToken), {
                message: data => this.receive(generation, data),
                close: code => {
                    if (!this.current(generation)) return;
                    if (code === 1008) this.requireAuthorization('invalid');
                    else this.retry(new PearRequestError('network'));
                },
                // Browsers send close after error. Keep the snapshot timeout for failed handshakes.
                error: () => {},
            });
            if (this.current(generation)) this.socket = socket;
            else socket.close();
        } catch (error) {
            if (!this.current(generation)) return;
            if (isUnauthorized(error)) this.requireAuthorization('invalid');
            else this.retry(error instanceof PearRequestError ? error : new PearRequestError('network'));
        }
    }

    private receive(generation: number, data: unknown): void {
        if (!this.current(generation)) return;
        const event = parsePearMessage(data);
        if (!event) {
            if (!this.malformedLogged) {
                this.malformedLogged = true;
                this.log('warn', 'Ignored an unsupported or malformed Pear WebSocket message.');
            }
            return;
        }
        if (this.snapshot.connection !== 'connected' && event.type !== 'PLAYER_INFO') return;
        for (const field of ['volume', 'shuffle', 'repeat'] as const) {
            if (event.update[field] !== undefined) ++this.fieldRevisions[field];
        }
        if (event.type === 'PLAYER_INFO') {
            this.scheduler.clearTimeout(this.snapshotTimer);
            this.snapshotTimer = undefined;
            this.retryAttempt = 0;
            this.outageLogged = false;
            if (this.snapshot.connection !== 'connected') this.log('info', 'Connected to Pear API v1.');
            this.publish({connection: 'connected', retryAttempt: 0, retryInMs: null, lastError: null,
                player: mergePlayerState(this.snapshot.player, event.update)});
        } else {
            this.publish({player: mergePlayerState(this.snapshot.player, event.update)});
        }
        if (event.type === 'VIDEO_CHANGED' || event.type === 'PLAYER_INFO') {
            this.trackRevision++;
            void this.refreshLikeState();
        }
    }

    private retry(error: PearRequestError): void {
        this.cancelSession();
        if (!this.running) return;
        const delay = Math.max(reconnectDelay(++this.retryAttempt, this.options.random), error.retryAfterMs ?? 0);
        this.publish({connection: 'retrying', retryAttempt: this.retryAttempt, retryInMs: delay,
            lastError: error.code, player: mergePlayerState(this.snapshot.player, {ready: false})});
        if (!this.outageLogged) {
            this.outageLogged = true;
            this.log('warn', 'Pear is unavailable; retrying with bounded backoff.');
        }
        this.retryTimer = this.scheduler.setTimeout(() => {
            this.retryTimer = undefined;
            if (this.running) this.launch();
        }, delay);
    }

    private requireAuthorization(reason: NonNullable<PearSettings['authBlocked']>): void {
        this.cancelSession();
        const {credential: _credential, ...settings} = this.settings;
        if (!this.persist({...settings, authBlocked: reason})) return;
        this.publish({connection: 'authorization-required', authentication: reason === 'denied' ? 'denied' : 'required',
            retryInMs: null, lastError: 'authorization', player: mergePlayerState(this.snapshot.player, {ready: false})});
        this.log('warn', reason === 'denied' ? 'Pear authorization was denied. Use Reauthorize to retry.'
            : 'Pear authorization is required. Use Reauthorize to retry.');
    }

    private persist(settings: PearSettings): boolean {
        this.settings = normalizeSettings(settings);
        try {
            this.options.saveSettings?.(this.getSettings());
            return true;
        } catch {
            this.cancelSession();
            this.publish({connection: 'error', lastError: 'settings-save', retryInMs: null,
                player: mergePlayerState(this.snapshot.player, {ready: false})});
            this.log('warn', 'Could not save Pear authorization settings.');
            return false;
        }
    }

    private current(generation: number): boolean { return this.running && generation === this.generation; }

    private cancelSession(): void {
        ++this.generation;
        this.commands.cancel();
        this.controller?.abort();
        this.controller = undefined;
        this.scheduler.clearTimeout(this.retryTimer);
        this.scheduler.clearTimeout(this.snapshotTimer);
        this.retryTimer = this.snapshotTimer = undefined;
        const socket = this.socket;
        this.socket = undefined;
        socket?.close();
        this.likeRead = undefined;
        this.likeReadAgain = false;
    }

    private publish(update: Partial<PearSnapshot>): void {
        this.snapshot = Object.freeze({...this.snapshot, ...update});
        for (const listener of this.listeners) this.notify(listener);
    }

    private notify(listener: (snapshot: PearSnapshot) => void): void {
        try {
            listener(this.snapshot);
            this.failedListeners.delete(listener);
        } catch {
            if (!this.failedListeners.has(listener)) this.log('warn', 'A Pear state subscriber failed.');
            this.failedListeners.add(listener);
        }
    }

    private log(level: 'info' | 'warn', message: string): void {
        // Logging is diagnostic; a failed host logger must never break recovery.
        try { this.options.log?.(level, message); } catch { /* Ignore unavailable host logger. */ }
    }
}
