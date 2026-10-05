import {ActionTypes} from '../interfaces/enums';
import {isRecord} from '../pear/config';
import {PearCommands} from '../pear/commands';
import {PearClient, PearPlaylistError, PearSnapshot} from '../pear/pear-client';
import {PearSong} from '../pear/state';
import {TrackInfoFormat, trackInfoFormat, volumeStep} from '../streamdeck/action-settings';
import {parsePlaylistInput, playlistInput, playlistStartupMode} from '../pear/playlist';
import {Translate} from '../streamdeck/localization';
export {TRACK_INFO_FORMATS, TrackInfoFormat, trackInfoFormat, volumeStep} from '../streamdeck/action-settings';

function readableLine(text: string, limit: number): string {
    const characters = Array.from(text.replace(/\s+/g, ' ').trim());
    return characters.length <= limit ? characters.join('') : characters.slice(0, limit - 1).join('') + '…';
}

/** Small-key text; the song model retains the full metadata for future display choices. */
export function formatTrackInfo(song: Readonly<PearSong> | null, format: TrackInfoFormat, limit = 12, t: Translate = text => text): string {
    if (!song) return t('No track');
    const title = song.title.trim() || t('Unknown title');
    const artist = song.artist.trim() || t('Unknown artist');
    const album = song.album?.trim() || t('No album');
    const lines = {TITLE: [title], ARTIST: [artist], TITLE_ARTIST: [title, artist],
        ALBUM: [album], TITLE_ARTIST_ALBUM: [title, artist, album]};
    return lines[format].map(line => readableLine(line, limit)).join('\n');
}

export interface PearKeyClient {
    readonly commands: Pick<PearCommands, 'play' | 'pause' | 'togglePlay' | 'next' | 'previous' |
        'like' | 'dislike' | 'toggleMute' | 'changeVolume' | 'toggleShuffle' | 'cycleRepeat'>;
    getSnapshot(): PearSnapshot;
    subscribe(listener: (snapshot: PearSnapshot) => void): () => void;
    startPlaylist: PearClient['startPlaylist'];
}

export interface PearKeyHost {
    setState(state: 0 | 1, context: string): void;
    setTitle(title: string, context: string): void;
    setImage(image: string, context: string): void;
    setFeedback(context: string, payload: Record<string, unknown>): void;
    showAlert(context: string): void;
    playlistStatus?(context: string, message: string): void;
}

export interface KeyContextEvent {
    action: string;
    context: string;
    payload: {settings?: unknown; controller?: string};
}
type Render = {title: string; state?: 0 | 1; image?: string; feedback?: boolean};
type Context = {action: string; controller?: string; settings: unknown; rendered?: Render; playlistError?: string};

/** One shared subscription, with independently cached displays for all visible contexts. */
export class PearKeyActions {
    private readonly contexts = new Map<string, Context>();
    private readonly unsubscribe: () => void;
    private disposed = false;

    constructor(private readonly client: PearKeyClient, private readonly host: PearKeyHost,
                private readonly t: Translate = text => text) {
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
        entry.playlistError = undefined;
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
                case ActionTypes.PLAY_PLAYLIST:
                    await this.client.startPlaylist(playlistInput(settings), playlistStartupMode(settings));
                    if (visible && this.contexts.get(event.context) === visible && !this.disposed) {
                        visible.playlistError = undefined;
                        this.render(event.context, visible, this.client.getSnapshot());
                    }
                    if (!this.disposed && (!visible || this.contexts.get(event.context) === visible)) {
                        this.host.playlistStatus?.(event.context, 'Native playlist command dispatched. Check Pear state for playback.');
                    }
                    break;
            }
        } catch (error) {
            // The shared client logs safe errors. Never serialize events/settings/credentials here.
            if (!this.disposed && (!visible || this.contexts.get(event.context) === visible)) {
                if (event.action === ActionTypes.PLAY_PLAYLIST) {
                    if (visible) {
                        visible.playlistError = error instanceof PearPlaylistError && error.reason === 'extension-required' ? 'Update\nPear'
                            : error instanceof PearPlaylistError && error.reason === 'native-unavailable' ? 'Unavailable' : 'Start failed';
                        this.render(event.context, visible, this.client.getSnapshot());
                    }
                    this.host.playlistStatus?.(event.context, error instanceof Error ? error.message : 'Playlist startup failed.');
                }
                this.host.showAlert(event.context);
            }
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
        if (!snapshot.player.ready || snapshot.connection !== 'connected') {
            return {title: this.t(snapshot.connection === 'authorizing' ? 'Approve\nin Pear' : 'Pear\noffline')};
        }
        const state = snapshot.player;
        switch (entry.action) {
            case ActionTypes.PLAY_PLAYLIST:
                if (entry.playlistError) return {title: this.t(entry.playlistError)};
                try { parsePlaylistInput(playlistInput(entry.settings)); return {title: this.t('Play\nplaylist')}; }
                catch { return {title: this.t('Set playlist')}; }
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
                return {title: formatTrackInfo(state.song, trackInfoFormat(entry.settings), 12, this.t)};
            case ActionTypes.SHUFFLE:
                return {state: state.shuffle === true ? 1 : 0, title: state.shuffle === null ? '?' : this.t(state.shuffle ? 'On' : 'Off')};
            case ActionTypes.REPEAT:
                return {image: `icons/repeat-${state.repeat?.toLowerCase() ?? 'none'}.png`,
                    title: state.repeat === null ? '?' : this.t({NONE: 'Off', ALL: 'All', ONE: 'One'}[state.repeat])};
            default: return {title: ''};
        }
    }
}
