import {isRecord} from './config';

export type RepeatMode = 'NONE' | 'ALL' | 'ONE';
export type LikeState = 'LIKE' | 'DISLIKE' | 'INDIFFERENT';

export interface PearSong {
    title: string;
    artist: string;
    videoId: string;
    songDuration: number;
    album?: string | null;
    imageSrc?: string | null;
    playlistId?: string;
    isPaused?: boolean;
    elapsedSeconds?: number;
}

export interface PearPlayerState {
    readonly ready: boolean;
    readonly song: Readonly<PearSong> | null;
    readonly isPlaying: boolean | null;
    readonly muted: boolean | null;
    readonly volume: number | null;
    readonly position: number | null;
    readonly repeat: RepeatMode | null;
    readonly shuffle: boolean | null;
    readonly likeState: LikeState | null;
}

export type PlayerUpdate = {-readonly [Key in keyof PearPlayerState]?: PearPlayerState[Key]};

export function emptyPlayerState(): PearPlayerState {
    return Object.freeze({ready: false, song: null, isPlaying: null, muted: null,
        volume: null, position: null, repeat: null, shuffle: null, likeState: null});
}

export function mergePlayerState(state: PearPlayerState, update: PlayerUpdate): PearPlayerState {
    return Object.freeze({...state, ...update,
        song: update.song === undefined ? state.song : update.song === null ? null : Object.freeze({...update.song})});
}

export function finiteNonnegative(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function isRepeatMode(value: unknown): value is RepeatMode {
    return value === 'NONE' || value === 'ALL' || value === 'ONE';
}

export function parseSong(value: unknown): PearSong | null {
    if (!isRecord(value) || typeof value.title !== 'string' || typeof value.artist !== 'string' ||
        typeof value.videoId !== 'string' || !finiteNonnegative(value.songDuration)) return null;
    const song: PearSong = {title: value.title, artist: value.artist, videoId: value.videoId, songDuration: value.songDuration};
    for (const key of ['album', 'imageSrc'] as const) {
        if (value[key] !== undefined) {
            if (value[key] !== null && typeof value[key] !== 'string') return null;
            song[key] = value[key] as string | null;
        }
    }
    if (value.playlistId !== undefined) {
        if (typeof value.playlistId !== 'string') return null;
        song.playlistId = value.playlistId;
    }
    if (value.isPaused !== undefined) {
        if (typeof value.isPaused !== 'boolean') return null;
        song.isPaused = value.isPaused;
    }
    if (value.elapsedSeconds !== undefined) {
        if (!finiteNonnegative(value.elapsedSeconds)) return null;
        song.elapsedSeconds = value.elapsedSeconds;
    }
    return song;
}

export function parseLikeState(value: unknown): LikeState | null | undefined {
    if (!isRecord(value)) return undefined;
    return value.state === null || value.state === 'LIKE' || value.state === 'DISLIKE' || value.state === 'INDIFFERENT'
        ? value.state : undefined;
}

export function clampVolume(value: number): number {
    if (!Number.isFinite(value)) throw new Error('Volume must be a finite number.');
    return Math.min(100, Math.max(0, value));
}
