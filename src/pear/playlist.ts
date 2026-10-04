import {isRecord} from './config';

export type PlaylistStartupMode = 'FOLLOW_SHUFFLE_STATE' | 'ALWAYS_NORMAL' | 'ALWAYS_SHUFFLE';
export const PLAYLIST_STARTUP_MODES: readonly PlaylistStartupMode[] =
    ['FOLLOW_SHUFFLE_STATE', 'ALWAYS_NORMAL', 'ALWAYS_SHUFFLE'];

export class PlaylistInputError extends Error {
    constructor() { super('Enter a playlist ID or a YouTube playlist/watch URL with one valid list value.'); }
}

const validId = (value: string) => /^[A-Za-z0-9_-]{1,256}$/.test(value);
const hosts = new Set(['music.youtube.com', 'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']);

/** D013: decode once, preserve case, and never substitute a video/browse ID for list. */
export function parsePlaylistInput(input: unknown): string {
    if (typeof input !== 'string' || input.length > 4096) throw new PlaylistInputError();
    const value = input.trim();
    if (validId(value)) return value;
    try {
        // URL tolerates malformed escapes and backslashes; the input contract does not.
        if (/\s|\\/.test(value) || /%(?![a-f\d]{2})/i.test(value)) throw new PlaylistInputError();
        decodeURIComponent(value); // Reject invalid UTF-8 too; this result is not used for parsing.
        if (!/^https?:\/\//i.test(value) || /^https?:\/\/[^/?#]*@/i.test(value)) throw new PlaylistInputError();
        const url = new URL(value);
        const supportedPath = url.hostname === 'youtu.be' ? /^\/[A-Za-z0-9_-]+$/.test(url.pathname)
            : url.pathname === '/playlist' || url.pathname === '/watch';
        if (!hosts.has(url.hostname) || url.username || url.password || url.port || !supportedPath) throw new PlaylistInputError();
        const ids = url.searchParams.getAll('list');
        if (ids.length !== 1 || !validId(ids[0])) throw new PlaylistInputError();
        return ids[0];
    } catch { throw new PlaylistInputError(); }
}

export function playlistStartupMode(settings: unknown): PlaylistStartupMode {
    const value = isRecord(settings) ? settings.startupMode : undefined;
    return PLAYLIST_STARTUP_MODES.includes(value as PlaylistStartupMode) ? value as PlaylistStartupMode : 'FOLLOW_SHUFFLE_STATE';
}

/** A legacy URL takes precedence over its possibly stale extracted ID. Invalid URLs never fall back. */
export function playlistInput(settings: unknown): unknown {
    if (!isRecord(settings)) return undefined;
    return typeof settings.playlistUrl === 'string' && settings.playlistUrl.trim() ? settings.playlistUrl : settings.playlistId;
}

export function playlistShuffle(mode: PlaylistStartupMode, shuffle: boolean | null): boolean | null {
    if (mode === 'ALWAYS_NORMAL') return false;
    if (mode === 'ALWAYS_SHUFFLE') return true;
    return shuffle;
}

export interface PlaylistDispatch {readonly playlistId: string; readonly shuffle: boolean; readonly status: 'dispatched';}
