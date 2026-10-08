export const PEAR_CLIENT_ID = 'io.github.scarfmeister.pear-streamdeck';
export const API_PATH = '/api/v1';

export interface PearConfiguration {
    host: string;
    port: number;
    protocol: 'http' | 'https';
}

export interface PearSettings extends PearConfiguration {
    schemaVersion: 1;
    credential?: {accessToken: string; endpoint: string; clientId: string};
    authBlocked?: 'denied' | 'invalid' | 'interrupted' | 'invalid-response';
}

export const DEFAULT_CONFIGURATION: Readonly<PearConfiguration> = Object.freeze({
    host: '127.0.0.1', port: 26538, protocol: 'http',
});

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeConfiguration(value: unknown = {}): PearConfiguration {
    if (!isRecord(value)) throw new Error('Connection settings must be an object.');
    const hostValue = value.host ?? DEFAULT_CONFIGURATION.host;
    if (typeof hostValue !== 'string') throw new Error('Host must be a hostname or IP address.');
    let host = hostValue.trim().toLowerCase();
    if (host === 'localhost') host = '127.0.0.1';
    if (host.startsWith('[') && host.endsWith(']')) host = host.slice(1, -1);
    // Host is not a URL: reject credentials, paths, query strings, and embedded ports.
    if (!host || !/^[a-z0-9.:-]+$/.test(host)) throw new Error('Host must be a hostname or IP address.');
    const authority = host.includes(':') ? `[${host}]` : host;
    try { new URL(`http://${authority}`); } catch { throw new Error('Host is invalid.'); }
    const portValue = value.port ?? DEFAULT_CONFIGURATION.port;
    const port = typeof portValue === 'string' && /^\d+$/.test(portValue) ? Number(portValue) : portValue;
    if (typeof port !== 'number' || !Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('Port must be an integer from 1 to 65535.');
    }
    const protocol = value.protocol ?? DEFAULT_CONFIGURATION.protocol;
    if (protocol !== 'http' && protocol !== 'https') throw new Error('Protocol must be http or https.');
    return {host, port, protocol};
}

export function endpointKey(configuration: PearConfiguration): string {
    const host = configuration.host.includes(':') ? `[${configuration.host}]` : configuration.host;
    return `${configuration.protocol}://${host}:${configuration.port}`;
}

export function apiUrl(configuration: PearConfiguration, path: string): string {
    const relative = path.replace(/^\//, '').replace(/^api\/v1\//, '');
    if (!/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/i.test(relative) || relative.startsWith('api/')) {
        throw new Error('API path must be a relative v1 route.');
    }
    return `${endpointKey(configuration)}${API_PATH}/${relative}`;
}

export function authUrl(configuration: PearConfiguration, clientId = PEAR_CLIENT_ID): string {
    if (!clientId) throw new Error('Client ID is required.');
    return `${endpointKey(configuration)}/auth/${encodeURIComponent(clientId)}`;
}

export function websocketUrl(configuration: PearConfiguration, accessToken?: string): string {
    const url = new URL(apiUrl(configuration, 'ws'));
    url.protocol = configuration.protocol === 'https' ? 'wss:' : 'ws:';
    if (accessToken) url.searchParams.set('token', accessToken);
    return url.toString();
}

export function validToken(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0 && value.length <= 8192 && !/\s/.test(value);
}

export function normalizeSettings(value: unknown = {}): PearSettings {
    if (!isRecord(value)) throw new Error('Pear settings must be an object.');
    if (value.schemaVersion !== undefined && value.schemaVersion !== 1) throw new Error('Unsupported Pear settings version.');
    const configuration = normalizeConfiguration(value);
    const result: PearSettings = {schemaVersion: 1, ...configuration};
    const credential = value.credential;
    if (isRecord(credential) && validToken(credential.accessToken) &&
        credential.endpoint === endpointKey(configuration) && credential.clientId === PEAR_CLIENT_ID) {
        result.credential = {accessToken: credential.accessToken, endpoint: credential.endpoint, clientId: PEAR_CLIENT_ID};
    }
    if (['denied', 'invalid', 'interrupted', 'invalid-response'].includes(String(value.authBlocked))) {
        result.authBlocked = value.authBlocked as PearSettings['authBlocked'];
    }
    return result;
}

export function readGlobalSettings(value: unknown): PearSettings {
    // The legacy top-level YTMD token/port must never become Pear credentials.
    return normalizeSettings(isRecord(value) ? value.pear ?? {} : {});
}

export function changeEndpoint(value: unknown, previous: PearSettings): PearSettings {
    const configuration = normalizeConfiguration(value);
    return normalizeSettings(endpointKey(configuration) === endpointKey(previous)
        ? {...previous, ...configuration} : configuration);
}
