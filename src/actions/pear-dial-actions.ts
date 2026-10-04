import {ActionTypes} from '../interfaces/enums';
import {isRecord} from '../pear/config';
import {PearPlaylistError, PearSnapshot} from '../pear/pear-client';
import {volumeStep} from '../streamdeck/action-settings';
import {playlistEntries, rotatePlaylistIndex, selectedPlaylistIndex} from '../streamdeck/playlist-selector-settings';
import {PearKeyClient} from './pear-key-actions';

export interface PearDialHost {
    setFeedback(context: string, payload: Record<string, unknown>): void;
    setFeedbackLayout(context: string, layout: string): void;
    saveDialSettings(context: string, settings: Record<string, unknown>): void;
    showAlert(context: string): void;
    playlistStatus?(context: string, message: string): void;
}

type Role = 'volume' | 'transport' | 'selector';
type Context = {action: string; role: Role; settings: unknown; index: number; rendered?: string;
    playlistError?: string; pending: (1 | -1)[]; running: boolean; generation: number};
type DialEvent = {action: string; context: string; payload: Record<string, unknown>};
export const MAX_PENDING_TRANSPORT_TICKS = 16;

function dialEvent(value: unknown): DialEvent | undefined {
    if (!isRecord(value) || typeof value.action !== 'string' || typeof value.context !== 'string' || !isRecord(value.payload)) return;
    return {action: value.action, context: value.context, payload: value.payload};
}

function role(action: string): Role | undefined {
    switch (action) {
        // Preserve already placed inherited encoder UUIDs while exposing dedicated actions.
        case ActionTypes.VOLUME_UP:
        case ActionTypes.VOLUME_DIAL: return 'volume';
        case ActionTypes.PLAY_PAUSE:
        case ActionTypes.TRANSPORT_DIAL: return 'transport';
        case ActionTypes.PLAYLIST_SELECTOR: return 'selector';
    }
}

function ready(snapshot: PearSnapshot): boolean { return snapshot.connection === 'connected' && snapshot.player.ready; }
function line(text: string, limit: number): string {
    const characters = Array.from(text.replace(/\s+/g, ' ').trim());
    return characters.length <= limit ? characters.join('') : characters.slice(0, limit - 1).join('') + '…';
}

/** All encoders observe the same client as keys. Only selection and display caches are local. */
export class PearDialActions {
    private readonly contexts = new Map<string, Context>();
    private readonly unsubscribe: () => void;
    private disposed = false;

    constructor(private readonly client: PearKeyClient, private readonly host: PearDialHost) {
        this.unsubscribe = client.subscribe(snapshot => {
            for (const [context, entry] of this.contexts) {
                if (!ready(snapshot)) this.cancelTransport(entry);
                this.render(context, entry, snapshot);
            }
        });
    }

    appear(value: unknown): void {
        const event = dialEvent(value);
        if (this.disposed || !event || event.payload.controller !== 'Encoder') return;
        this.disappear(event.context);
        const kind = role(event.action);
        if (!kind) return;
        const settings = event.payload.settings;
        const entry: Context = {action: event.action, role: kind, settings,
            index: selectedPlaylistIndex(settings, playlistEntries(settings).length), pending: [], running: false, generation: 0};
        this.contexts.set(event.context, entry);
        this.host.setFeedbackLayout(event.context, kind === 'volume' ? '$B1' : 'dial-layout.json');
        this.render(event.context, entry, this.client.getSnapshot());
    }

    disappear(context: string): void {
        const entry = this.contexts.get(context);
        if (entry) this.cancelTransport(entry);
        this.contexts.delete(context);
    }

    hasContext(context: string): boolean { return this.contexts.has(context); }

    settings(value: unknown): void {
        const found = this.find(value);
        if (!found) return;
        const {event, entry} = found;
        entry.settings = event.payload.settings;
        entry.index = selectedPlaylistIndex(entry.settings, playlistEntries(entry.settings).length);
        entry.playlistError = undefined;
        this.render(event.context, entry, this.client.getSnapshot());
    }

    async rotate(value: unknown): Promise<void> {
        const found = this.find(value);
        if (!found) return;
        const {event, entry} = found;
        const ticks = event.payload.ticks;
        if (!Number.isSafeInteger(ticks) || ticks === 0) return;
        if (entry.role === 'selector') {
            const entries = playlistEntries(entry.settings);
            const index = rotatePlaylistIndex(entry.index, ticks, entries.length);
            if (index === entry.index) return;
            const settings = {...(isRecord(entry.settings) ? entry.settings : {}), selectedIndex: index};
            try {
                this.host.saveDialSettings(event.context, settings);
                entry.index = index;
                entry.settings = settings;
                entry.playlistError = undefined;
                this.render(event.context, entry, this.client.getSnapshot());
            } catch { this.host.showAlert(event.context); }
            return;
        }
        if (!ready(this.client.getSnapshot())) { this.host.showAlert(event.context); return; }
        if (entry.role === 'transport') {
            const count = Math.abs(ticks as number);
            // Reject an oversized batch, rather than keeping unbounded or replayable input.
            if (count > MAX_PENDING_TRANSPORT_TICKS - entry.pending.length) { this.host.showAlert(event.context); return; }
            for (let i = 0; i < count; ++i) entry.pending.push((ticks as number) > 0 ? 1 : -1);
            if (!entry.running) void this.drainTransport(event.context, entry);
            return;
        }
        try {
            // ±100 is equivalent after clamping a real 0–100 volume and avoids integer overflow.
            const delta = Math.max(-100, Math.min(100, (ticks as number) * volumeStep(entry.settings)));
            await this.client.commands.changeVolume(delta);
        } catch { if (this.active(event.context, entry)) this.host.showAlert(event.context); }
    }

