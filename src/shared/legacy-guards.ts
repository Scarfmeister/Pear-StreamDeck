import type {ErrorOutput} from 'ytmdesktop-ts-companion';
import type {GlobalSettingsInterface} from '../interfaces/global-settings.interface';

// Real narrowing for dormant inherited source; removed when its action/PI port is complete.
export function isLegacySettings(value: unknown): value is GlobalSettingsInterface {
    return typeof value === 'object' && value !== null &&
        'host' in value && typeof value.host === 'string' &&
        'port' in value && typeof value.port === 'string' &&
        'token' in value && typeof value.token === 'string';
}

export function isLegacyError(value: unknown): value is ErrorOutput {
    return typeof value === 'object' && value !== null &&
        'statusCode' in value && typeof value.statusCode === 'number' &&
        'message' in value && typeof value.message === 'string';
}
