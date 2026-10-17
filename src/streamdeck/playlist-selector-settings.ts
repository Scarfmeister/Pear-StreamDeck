import {isRecord} from '../pear/config';
import {parsePlaylistInput, playlistInput, PLAYLIST_STARTUP_MODES, playlistStartupMode, PlaylistStartupMode} from '../pear/playlist';

export const MAX_PLAYLIST_ENTRIES = 16;
export const MAX_PLAYLIST_IMAGE_BYTES = 24 * 1024;

export interface PlaylistEntry {
    readonly name: string;
    readonly input: string;
    readonly playlistId?: string;
    readonly startupMode: PlaylistStartupMode;
    readonly image?: string;
    readonly valid: boolean;
}

function validName(value: unknown): value is string {
    return typeof value === 'string' && !!value.trim() && Array.from(value.trim()).length <= 64;
}

/** Embedded raster images only; no external paths, SVG, remote fetch, or host file access. */
export function playlistImage(value: unknown): string | undefined {
    if (typeof value !== 'string' || value.length > 4 * Math.ceil(MAX_PLAYLIST_IMAGE_BYTES / 3) + 32) return undefined;
    const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
    if (!match || match[2].length % 4 !== 0) return undefined;
    const bytes = match[2].length / 4 * 3 - (match[2].endsWith('==') ? 2 : match[2].endsWith('=') ? 1 : 0);
    const signature = match[1] === 'png' ? match[2].startsWith('iVBORw0KGgo') : match[2].startsWith('/9j/');
    return signature && bytes >= (match[1] === 'png' ? 33 : 4) && bytes <= MAX_PLAYLIST_IMAGE_BYTES ? value : undefined;
}

/** Keep bad slots in place so a bad ID cannot silently select a different playlist. */
export function playlistEntries(settings: unknown): readonly PlaylistEntry[] {
    if (!isRecord(settings) || !Array.isArray(settings.playlists)) return [];
    return settings.playlists.slice(0, MAX_PLAYLIST_ENTRIES).map(raw => {
        const record = isRecord(raw) ? raw : {};
        const input = playlistInput(record);
        let playlistId: string | undefined;
        try { playlistId = parsePlaylistInput(input); } catch { /* Explicit invalid slot. */ }
        return {name: typeof record.name === 'string' ? record.name.trim() : '',
            input: typeof input === 'string' ? input : '', playlistId,
            startupMode: playlistStartupMode(record), image: playlistImage(record.image),
            valid: validName(record.name) && playlistId !== undefined};
    });
}

export function selectedPlaylistIndex(settings: unknown, length: number): number {
    const index = isRecord(settings) ? settings.selectedIndex : undefined;
    if (!length || !Number.isSafeInteger(index)) return 0;
    return Math.min(length - 1, Math.max(0, index as number));
}

export function rotatePlaylistIndex(index: number, ticks: unknown, length: number): number {
    if (!length) return 0;
    const bounded = selectedPlaylistIndex({selectedIndex: index}, length);
    if (!Number.isSafeInteger(ticks)) return bounded;
    return (bounded + (ticks as number) % length + length) % length;
}

/** Explicit saves normalize entries; a concurrent dial selection is retained from current settings. */
export function savePlaylistSelector(current: unknown, edit: unknown): Record<string, unknown> {
    const existing = isRecord(current) ? current : {};
    if (!isRecord(edit) || !Array.isArray(edit.playlists) || edit.playlists.length > MAX_PLAYLIST_ENTRIES) {
        throw new Error(`Configure at most ${MAX_PLAYLIST_ENTRIES} playlists.`);
    }
    const playlists = edit.playlists.map((raw, index) => {
        if (!isRecord(raw) || !validName(raw.name)) throw new Error(`Playlist ${index + 1} needs a name of 1–64 characters.`);
        let playlistId: string;
        try { playlistId = parsePlaylistInput(raw.playlistInput ?? playlistInput(raw)); }
        catch { throw new Error(`Playlist ${index + 1} needs a valid playlist URL or ID.`); }
        if (raw.startupMode !== undefined && !PLAYLIST_STARTUP_MODES.includes(raw.startupMode as PlaylistStartupMode)) {
            throw new Error(`Choose a supported startup mode for playlist ${index + 1}.`);
        }
        const image = playlistImage(raw.image);
        if (raw.image !== undefined && raw.image !== '' && !image) {
            throw new Error(`Playlist ${index + 1} image must be an embedded PNG or JPEG of at most 24 KiB.`);
        }
        return {name: raw.name.trim().replace(/\s+/g, ' '), playlistId, startupMode: playlistStartupMode(raw), ...(image ? {image} : {})};
    });
    return {...existing, playlists, selectedIndex: selectedPlaylistIndex(existing, playlists.length)};
}
