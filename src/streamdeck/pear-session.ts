import {changeEndpoint, isRecord, readGlobalSettings} from '../pear/config';
import {PearClient, PearClientOptions} from '../pear/pear-client';

export interface PearSettingsHost {
    saveGlobalSettings(settings: Record<string, unknown>): void;
}

/** Host adapter: owns the one client and merges its credentials into global settings. */
export class PearSession {
    readonly client: PearClient;
    private globalSettings: Record<string, unknown> = {};
    private loaded = false;
    private ownWrites: string[] = [];

    constructor(private readonly host: PearSettingsHost, options: Omit<PearClientOptions, 'saveSettings'> = {}) {
        this.client = new PearClient({}, {...options, saveSettings: pear => this.save({...this.globalSettings, pear})});
    }

    receiveGlobalSettings(raw: unknown): void {
        const global = isRecord(raw) ? raw : {};
        // Keep the host record available for repair even when its Pear fields are invalid.
        this.globalSettings = {...global};
        this.loaded = true;
        const pear = readGlobalSettings(global);
        const key = JSON.stringify(pear);
        const ownWrite = this.ownWrites.indexOf(key);
        // Ignore delayed echoes of this session's writes (including its approval marker).
        if (ownWrite >= 0) {
            this.ownWrites.splice(ownWrite, 1);
            return;
        }
        this.client.configure(pear);
        this.client.start();
    }

    saveConnection(configuration: unknown): void {
        if (!this.loaded) throw new Error('Stream Deck global settings are not loaded yet.');
        const pear = changeEndpoint(configuration, this.client.getSettings());
        this.save({...this.globalSettings, pear});
        this.client.configure(pear);
        this.client.start();
    }

    reauthorize(): void {
        if (!this.loaded) throw new Error('Stream Deck global settings are not loaded yet.');
        this.client.reauthorize();
    }

    status(): Record<string, unknown> {
        const snapshot = this.client.getSnapshot();
        const {host, port, protocol} = this.client.getSettings();
        // Credentials never cross the plugin -> PI status channel.
        return {type: 'pear-status', connection: snapshot.connection,
            authentication: snapshot.authentication, retryInMs: snapshot.retryInMs,
            lastError: snapshot.lastError, settings: {host, port, protocol}};
    }

    private save(settings: Record<string, unknown>): void {
        this.host.saveGlobalSettings(settings);
        this.globalSettings = settings;
        this.ownWrites.push(JSON.stringify(settings.pear));
        if (this.ownWrites.length > 16) this.ownWrites.shift();
    }
}
