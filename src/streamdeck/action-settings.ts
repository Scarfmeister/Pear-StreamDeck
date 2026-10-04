import {ActionTypes} from '../interfaces/enums';
import {isRecord} from '../pear/config';
import {parsePlaylistInput, PLAYLIST_STARTUP_MODES, playlistStartupMode, PlaylistStartupMode} from '../pear/playlist';

export type TrackInfoFormat = 'TITLE' | 'ARTIST' | 'TITLE_ARTIST' | 'ALBUM' | 'TITLE_ARTIST_ALBUM';
export const TRACK_INFO_FORMATS: readonly TrackInfoFormat[] = ['TITLE', 'ARTIST', 'TITLE_ARTIST', 'ALBUM', 'TITLE_ARTIST_ALBUM'];

export function validVolumeStep(value: unknown): number | undefined {
    const step = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
    return Number.isInteger(step) && step >= 1 && step <= 100 ? step : undefined;
}

export function volumeStep(settings: unknown): number {
    return validVolumeStep(isRecord(settings) ? settings.steps : undefined) ?? 5;
}

export function trackInfoFormat(settings: unknown): TrackInfoFormat {
    const raw = isRecord(settings) ? settings.displayFormat : undefined;
    return TRACK_INFO_FORMATS.includes(raw as TrackInfoFormat) ? raw as TrackInfoFormat : 'TITLE_ARTIST';
}

/** Strict edits; old records use tolerant readers above until explicitly saved. */
export function saveActionSettings(action: string, current: unknown, edit: unknown): Record<string, unknown> {
    const existing = isRecord(current) ? current : {};
    const patch = isRecord(edit) ? edit : {};
    switch (action) {
        case ActionTypes.VOLUME_DOWN:
        case ActionTypes.VOLUME_UP: {
            const steps = validVolumeStep(patch.steps);
            if (steps === undefined) throw new Error('Volume step must be a whole percentage from 1 to 100.');
            return {...existing, steps};
        }
        case ActionTypes.SONG_INFO:
            if (!TRACK_INFO_FORMATS.includes(patch.displayFormat as TrackInfoFormat)) throw new Error('Choose a supported Track Info format.');
            return {...existing, displayFormat: patch.displayFormat};
        case ActionTypes.PLAY_PLAYLIST: {
            if (!PLAYLIST_STARTUP_MODES.includes(patch.startupMode as PlaylistStartupMode)) throw new Error('Choose a supported playlist startup mode.');
            const playlistId = parsePlaylistInput(patch.playlistInput);
            const {playlistUrl: _url, ...rest} = existing;
            return {...rest, playlistId, startupMode: playlistStartupMode(patch)};
        }
        default: throw new Error('This action has no per-action settings.');
    }
}
