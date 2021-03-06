import { Connection, OpenViduError, StreamManager, VideoElementEvent } from 'openvidu-browser';
import { assert, log, DomHelper } from '@devlegal/shared-ts';
import { config } from './env';
import { PlayerAction } from './lib/ui/buttons/player';
import { Media, ParticipantType, SessionParticipant, Stream } from './lib/utils/Types';
import { ParticipantMetadata } from './lib/utils/Metadata';
import { ClientApi } from './lib/api/ClientApi';
import { ConsultantApi } from './lib/api/ConsultantApi';
import { LiveWidgetFactory } from './lib/LiveWidgetFactory';
import { CommonHelper } from './lib/utils/CommonHelper';

/**
 * This file demonstrates usage of more low-level LiveWidget api (Client and Consultant)
 * Now there is more high-level (and usable) LiveWidgetService. Its demo is in demo.ts
 */
const run = async () => {
  const elements = {
    streamsTargets: {
      publisher: 'publisher',
      subscriber: 'subscriber',
    },
    handleTargets: {
      created: (ev: VideoElementEvent) => {
        console.log(ev);
      },
      destroyed: (ev: VideoElementEvent) => {
        console.log(ev);
      },
    },
    buttons: [
      {
        elements: (event: VideoElementEvent) => {
          const element = DomHelper.clone(DomHelper.query('.widget-templates button.video.toggle'));
          const manager = <StreamManager>event.target;
          const stream = CommonHelper.getStream(manager);
          const container = DomHelper.query(`#${stream}`);
          const old = container.querySelectorAll(`.widget-templates button.video.toggle`);
          if (old.length > 0) {
            old.forEach(el => container.removeChild(el));
          }
          container.appendChild(element);
          return [element];
        },
        streams: [Stream.Publisher, Stream.Subscriber],
        media: [Media.Video],
        action: PlayerAction.Toggle,
      },
      {
        elements: (event: VideoElementEvent) => {
          return DomHelper.queryAll('button.mic.toggle');
        },
        streams: [Stream.Publisher],
        media: [Media.Audio],
        action: PlayerAction.Toggle,
      },
      {
        elements: (event: VideoElementEvent) => {
          return DomHelper.queryAll('button.sound.toggle');
        },
        streams: [Stream.Subscriber],
        media: [Media.Audio],
        action: PlayerAction.Toggle,
      },
    ],
    chat: {
      text: {
        input: DomHelper.query('#chat textarea') as HTMLTextAreaElement,
        button: DomHelper.query('#chat button'),
        messages: {
          container: DomHelper.query('#chat .messages'),
          messageTemplate: DomHelper.query('.widget-templates .chat-message'),
          formatTime: (time: Date) => time.toISOString(),
          onReceived: (text: string, time: Date) => {
            console.log('RECEIVED MESSAGE', text, time);
          },
          onSent: (text: string) => {
            console.log('SEND MESSAGE', text);
          },
        },
      },
      file: {
        input: DomHelper.query('#chat input[type=file]') as HTMLInputElement,
        messages: {
          container: DomHelper.query('#chat .messages'),
          messageTemplate: DomHelper.query('.widget-templates .file-message'),
          formatTime: (time: Date) => time.toISOString(),
          formatText: (file: File) => `Download ${file.name}`,
          onReceived: (file: File, time: Date) => {
            console.log('RECEIVED FILE', file, time);
          },
          onSent: (file: File) => {
            console.log('SEND FILE', file);
          },
        },
      },
    },
  };

  const metadata = {
    data: {
      text: 'Metadata sample',
      now: new Date(),
    },
    handle: (md: ParticipantMetadata, conn: Connection) => log('Handle metadata:', md, conn),
  };

  const lw: LiveWidgetFactory = new LiveWidgetFactory(config.env);
  try {
    await lw.checkRequirements();
  } catch (e) {
    alert(e.message);
    return;
  }

  let clientApi: ClientApi;
  let consultantApi: ConsultantApi;
  const clientButton = <HTMLButtonElement>DomHelper.query('#client');
  const consultantButton = <HTMLButtonElement>DomHelper.query('#consultant');
  const callButton = <HTMLButtonElement>DomHelper.query('#call');
  const callAudioButton = <HTMLButtonElement>DomHelper.query('#call-audio');
  const answerButton = <HTMLButtonElement>DomHelper.query('#answer');
  const leaveButton = <HTMLButtonElement>DomHelper.query('#leave');

  consultantButton.onclick = async () => {
    consultantButton.disabled = true;
    clientButton.disabled = true;

    consultantApi = await lw.defaultInit(ParticipantType.Consultant, config.credentials.consultant, elements, metadata);
    await consultantApi.onIncomingCall(async (metadata: SessionParticipant, answer: any) => {
      answerButton.disabled = false;
      answerButton.onclick = async () => {
        answerButton.disabled = true;
        try {
          await answer();
        } catch (openviduError) {
          assert(openviduError instanceof OpenViduError);
          log('Consultant call error!', openviduError);
        }
        leaveButton.disabled = false;
      };
    });

    if ((await consultantApi.isCameraAvailable()) === false) {
      callButton.disabled = true;
    }

    await consultantApi.onFirstMaxParticipants((metadata: any) => {
      log('max', metadata);
      answerButton.disabled = true;
    });

    await consultantApi.onLeftCall((metadata: any) => {
      log('cancel', metadata);
      answerButton.disabled = true;
    });

    await consultantApi.onParticipantLeft('all', (metadata: ParticipantMetadata, c: Connection) => {
      consultantApi.leave();
      leaveButton.disabled = true;
    });

    await consultantApi.onAnsweredCall((metadata: any) => log('answer', metadata));
  };

  clientButton.onclick = async () => {
    clientButton.disabled = true;
    consultantButton.disabled = true;

    clientApi = await lw.defaultInit(ParticipantType.Client, config.credentials.client, elements, metadata);
    callButton.disabled = false;
    callAudioButton.disabled = false;

    clientApi.onParticipantLeft('all', (metadata: ParticipantMetadata, c: Connection) => {
      console.log('Participant left...', metadata);
      clientApi.leave();
      leaveButton.disabled = true;
      callButton.disabled = false;
    });

    callButton.onclick = async () => {
      callButton.disabled = true;
      callAudioButton.disabled = true;
      try {
        await clientApi.call();
      } catch (openviduError) {
        assert(openviduError instanceof OpenViduError);
        log('Client call error!', openviduError);
      }

      leaveButton.disabled = false;
    };

    callAudioButton.onclick = async () => {
      callButton.disabled = true;
      callAudioButton.disabled = true;
      await clientApi.callAudio();
      leaveButton.disabled = false;
    };
  };

  leaveButton.onclick = async () => {
    callButton.disabled = false;
    leaveButton.disabled = true;
    if (clientApi) {
      await clientApi.leave();
    }
    if (consultantApi) {
      await consultantApi.leave();
    }
  };
};

run();
