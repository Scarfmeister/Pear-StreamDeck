import {SDOnPiEvent, SendToPiEvent, StreamDeckPropertyInspectorHandler} from 'streamdeck-typescript';
import {isRecord} from './pear/config';

class PearPi extends StreamDeckPropertyInspectorHandler {
    constructor() { super(); }

    private hostInput: HTMLInputElement;
    private portInput: HTMLInputElement;
    private protocolInput: HTMLSelectElement;
    private authorization: HTMLElement;
    private connection: HTMLElement;
    private error: HTMLElement;
    private reauthorizeButton: HTMLButtonElement;
    private inputsInitialized = false;
    private dirty = false;

    @SDOnPiEvent('setupReady')
    ready() {
        this.hostInput = document.getElementById('globalHost') as HTMLInputElement;
        this.portInput = document.getElementById('globalPort') as HTMLInputElement;
        this.protocolInput = document.getElementById('globalProtocol') as HTMLSelectElement;
        this.authorization = document.getElementById('globalAuthStatus') as HTMLElement;
        this.connection = document.getElementById('globalConnectionStatus') as HTMLElement;
        this.error = document.getElementById('connectionError') as HTMLElement;
        this.reauthorizeButton = document.getElementById('globalAuthButton') as HTMLButtonElement;
        for (const input of [this.hostInput, this.portInput, this.protocolInput]) {
            input.addEventListener('input', () => { this.dirty = true; });
        }
        (document.getElementById('globalSave') as HTMLButtonElement).onclick = () => {
            this.dirty = false;
            this.sendToPlugin({type: 'pear-save-connection', configuration: {
                host: this.hostInput.value, port: this.portInput.value, protocol: this.protocolInput.value}});
        };
        this.reauthorizeButton.onclick = () => this.sendToPlugin({type: 'pear-reauthorize'});
        this.sendToPlugin({type: 'pear-get-status'});
    }

    @SDOnPiEvent('sendToPropertyInspector')
    receive(event: SendToPiEvent) {
        const payload: unknown = event.payload;
        if (!isRecord(payload) || payload.type !== 'pear-status' || !this.connection) return;
        if (isRecord(payload.settings) && (!this.inputsInitialized || !this.dirty)) {
            this.hostInput.value = String(payload.settings.host);
            this.portInput.value = String(payload.settings.port);
            this.protocolInput.value = String(payload.settings.protocol);
            this.inputsInitialized = true;
        }
        const connectionLabels: Record<string, string> = {stopped: 'Waiting for host settings', connecting: 'Connecting',
            authorizing: 'Approve in Pear', 'awaiting-snapshot': 'Waiting for player state', connected: 'Connected',
            retrying: 'Pear unavailable', 'authorization-required': 'Use Reauthorize', error: 'Settings could not be saved'};
        const authLabels: Record<string, string> = {unknown: 'Checking', authorizing: 'Waiting for approval in Pear',
            authorized: 'Authorized', disabled: 'Authentication disabled', required: 'Authorization required', denied: 'Denied'};
        this.connection.textContent = connectionLabels[String(payload.connection)] ?? 'Unknown';
        if (payload.connection === 'retrying' && typeof payload.retryInMs === 'number') {
            this.connection.textContent += `; retry in ${Math.ceil(payload.retryInMs / 1000)}s`;
        }
        this.authorization.textContent = authLabels[String(payload.authentication)] ?? 'Unknown';
        this.reauthorizeButton.disabled = payload.connection === 'authorizing';
        this.error.textContent = typeof payload.error === 'string' ? payload.error : '';
    }
}

new PearPi();
