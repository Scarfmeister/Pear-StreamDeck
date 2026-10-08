export function reconnectDelay(attempt: number, random = Math.random): number {
    const base = Math.min(30000, 1000 * 2 ** Math.min(5, Math.max(0, attempt - 1)));
    const jitter = 0.8 + Math.max(0, Math.min(1, random())) * 0.4;
    return Math.min(30000, Math.max(800, Math.round(base * jitter)));
}
