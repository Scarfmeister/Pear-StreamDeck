import type {PearClient} from './pear-client';
import {PearRequestError} from './rest-client';
import {Scheduler} from './runtime';
import {clampVolume, PearPlayerState, RepeatMode, StateField} from './state';

export const REPEAT_CYCLE: readonly RepeatMode[] = ['NONE', 'ALL', 'ONE'];

type Lane = 'playback' | 'rating' | 'mute' | 'shuffle' | 'repeat';
type VolumeChange = {delta: number; resolve(): void; reject(error: unknown): void};

/** Shared command lanes. Targets never enter the confirmed player model. */
export class PearCommands {
    private generation = 0;
    private readonly busy = new Set<Lane>();
    private readonly cancelWaits = new Set<() => void>();
    private volumeQueue: VolumeChange[] = [];
    private volumeRunning = false;

    constructor(private readonly client: PearClient, private readonly scheduler: Scheduler,
                private readonly confirmationMs = 2000) {}

    next(): Promise<unknown> { return this.client.request('POST', 'next'); }
    previous(): Promise<unknown> { return this.client.request('POST', 'previous'); }
    play(): Promise<void> { return this.playback(true); }
    pause(): Promise<void> { return this.playback(false); }
    togglePlay(): Promise<void> {
        return this.exclusive('playback', async () => {
            const playing = this.player().isPlaying;
            if (playing === null) throw new PearRequestError('state-unavailable');
            await this.setPlayback(!playing);
        });
    }
    like(): Promise<void> { return this.rate('LIKE'); }
    dislike(): Promise<void> { return this.rate('DISLIKE'); }

    toggleMute(): Promise<void> {
        return this.exclusive('mute', async () => {
            if (this.player().muted === null) await this.client.refreshState('volume');
            const muted = this.player().muted;
            if (muted === null) throw new PearRequestError('state-unavailable');
            await this.sendAndConfirm('toggle-mute', undefined, state => state.muted === !muted, 'volume');
        });
    }

    toggleShuffle(): Promise<void> {
        return this.exclusive('shuffle', async () => {
            if (this.player().shuffle === null) await this.client.refreshState('shuffle');
            const shuffle = this.player().shuffle;
            if (shuffle === null) throw new PearRequestError('state-unavailable');
            await this.sendAndConfirm('shuffle', undefined, state => state.shuffle === !shuffle, 'shuffle');
        });
    }

    cycleRepeat(): Promise<void> {
        return this.exclusive('repeat', async () => {
            if (this.player().repeat === null) await this.client.refreshState('repeat');
            const repeat = this.player().repeat;
            if (repeat === null) throw new PearRequestError('state-unavailable');
            const next = REPEAT_CYCLE[(REPEAT_CYCLE.indexOf(repeat) + 1) % REPEAT_CYCLE.length];
            await this.sendAndConfirm('switch-repeat', {iteration: 1}, state => state.repeat === next, 'repeat');
        });
    }

    /** At most sixteen waiting inputs; each uses the latest confirmed volume. */
    changeVolume(delta: number): Promise<void> {
        if (!Number.isFinite(delta)) return Promise.reject(new PearRequestError('state-unavailable'));
        try { this.player(); } catch (error) { return Promise.reject(error); }
        if (this.volumeQueue.length >= 16) return Promise.reject(new PearRequestError('command-busy'));
        return new Promise((resolve, reject) => {
            this.volumeQueue.push({delta, resolve, reject});
            if (!this.volumeRunning) {
                this.volumeRunning = true;
                void this.drainVolume(this.generation);
            }
        });
    }

    /** Session cancellation discards waiting inputs; nothing is replayed after reconnect. */
    cancel(): void {
        ++this.generation;
        this.busy.clear();
        this.volumeRunning = false;
        this.rejectVolumeQueue(new PearRequestError('aborted'));
        for (const cancel of [...this.cancelWaits]) cancel();
    }

    private player(): PearPlayerState {
        const snapshot = this.client.getSnapshot();
        if (snapshot.connection !== 'connected' || !snapshot.player.ready) throw new PearRequestError('not-connected');
        return snapshot.player;
    }