    /** The plugin invokes this only on dialUp, once per completed press. */
    async press(value: unknown): Promise<void> {
        const found = this.find(value);
        if (!found) return;
        const {event, entry} = found;
        if (!ready(this.client.getSnapshot())) { this.host.showAlert(event.context); return; }
        const selection = this.selection(entry);
        const relevant = () => this.active(event.context, entry) && (entry.role !== 'selector' || this.selection(entry) === selection);
        try {
            if (entry.role === 'volume') await this.client.commands.toggleMute();
            else if (entry.role === 'transport') await this.client.commands.togglePlay();
            else {
                const selected = playlistEntries(entry.settings)[entry.index];
                if (!selected?.valid) throw new Error('Configure a valid name and playlist URL or ID for the selected entry.');
                // startPlaylist resolves Follow against confirmed Pear state at activation time.
                await this.client.startPlaylist(selected.playlistId, selected.startupMode);
                if (relevant()) {
                    entry.playlistError = undefined;
                    this.render(event.context, entry, this.client.getSnapshot());
                    this.host.playlistStatus?.(event.context, 'Native playlist command dispatched. Check Pear state for playback.');
                }
            }
        } catch (error) {
            if (!relevant()) return;
            if (entry.role === 'selector') {
                entry.playlistError = error instanceof PearPlaylistError && error.reason === 'extension-required' ? 'Stage 7 required' : 'Start failed';
                this.render(event.context, entry, this.client.getSnapshot());
                this.host.playlistStatus?.(event.context, error instanceof Error ? error.message : 'Playlist startup failed.');
            }
            this.host.showAlert(event.context);
        }
    }

    touch(value: unknown): void {
        const found = this.find(value);
        if (!found || found.event.payload.hold !== false) return;
        this.render(found.event.context, found.entry, this.client.getSnapshot(), true);
    }

    dispose(): void {
        this.disposed = true;
        for (const entry of this.contexts.values()) this.cancelTransport(entry);
        this.contexts.clear();
        this.unsubscribe();
    }

    private find(value: unknown): {event: DialEvent; entry: Context} | undefined {
        const event = dialEvent(value);
        if (this.disposed || !event || (event.payload.controller !== undefined && event.payload.controller !== 'Encoder')) return;
        const entry = this.contexts.get(event.context);
        if (!entry || entry.action !== event.action) return;
        // Input event settings may lag our selector writes. didReceiveSettings is authoritative.
        return {event, entry};
    }

    private active(context: string, entry: Context): boolean { return !this.disposed && this.contexts.get(context) === entry; }

    private selection(entry: Context): string {
        const selected = playlistEntries(entry.settings)[entry.index];
        return JSON.stringify([entry.index, selected?.playlistId, selected?.startupMode]);
    }

    private cancelTransport(entry: Context): void {
        entry.pending = [];
        entry.running = false;
        ++entry.generation;
    }

    private async drainTransport(context: string, entry: Context): Promise<void> {
        const generation = entry.generation;
        entry.running = true;
        try {
            while (this.active(context, entry) && generation === entry.generation && ready(this.client.getSnapshot()) && entry.pending.length) {
                const direction = entry.pending.shift();
                if (direction === 1) await this.client.commands.next();
                else await this.client.commands.previous();
            }
        } catch {
            if (this.active(context, entry) && generation === entry.generation) {
                entry.pending = [];
                this.host.showAlert(context);
            }
        } finally { if (generation === entry.generation) entry.running = false; }
    }

    private render(context: string, entry: Context, snapshot: PearSnapshot, force = false): void {
        const connected = ready(snapshot);
        const state = snapshot.player;
        const offline = snapshot.connection === 'authorizing' ? 'Approve in Pear' : 'Pear offline';
        let feedback: Record<string, unknown>;
        if (entry.role === 'volume') {
            feedback = {title: connected ? state.muted === true ? 'Muted' : state.muted === false ? 'Volume' : 'Mute unknown' : offline,
                icon: connected && state.muted === true ? 'icons/volume-mute.png' : 'icons/volume-on.png',
                value: connected && state.volume !== null ? `${Math.round(state.volume)}%` : '?',
                indicator: {value: connected && state.volume !== null ? state.volume : 0, enabled: connected && state.volume !== null}};
        } else if (entry.role === 'transport') {
            feedback = {title: line(state.song?.title || 'No track', 16), detail: line(state.song?.artist || '', 18),
                status: connected ? state.isPlaying === true ? 'Playing' : state.isPlaying === false ? 'Paused / stopped' : 'Playback unknown' : offline,
                icon: connected && state.isPlaying === true ? 'icons/music-pause.png' : 'icons/music-play.png'};
        } else {
            const entries = playlistEntries(entry.settings);
            const selected = entries[entry.index];
            const shuffle = selected?.startupMode === 'ALWAYS_NORMAL' ? 'Normal' : selected?.startupMode === 'ALWAYS_SHUFFLE' ? 'Shuffle'
                : state.shuffle === null || !connected ? 'Follow (?)' : state.shuffle ? 'Follow: shuffle' : 'Follow: normal';
            feedback = {title: line(selected?.name || (entries.length ? 'Unnamed playlist' : 'Set playlists'), 16),
                detail: selected ? `${entry.index + 1}/${entries.length} · ${shuffle}` : '',
                status: entry.playlistError ?? (!selected ? 'Configure in settings' : !selected.valid ? 'Invalid playlist entry' : !connected ? offline : 'Press to play'),
                icon: selected?.image ?? 'icons/music-play.png'};
        }
        const rendered = JSON.stringify(feedback);
        if (force || entry.rendered !== rendered) this.host.setFeedback(context, feedback);
        entry.rendered = rendered;
    }
}
