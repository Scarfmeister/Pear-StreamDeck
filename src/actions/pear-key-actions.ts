import {ActionTypes} from '../interfaces/enums';
import {isRecord} from '../pear/config';
import {PearCommands} from '../pear/commands';
import {PearSnapshot} from '../pear/pear-client';
import {PearSong} from '../pear/state';

export type TrackInfoFormat = 'TITLE' | 'ARTIST' | 'TITLE_ARTIST' | 'ALBUM' | 'TITLE_ARTIST_ALBUM';
export const TRACK_INFO_FORMATS: readonly TrackInfoFormat[] = ['TITLE', 'ARTIST', 'TITLE_ARTIST', 'ALBUM', 'TITLE_ARTIST_ALBUM'];

export function volumeStep(settings: unknown): number {
    const raw = isRecord(settings) ? settings.steps : undefined;
    const step = typeof raw === 'number' ? raw : typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : NaN;
    return Number.isInteger(step) && step >= 1 && step <= 100 ? step : 5;
}

export function trackInfoFormat(settings: unknown): TrackInfoFormat {
    const raw = isRecord(settings) ? settings.displayFormat : undefined;
    return TRACK_INFO_FORMATS.includes(raw as TrackInfoFormat) ? raw as TrackInfoFormat : 'TITLE_ARTIST';
}

function readableLine(text: string, limit: number): string {
    const characters = Array.from(text.replace(/\s+/g, ' ').trim());
    return characters.length <= limit ? characters.join('') : characters.slice(0, limit - 1).join('') + '…';
}

/** Small-key text; the song model retains the full metadata for future display choices. */
export function formatTrackInfo(song: Readonly<PearSong> | null, format: TrackInfoFormat, limit = 12): string {
    if (!song) return 'No track';
    const title = song.title.trim() || 'Unknown title';
    const artist = song.artist.trim() || 'Unknown artist';
    const album = song.album?.trim() || 'No album';
    const lines = {TITLE: [title], ARTIST: [artist], TITLE_ARTIST: [title, artist],
        ALBUM: [album], TITLE_ARTIST_ALBUM: [title, artist, album]};
    return lines[format].map(line => readableLine(line, limit)).join('\n');
}

export interface PearKeyClient {
    readonly commands: Pick<PearCommands, 'play' | 'pause' | 'togglePlay' | 'next' | 'previous' |
        'like' | 'dislike' | 'toggleMute' | 'changeVolume' | 'toggleShuffle' | 'cycleRepeat'>;
    getSnapshot(): PearSnapshot;
    subscribe(listener: (snapshot: PearSnapshot) => void): () => void;
}

export interface PearKeyHost {
    setState(state: 0 | 1, context: string): void;
    setTitle(title: string, context: string): void;
    setImage(image: string, context: string): void;
    setFeedback(context: string, payload: Record<string, unknown>): void;
    showAlert(context: string): void;
}

export interface KeyContextEvent {
    action: string;
    context: string;
    payload: {settings?: unknown; controller?: string};
}
type Render = {title: string; state?: 0 | 1; image?: string; feedback?: boolean};
type Context = {action: string; controller?: string; settings: unknown; rendered?: Render};

/** One shared subscription, with independently cached displays for all visible contexts. */
export class PearKeyActions {
    private readonly contexts = new Map<string, Context>();
    private readonly unsubscribe: () => void;
    private disposed = false;

    constructor(private readonly client: PearKeyClient, private readonly host: PearKeyHost) {
        this.unsubscribe = client.subscribe(snapshot => {
            for (const [context, entry] of this.contexts) this.render(context, entry, snapshot);
        });
    }

    appear(event: KeyContextEvent): void {
        if (this.disposed) return;
        const entry: Context = {action: event.action, controller: event.payload.controller, settings: event.payload.settings};
        this.contexts.set(event.context, entry);
        this.render(event.context, entry, this.client.getSnapshot());
    }

    disappear(context: string): void { this.contexts.delete(context); }

    settings(event: KeyContextEvent): void {
        const entry = this.contexts.get(event.context);
        if (!entry || entry.action !== event.action) return;
        entry.settings = event.payload.settings;
        this.render(event.context, entry, this.client.getSnapshot());
    }

