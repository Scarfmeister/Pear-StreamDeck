import {DidReceiveGlobalSettingsEvent, SDOnActionEvent, SendToPluginEvent,
    StreamDeckPluginHandler, WillAppearEvent, WillDisappearEvent, KeyUpEvent} from 'streamdeck-typescript';
import {isRecord} from './pear/config';
import {PearSession} from './streamdeck/pear-session';

class PearPlugin extends StreamDeckPluginHandler {
    readonly pear = new PearSession({saveGlobalSettings: settings => {
        this.settingsManager.cacheGlobalSettings(settings);
        this.setGlobalSettings(settings);
    }}, {log: (level, message) => this.logMessage(`[Pear/${level}] ${message}`)});
    private readonly inspectors = new Map<string, string>();
    private configurationError?: string;

    constructor() {
        super();
        this.pear.client.subscribe(() => this.publishStatus());
        window.addEventListener('beforeunload', () => this.pear.client.stop());
    }

    @SDOnActionEvent('didReceiveGlobalSettings')
    receivedSettings(event: DidReceiveGlobalSettingsEvent) {
        try {
            this.pear.receiveGlobalSettings(event.payload.settings);
            this.configurationError = undefined;
            this.publishStatus();
        }
        catch {
            this.pear.client.stop();
            this.logMessage('[Pear/warn] Invalid global connection settings. Save valid settings in the Property Inspector.');
            this.configurationError = 'Saved connection settings are invalid.';
            this.publishStatus();
        }
    }

    @SDOnActionEvent('sendToPlugin')
    receivedPiMessage(event: SendToPluginEvent) {
        if (!isRecord(event.payload) || !['pear-get-status', 'pear-save-connection', 'pear-reauthorize'].includes(String(event.payload.type))) return;
        this.inspectors.set(event.context, event.action);
        try {
            if (event.payload.type === 'pear-save-connection') {
                this.pear.saveConnection(event.payload.configuration);
                this.configurationError = undefined;
            }
            if (event.payload.type === 'pear-reauthorize') this.pear.reauthorize();
            this.publishStatus();
        } catch (error) {
            this.publishStatus(error instanceof Error ? error.message : 'Could not update connection settings.');
        }
    }

    @SDOnActionEvent('propertyInspectorDidDisappear')
    inspectorClosed(event: WillDisappearEvent) { this.inspectors.delete(event.context); }

    @SDOnActionEvent('connectionClosed')
    hostClosed() { this.inspectors.clear(); this.pear.client.stop(); }

    // Stage 2 intentionally has no playback handlers. Old YTMD actions stay dormant in source.
    @SDOnActionEvent('willAppear')
    pendingAction(event: WillAppearEvent) {
        if (event.payload.controller === 'Encoder') this.setFeedback(event.context, {title: 'Actions pending'});
        else this.setTitle('Actions\npending', event.context);
    }

    @SDOnActionEvent('keyUp')
    pendingPress(event: KeyUpEvent) { this.showAlert(event.context); }

    private publishStatus(error?: string) {
        for (const [context, action] of this.inspectors) {
            this.sendToPropertyInspector({...this.pear.status(), error: error ?? this.configurationError}, action, context);
        }
    }
}

new PearPlugin();
