import {isRecord, validToken} from './config';
import {PearRequestError} from './rest-client';

export type AuthenticationState = 'unknown' | 'authorizing' | 'authorized' | 'disabled' | 'required' | 'denied';

export function parseAuthorizationResponse(value: unknown): string {
    if (!isRecord(value) || !validToken(value.accessToken)) throw new PearRequestError('invalid-response');
    return value.accessToken;
}

export function isUnauthorized(error: unknown): boolean {
    return error instanceof PearRequestError && (error.status === 401 || error.status === 403);
}
