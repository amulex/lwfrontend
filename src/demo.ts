import { LiveWidgetService } from './lib/LiveWidgetService';
import { WidgetStorageType } from './lib/utils/Storage';
import { config } from './env';
import { ParticipantType, SessionParticipant, WidgetEnv, WidgetSelectors } from './lib/utils/Types';
import { DomHelper } from '@devlegal/shared-ts';
import { WidgetServiceMessageType } from './lib/AbstractLiveWidget';
import { SessionId } from './lib/openvidu/openvidu';

/**
 * This file demonstrates usage of more high-level LiveWidgetService.
 * There is more low-level LiveWidgetApi. Its demo is in demo_api.ts
 */
const run = async () => {
  const env: WidgetEnv = {
    backendUrl: config.env.host.backend,
    middlewareUrl: config.env.host.middleware,
    storageSettings: {
      type: WidgetStorageType.LOCAL_STORAGE,
    },
  };

  const selectors: WidgetSelectors = {
    streamsTargets: {
      publisher: '#publisher',
      subscriber: '#subscriber',
    },
    buttons: {
      toggleMic: 'button.mic.toggle',
      toggleCamera: 'button.toggle.video',
      toggleSound: 'button.sound.toggle',
    },
    chat: {
      input: '#chat textarea',
      button: '#chat button',
      messages: {
        container: '#chat .messages',
        template: '.widget-templates .chat-message',
      },
    },
    file: {
      input: '#chat input',
      messages: {
        container: '#chat .messages',
        template: '.widget-templates .file-message',
      },
    },
  };

  const service = new LiveWidgetService(env);

  try {
    await service.checkRequirements();
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

  clientButton.onclick = async () => {
    answerButton.hidden = true;
    consultantButton.hidden = true;
    clientButton.disabled = true;
    const clientMetadata = {
      name: 'Василий Алибабаевич',
      phone: '79998887766',
    };

    service.on(WidgetServiceMessageType.AFTER_INIT, () => {
      clientButton.hidden = true;
      callAudioButton.disabled = false;
      callButton.disabled = false;
    });

    await service.init(ParticipantType.Client, config.credentials.client, selectors, clientMetadata);

    if (!(await service.isCameraAvailable())) {
      callButton.remove();
    }

    service.on(WidgetServiceMessageType.CALLED, () => {
      callButton.disabled = true;
      callAudioButton.disabled = true;
      leaveButton.disabled = false;
      controls.forEach(c => (c.hidden = false));
    });

    service.on(WidgetServiceMessageType.FILE_RECEIVED, (file: File) => {
      console.log('file received', file);
    });

    service.on(WidgetServiceMessageType.MESSAGE_RECEIVED, (msg: string) => {
      console.log('msg received', msg);
    });

    callButton.onclick = async () => {
      await service.call();
    };

    callAudioButton.onclick = async () => {
      await service.call({ publishVideo: false });
    };
  };

  consultantButton.onclick = async () => {
    callButton.hidden = true;
    callAudioButton.hidden = true;
    clientButton.hidden = true;
    consultantButton.disabled = true;

    service.on(WidgetServiceMessageType.AFTER_INIT, () => {
      consultantButton.hidden = true;
    });

    await service.init(ParticipantType.Consultant, config.credentials.consultant, selectors);

    let incomingSessionId: SessionId = '';

    service.on(WidgetServiceMessageType.INCOMING_CALL, (session: SessionParticipant) => {
      answerButton.disabled = false;
      incomingSessionId = session.session.sessionId;
    });

    service.on(WidgetServiceMessageType.SOMEONE_LEFT, (session: SessionParticipant) => {
      answerButton.disabled = true;
      incomingSessionId = '';
    });

    service.on(WidgetServiceMessageType.JOINED_CALL, () => {
      leaveButton.disabled = false;
      answerButton.disabled = true;
      controls.forEach(c => (c.hidden = false));
    });

    service.on(WidgetServiceMessageType.FILE_RECEIVED, (file: File) => {
      console.log('file received', file);
    });

    service.on(WidgetServiceMessageType.MESSAGE_RECEIVED, (msg: string) => {
      console.log('msg received', msg);
    });

    answerButton.onclick = async () => {
      if (incomingSessionId) {
        await service.join(incomingSessionId);
      }
    };
  };

  service.on(WidgetServiceMessageType.LEFT_CALL, () => {
    leaveButton.disabled = true;
    answerButton.disabled = true;
    callAudioButton.disabled = false;
    callButton.disabled = false;
    controls.forEach(c => (c.hidden = true));
  });

  leaveButton.onclick = async () => {
    await service.leave();
  };
};

run();
