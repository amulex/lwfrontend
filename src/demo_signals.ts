import { WidgetStorageType } from './lib/utils/Storage';
import { config } from './env';
import { SessionParticipant, WidgetEnv } from './lib/utils/Types';
import { DomHelper } from '@devlegal/shared-ts';
import { SessionId } from './lib/openvidu/openvidu';
import {LiveWidgetSignals} from "./lib/LiveWidgetSignals";

/**
 * This file demonstrates usage of LiveWidgetSignals.
 * It can be used when you (as consultant) don't have controls for communication in current page
 * and just want to listen incoming calls
 */
const run = async () => {
    const env: WidgetEnv = {
        backendUrl: config.env.host.backend,
        middlewareUrl: config.env.host.middleware,
        storage: {
            type: WidgetStorageType.LOCAL_STORAGE,
        },
    };

    const signals = new LiveWidgetSignals(env);

    try {
        await signals.checkRequirements();
    } catch (e) {
        alert(e.message);
        return;
    }

    const clientButton = DomHelper.query('#client') as HTMLButtonElement;
    const consultantButton = DomHelper.query('#consultant') as HTMLButtonElement;
    const callButton = DomHelper.query('#call') as HTMLButtonElement;
    const callAudioButton = DomHelper.query('#call-audio') as HTMLButtonElement;
    const answerButton = DomHelper.query('#answer') as HTMLButtonElement;
    const leaveButton = DomHelper.query('#leave') as HTMLButtonElement;
    const controls = DomHelper.queryAll('.communication-controls') as HTMLElement[];
    controls.forEach(c => (c.hidden = true));
    clientButton.hidden = true;
    callButton.hidden = true;
    callAudioButton.hidden = true;
    leaveButton.hidden = true;

    consultantButton.onclick = async () => {
        consultantButton.disabled = true;

        await signals.init(config.credentials.consultant);

        let incomingSessionId: SessionId = '';

        signals.onIncomingCall((session: SessionParticipant) => {
            answerButton.disabled = false;
            incomingSessionId = session.session.sessionId;
        });

        signals.onIncomingCallCancelled((session: SessionParticipant) => {
            answerButton.disabled = true;
            incomingSessionId = '';
        });

        answerButton.onclick = async () => {
            if (incomingSessionId) {
                alert(`answering ${incomingSessionId}`);
            }
        };
    };
};

run();
