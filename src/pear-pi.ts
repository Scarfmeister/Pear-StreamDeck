import {DidReceiveSettingsEvent, SDOnPiEvent, SendToPiEvent, StreamDeckPropertyInspectorHandler} from 'streamdeck-typescript';
import {isRecord} from './pear/config';
import {ActionTypes} from './interfaces/enums';
import {saveActionSettings, trackInfoFormat, volumeStep} from './streamdeck/action-settings';
import {playlistInput, playlistStartupMode} from './pear/playlist';
import {PlaylistSelectorEditor} from './streamdeck/playlist-selector-editor';

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
    private actionDirty = false;
    private actionSettings: unknown;
    private volumeInput: HTMLInputElement;
    private formatInput: HTMLSelectElement;
    private playlistInputElement: HTMLInputElement;
    private startupInput: HTMLSelectElement;
    private actionMessage: HTMLElement;
    private selector?: PlaylistSelectorEditor;

    // The retained framework omits action and assumes the PI UUID is the action context.
    override requestSettings(): void {
        this.send('getSettings', {action: this.actionInfo.action, context: this.actionInfo.context});
    }

    override setSettings<T>(settings: T): void {
        this.send('setSettings', {action: this.actionInfo.action, context: this.actionInfo.context, payload: settings});
    }

    override sendToPlugin(payload: unknown, action?: string): void {
        this.send('sendToPlugin', {action: action ?? this.actionInfo.action, context: this.actionInfo.context, payload});
    }

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
            this.dirty = true;
            this.sendToPlugin({type: 'pear-save-connection', configuration: {
                host: this.hostInput.value, port: this.portInput.value, protocol: this.protocolInput.value}});
        };
        this.reauthorizeButton.onclick = () => this.sendToPlugin({type: 'pear-reauthorize'});
        this.volumeInput = document.getElementById('volumeStep') as HTMLInputElement;
        this.formatInput = document.getElementById('trackInfoFormat') as HTMLSelectElement;
        this.playlistInputElement = document.getElementById('playlistInput') as HTMLInputElement;
        this.startupInput = document.getElementById('playlistStartupMode') as HTMLSelectElement;
        this.actionMessage = document.getElementById('actionMessage') as HTMLElement;
        const action = this.actionInfo.action;
        const volume = action === ActionTypes.VOLUME_UP || action === ActionTypes.VOLUME_DOWN || action === ActionTypes.VOLUME_DIAL;
        const track = action === ActionTypes.SONG_INFO;
        const playlist = action === ActionTypes.PLAY_PLAYLIST;
        const selector = action === ActionTypes.PLAYLIST_SELECTOR;
        (document.getElementById('volumeSettings') as HTMLElement).hidden = !volume;
        (document.getElementById('trackInfoSettings') as HTMLElement).hidden = !track;
        (document.getElementById('playlistSettings') as HTMLElement).hidden = !playlist;
        (document.getElementById('selectorSettings') as HTMLElement).hidden = !selector;
        (document.getElementById('dialHelp') as HTMLElement).hidden = !selector && action !== ActionTypes.VOLUME_DIAL && action !== ActionTypes.TRANSPORT_DIAL;
        (document.getElementById('actionSettings') as HTMLElement).hidden = !volume && !track && !playlist && !selector;
        if (selector) this.selector = new PlaylistSelectorEditor(document.getElementById('selectorEntries') as HTMLElement,
            document.getElementById('selectorAdd') as HTMLButtonElement,
            () => { this.actionDirty = true; this.actionMessage.textContent = ''; },
            text => { this.actionMessage.textContent = text; });
        for (const input of [this.volumeInput, this.formatInput, this.playlistInputElement, this.startupInput]) {
            input.addEventListener('input', () => { this.actionDirty = true; this.actionMessage.textContent = ''; });
        }
        this.actionSettings ??= this.actionInfo.payload.settings;
        this.renderActionSettings();
        (document.getElementById('actionSave') as HTMLButtonElement).onclick = () => {
            try {
                const settings = saveActionSettings(action, this.actionSettings, this.selector?.edits() ?? {steps: this.volumeInput.value,
                    displayFormat: this.formatInput.value, playlistInput: this.playlistInputElement.value,
                    startupMode: this.startupInput.value});
                this.setSettings(settings);
                this.actionSettings = settings;
                this.actionDirty = false;
                this.renderActionSettings();
                this.actionMessage.textContent = 'Settings sent to Stream Deck.';
                this.requestSettings();
            } catch (error) {
                this.actionMessage.textContent = error instanceof Error ? error.message : 'Could not save action settings.';
            }
        };
        this.sendToPlugin({type: 'pear-get-status'});
    }

    @SDOnPiEvent('didReceiveSettings')
    receiveActionSettings(event: DidReceiveSettingsEvent) {
        if (event.context !== this.actionInfo.context || event.action !== this.actionInfo.action) return;
        this.actionSettings = event.payload.settings;
        if (this.actionMessage && !this.actionDirty) this.renderActionSettings();
    }

    private renderActionSettings(): void {
        this.volumeInput.value = String(volumeStep(this.actionSettings));
        this.formatInput.value = trackInfoFormat(this.actionSettings);
        const input = playlistInput(this.actionSettings);
        this.playlistInputElement.value = typeof input === 'string' ? input : '';
        this.startupInput.value = playlistStartupMode(this.actionSettings);
        this.selector?.render(this.actionSettings);
    }

    @SDOnPiEvent('sendToPropertyInspector')
    receive(event: SendToPiEvent) {
        const payload: unknown = event.payload;
        if (!isRecord(payload) || !this.connection) return;
        if (payload.type === 'pear-connection-saved') { this.dirty = false; return; }
        if (payload.type === 'pear-playlist-status') {
            if ([ActionTypes.PLAY_PLAYLIST, ActionTypes.PLAYLIST_SELECTOR].includes(this.actionInfo.action as ActionTypes) && typeof payload.message === 'string') {
                this.actionMessage.textContent = payload.message;
            }
            return;
        }
        if (payload.type !== 'pear-status') return;
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
