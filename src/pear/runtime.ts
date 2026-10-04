export interface Scheduler {
    setTimeout(callback: () => void, delayMs: number): unknown;
    clearTimeout(handle: unknown): void;
}

export const systemScheduler: Scheduler = {
    setTimeout: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
    clearTimeout: handle => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export interface SocketHandlers {
    message(data: unknown): void;
    close(code: number): void;
    error(): void;
}

export interface PearSocket { close(): void; }
export type SocketFactory = (url: string, handlers: SocketHandlers) => PearSocket;

export const browserSocket: SocketFactory = (url, handlers) => {
    const socket = new WebSocket(url);
    socket.onmessage = event => handlers.message(event.data);
    socket.onclose = event => handlers.close(event.code);
    socket.onerror = () => handlers.error();
    return {close: () => {
        socket.onmessage = socket.onclose = socket.onerror = null;
        socket.close();
    }};
};