    async press(event: KeyContextEvent): Promise<void> {
        if (this.disposed) return;
        const visible = this.contexts.get(event.context);
        if ((event.payload.controller ?? visible?.controller) === 'Encoder') return;
        const settings = event.payload.settings ?? visible?.settings;
        const commands = this.client.commands;
        try {
            switch (event.action) {
                case ActionTypes.PLAY_PAUSE: {
                    const mode = isRecord(settings) ? settings.action : undefined;
                    if (mode === 'PLAY') await commands.play();
                    else if (mode === 'PAUSE') await commands.pause();
                    else await commands.togglePlay();
                    break;
                }
                case ActionTypes.NEXT_TRACK: await commands.next(); break;
                case ActionTypes.PREV_TRACK: await commands.previous(); break;
                case ActionTypes.LIKE_TRACK: await commands.like(); break;
                case ActionTypes.DISLIKE_TRACK: await commands.dislike(); break;
                case ActionTypes.VOLUME_MUTE: await commands.toggleMute(); break;
                case ActionTypes.VOLUME_DOWN: await commands.changeVolume(-volumeStep(settings)); break;
                case ActionTypes.VOLUME_UP: await commands.changeVolume(volumeStep(settings)); break;
                case ActionTypes.SONG_INFO: await commands.togglePlay(); break;
                case ActionTypes.SHUFFLE: await commands.toggleShuffle(); break;
                case ActionTypes.REPEAT: await commands.cycleRepeat(); break;
                case ActionTypes.PLAY_PLAYLIST: this.host.showAlert(event.context); break;
            }
        } catch {
            // The shared client logs safe errors. Never serialize events/settings/credentials here.
            if (!this.disposed && (!visible || this.contexts.get(event.context) === visible)) this.host.showAlert(event.context);
        }
    }

    dispose(): void {
        this.disposed = true;
        this.contexts.clear();
        this.unsubscribe();
    }

    private render(context: string, entry: Context, snapshot: PearSnapshot): void {
        const next = this.display(entry, snapshot);
        const previous = entry.rendered;
        if (next.feedback) {
            if (previous?.title !== next.title) this.host.setFeedback(context, {title: next.title});
        } else {
            if (next.state !== undefined && next.state !== previous?.state) this.host.setState(next.state, context);
            if (next.image !== undefined && next.image !== previous?.image) this.host.setImage(next.image, context);
            if (next.title !== previous?.title) this.host.setTitle(next.title, context);
        }
        entry.rendered = next;
    }

    private display(entry: Context, snapshot: PearSnapshot): Render {
        if (entry.controller === 'Encoder') return {title: 'Dials pending', feedback: true};
        if (entry.action === ActionTypes.PLAY_PLAYLIST) return {title: 'Pear API\nrequired'};
        if (!snapshot.player.ready || snapshot.connection !== 'connected') {
            return {title: snapshot.connection === 'authorizing' ? 'Approve\nin Pear' : 'Pear\noffline'};
        }
        const state = snapshot.player;
        switch (entry.action) {
            case ActionTypes.PLAY_PAUSE:
                return {state: state.isPlaying === true ? 1 : 0, title: state.isPlaying === null ? '?' : ''};
            case ActionTypes.LIKE_TRACK:
            case ActionTypes.DISLIKE_TRACK:
                return {state: state.likeState === (entry.action === ActionTypes.LIKE_TRACK ? 'LIKE' : 'DISLIKE') ? 1 : 0,
                    title: state.likeState === null ? '?' : ''};
            case ActionTypes.VOLUME_MUTE:
                return {state: state.muted === true ? 1 : 0, title: state.muted === null ? '?' : ''};
            case ActionTypes.VOLUME_DOWN:
            case ActionTypes.VOLUME_UP:
                return {title: state.volume === null ? '?' : `${Math.round(state.volume)}%`};
            case ActionTypes.SONG_INFO:
                return {title: formatTrackInfo(state.song, trackInfoFormat(entry.settings))};
            case ActionTypes.SHUFFLE:
                return {state: state.shuffle === true ? 1 : 0, title: state.shuffle === null ? '?' : state.shuffle ? 'On' : 'Off'};
            case ActionTypes.REPEAT:
                return {image: `icons/repeat-${state.repeat?.toLowerCase() ?? 'none'}.svg`,
                    title: state.repeat === null ? '?' : {NONE: 'Off', ALL: 'All', ONE: 'One'}[state.repeat]};
            default: return {title: ''};
        }
    }
}
