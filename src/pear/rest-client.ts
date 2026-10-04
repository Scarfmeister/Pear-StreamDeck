import {apiUrl, authUrl, PearConfiguration} from './config';
import {Scheduler, systemScheduler} from './runtime';

export type FailureCode = 'http' | 'network' | 'timeout' | 'aborted' | 'invalid-response' | 'not-connected' |
    'state-unavailable' | 'command-busy' | 'command-unconfirmed';

export class PearRequestError extends Error {
    readonly code: FailureCode;
    readonly status?: number;
    readonly retryAfterMs?: number;

    constructor(code: FailureCode, status?: number, retryAfterMs?: number) {
        // Deliberately exclude raw URLs, response bodies, and native error strings.
        super(status ? `Pear request failed (HTTP ${status}).` : `Pear request failed (${code}).`);
        this.name = 'PearRequestError';
        this.code = code;
        this.status = status;
        this.retryAfterMs = retryAfterMs;
    }
}

export interface RequestOptions {
    method?: 'GET' | 'POST';
    body?: unknown;
    accessToken?: string;
    signal?: AbortSignal;
    timeoutMs?: number;
}

export class PearRestClient {
    constructor(private readonly fetcher: typeof fetch = globalThis.fetch.bind(globalThis),
                private readonly scheduler: Scheduler = systemScheduler) {}

    api(configuration: PearConfiguration, path: string, options: RequestOptions = {}): Promise<unknown> {
        return this.request(apiUrl(configuration, path), options);
    }

    authorize(configuration: PearConfiguration, signal: AbortSignal, timeoutMs = 120000): Promise<unknown> {
        return this.request(authUrl(configuration), {method: 'POST', signal, timeoutMs});
    }

    private async request(url: string, options: RequestOptions): Promise<unknown> {
        const controller = new AbortController();
        let timedOut = false;
        const abort = () => controller.abort();
        options.signal?.addEventListener('abort', abort, {once: true});
        if (options.signal?.aborted) controller.abort();
        const timer = this.scheduler.setTimeout(() => {
            timedOut = true;
            controller.abort();
        }, options.timeoutMs ?? 8000);
        const headers: Record<string, string> = {Accept: 'application/json'};
        if (options.accessToken) headers.Authorization = `Bearer ${options.accessToken}`;
        if (options.body !== undefined) headers['Content-Type'] = 'application/json';
        try {
            if (controller.signal.aborted) throw new PearRequestError('aborted');
            const response = await this.fetcher(url, {
                method: options.method ?? 'GET', headers,
                body: options.body === undefined ? undefined : JSON.stringify(options.body),
                signal: controller.signal, redirect: 'error', credentials: 'omit', cache: 'no-store',
            });
            if (!response.ok) {
                const seconds = Number(response.headers.get('Retry-After'));
                const retryAfter = response.status === 429 && Number.isFinite(seconds) && seconds > 0
                    ? Math.min(300000, seconds * 1000) : undefined;
                throw new PearRequestError('http', response.status, retryAfter);
            }
            if (response.status === 204) return undefined;
            const body = await response.text();
            if (!body.trim()) return undefined;
            try { return JSON.parse(body); } catch { throw new PearRequestError('invalid-response'); }
        } catch (error) {
            if (timedOut) throw new PearRequestError('timeout');
            if (controller.signal.aborted) throw new PearRequestError('aborted');
            if (error instanceof PearRequestError) throw error;
            throw new PearRequestError('network');
        } finally {
            this.scheduler.clearTimeout(timer);
            options.signal?.removeEventListener('abort', abort);
        }
    }
}
