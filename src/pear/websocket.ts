import {isRecord} from './config';
import {finiteNonnegative, isRepeatMode, parseSong, PlayerUpdate} from './state';

export type PearEventType = 'PLAYER_INFO' | 'VIDEO_CHANGED' | 'PLAYER_STATE_CHANGED' |
    'POSITION_CHANGED' | 'VOLUME_CHANGED' | 'REPEAT_CHANGED' | 'SHUFFLE_CHANGED';
export interface PearEvent {type: PearEventType; update: PlayerUpdate;}

export function parsePearMessage(raw: unknown): PearEvent | null {
    if (typeof raw !== 'string' || raw.length > 65536) return null;
    let value: unknown;
    try { value = JSON.parse(raw); } catch { return null; }
    if (!isRecord(value)) return null;
    const update: PlayerUpdate = {};
    const boolean = (key: 'isPlaying' | 'muted' | 'shuffle') => {
        if (typeof value[key] !== 'boolean') return false;
        Object.assign(update, {[key]: value[key]});
        return true;
    };
    const number = (key: 'position' | 'volume') => {
        if (!finiteNonnegative(value[key]) || (key === 'volume' && value[key] > 100)) return false;
        Object.assign(update, {[key]: value[key]});
        return true;
    };
    const repeat = () => {
        if (!isRepeatMode(value.repeat)) return false;
        update.repeat = value.repeat;
        return true;
    };
    const song = (optional: boolean) => {
        if (value.song === undefined) return optional;
        if (value.song === null) { update.song = null; return true; }
        const parsed = parseSong(value.song);
        if (!parsed) return false;
        update.song = parsed;
        return true;
    };
    let valid = false;
    switch (value.type) {
        case 'PLAYER_INFO':
            valid = boolean('isPlaying') && boolean('muted') && number('position') && number('volume') &&
                repeat() && boolean('shuffle') && song(true);
            update.ready = true;
            break;
        case 'VIDEO_CHANGED': valid = song(false) && number('position'); update.likeState = null; break;
        case 'PLAYER_STATE_CHANGED': valid = boolean('isPlaying') && number('position'); break;
        case 'POSITION_CHANGED': valid = number('position'); break;
        case 'VOLUME_CHANGED': valid = number('volume') && boolean('muted'); break;
        case 'REPEAT_CHANGED': valid = repeat(); break;
        case 'SHUFFLE_CHANGED': valid = boolean('shuffle'); break;
        default: return null;
    }
    return valid ? {type: value.type as PearEventType, update} : null;
}