    private async exclusive(lane: Lane, operation: () => Promise<void>): Promise<void> {
        this.player();
        if (this.busy.has(lane)) throw new PearRequestError('command-busy');
        const generation = this.generation;
        this.busy.add(lane);
        try { await operation(); }
        finally { if (generation === this.generation) this.busy.delete(lane); }
    }

    private playback(playing: boolean): Promise<void> {
        return this.exclusive('playback', () => this.setPlayback(playing));
    }

    private async setPlayback(playing: boolean): Promise<void> {
        if (this.player().isPlaying === playing) return;
        // Pear's toggle-play only resumes native state 2. Explicit play also handles stopped state.
        await this.sendAndConfirm(playing ? 'play' : 'pause', undefined, state => state.isPlaying === playing);
    }

    private rate(rating: 'LIKE' | 'DISLIKE'): Promise<void> {
        return this.exclusive('rating', async () => {
            if (!this.player().song) throw new PearRequestError('state-unavailable');
            const generation = this.generation;
            await this.client.request('POST', rating === 'LIKE' ? 'like' : 'dislike');
            // Pear returns before renderer IPC updates its rating cache. One delayed read, no polling.
            await this.delay(150);
            if (generation !== this.generation) throw new PearRequestError('aborted');
            await this.client.refreshLikeState(true);
            if (generation !== this.generation) throw new PearRequestError('aborted');
            this.player();
        });
    }

    private async drainVolume(generation: number): Promise<void> {
        try {
            while (generation === this.generation && this.volumeQueue.length) {
                const change = this.volumeQueue.shift()!;
                try {
                    if (this.player().volume === null) await this.client.refreshState('volume');
                    const volume = this.player().volume;
                    if (volume === null) throw new PearRequestError('state-unavailable');
                    const target = clampVolume(volume + change.delta);
                    if (target !== volume) {
                        await this.sendAndConfirm('volume', {volume: target}, state => state.volume === target, 'volume');
                    }
                    change.resolve();
                } catch (error) {
                    change.reject(error);
                    if (generation === this.generation) this.rejectVolumeQueue(error);
                    return;
                }
            }
        } finally { if (generation === this.generation) this.volumeRunning = false; }
    }

    private rejectVolumeQueue(error: unknown): void {
        const queue = this.volumeQueue;
        this.volumeQueue = [];
        for (const change of queue) change.reject(error);
    }

    private async sendAndConfirm(path: string, body: unknown,
                                 predicate: (state: PearPlayerState) => boolean, fallback?: StateField): Promise<void> {
        const generation = this.generation;
        const wait = this.observe(predicate);
        try {
            await this.client.request('POST', path, body);
            const confirmed = await wait.result;
            if (generation !== this.generation) throw new PearRequestError('aborted');
            if (confirmed || predicate(this.player())) return;
            if (fallback) {
                await this.client.refreshState(fallback);
                if (generation !== this.generation) throw new PearRequestError('aborted');
                if (predicate(this.player())) return;
            }
            throw new PearRequestError('command-unconfirmed');
        } finally { wait.cancel(); }
    }

    private observe(predicate: (state: PearPlayerState) => boolean): {result: Promise<boolean>; cancel(): void} {
        let unsubscribe = () => {};
        let timer: unknown;
        let done = false;
        let finish!: (confirmed: boolean) => void;
        const cancel = () => finish(false);
        const result = new Promise<boolean>(resolve => {
            finish = confirmed => {
                if (done) return;
                done = true;
                unsubscribe();
                this.scheduler.clearTimeout(timer);
                this.cancelWaits.delete(cancel);
                resolve(confirmed);
            };
            this.cancelWaits.add(cancel);
            unsubscribe = this.client.subscribe(snapshot => {
                if (!snapshot.player.ready || snapshot.connection !== 'connected') finish(false);
                else if (predicate(snapshot.player)) finish(true);
            });
            // subscribe immediately delivers the current snapshot.
            if (done) unsubscribe();
            else timer = this.scheduler.setTimeout(cancel, this.confirmationMs);
        });
        return {result, cancel};
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => {
            const cancel = () => {
                this.scheduler.clearTimeout(timer);
                this.cancelWaits.delete(cancel);
                resolve();
            };
            const timer = this.scheduler.setTimeout(cancel, ms);
            this.cancelWaits.add(cancel);
        });
    }
}
