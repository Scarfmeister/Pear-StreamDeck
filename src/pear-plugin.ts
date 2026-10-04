import {DidReceiveGlobalSettingsEvent, SDOnActionEvent, SendToPluginEvent,
    StreamDeckPluginHandler, WillAppearEvent, WillDisappearEvent, KeyUpEvent, DidReceiveSettingsEvent,
    DialUpEvent, DialRotateEvent} from 'streamdeck-typescript';
import {isRecord} from './pear/config';
import {PearSession} from './streamdeck/pear-session';
import {PearKeyActions} from './actions/pear-key-actions';
import {PearDialActions} from './actions/pear-dial-actions';
import {SDOnTouchTap} from './streamdeck/touch-events';

class PearPlugin extends StreamDeckPluginHandler {
    readonly pear = new PearSession({saveGlobalSettings: settings => {
        this.settingsManager.cacheGlobalSettings(settings);
        this.setGlobalSettings(settings);
    }}, {log: (level, message) => this.logMessage(`[Pear/${level}] ${message}`)});
    private readonly keys = new PearKeyActions(this.pear.client, this);
    private readonly dials = new PearDialActions(this.pear.client, this);
    private readonly inspectors = new Map<string, string>();
    private configurationError?: string;

    constructor() {
        super();
        this.pear.client.subscribe(() => this.publishStatus());
        window.addEventListener('beforeunload', () => { this.keys.dispose(); this.dials.dispose(); this.pear.client.stop(); });
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
                this.sendToPropertyInspector({type: 'pear-connection-saved'}, event.action, event.context);
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
    hostClosed() { this.inspectors.clear(); this.keys.dispose(); this.dials.dispose(); this.pear.client.stop(); }

    @SDOnActionEvent('willAppear')
    actionAppeared(event: WillAppearEvent) {
        this.keys.disappear(event.context);
        this.dials.disappear(event.context);
        if (event.payload.controller === 'Encoder') this.dials.appear(event);
        else this.keys.appear(event);
    }

    @SDOnActionEvent('willDisappear')
    actionDisappeared(event: WillDisappearEvent) { this.keys.disappear(event.context); this.dials.disappear(event.context); }

    @SDOnActionEvent('didReceiveSettings')
    actionSettingsChanged(event: DidReceiveSettingsEvent) { this.keys.settings(event); this.dials.settings(event); }

    @SDOnActionEvent('keyUp')
    actionPressed(event: KeyUpEvent) { if (!this.dials.hasContext(event.context)) void this.keys.press(event); }

    @SDOnActionEvent('dialUp')
    dialPressed(event: DialUpEvent) { void this.dials.press(event); }

    @SDOnActionEvent('dialRotate')
    dialRotated(event: DialRotateEvent) { void this.dials.rotate(event); }

    @SDOnTouchTap
    dialTouched(event: unknown) { this.dials.touch(event); }

    saveDialSettings(context: string, settings: Record<string, unknown>): void {
        this.settingsManager.cacheContextSettings(context, settings);
        this.setSettings(settings, context);
    }

    playlistStatus(context: string, message: string): void {
        const action = this.inspectors.get(context);
        if (action) this.sendToPropertyInspector({type: 'pear-playlist-status', message}, action, context);
    }

    private publishStatus(error?: string) {
        for (const [context, action] of this.inspectors) {
            this.sendToPropertyInspector({...this.pear.status(), error: error ?? this.configurationError}, action, context);
        }
    }
}

new PearPlugin();
