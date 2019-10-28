import { OpenViduTargetElement } from '../openvidu/openvidu';
import { ConsultantApi } from '../api/ConsultantApi';
import { ClientApi } from '../api/ClientApi';
import { ParticipantMetadata } from './Metadata';
import { CustomizableSessionOpts, DeepReadonly } from '@devlegal/shared-ts';
import { ButtonConfig, ButtonsPermissions } from '../ui/buttons/buttons';
import { HandleVideoElementEvent } from '../openvidu/openvidu';
import { ChatView, FileView } from '../ui/chat';
import { StreamsTargets } from './Types';

export enum Stream {
  Publisher = 'publisher',
  Subscriber = 'subscriber',
}
export enum Media {
  Video = 'video',
  Audio = 'audio',
}

export type StreamsTargets = {
  [K in Stream]: OpenViduTargetElement;
};

export enum ParticipantType {
  Client = 'client',
  Consultant = 'consultant',
}

export type ParticipantMap = {
  client: ClientApi;
  consultant: ConsultantApi;
};

/**
 * Repeats structure of {@see Session}.
 */
export type SessionInfo = DeepReadonly<{
  sessionId: string;
  connection: {
    stream: {
      hasAudio: boolean;
      hasVideo: boolean;
    };
  };
}>;

export type SessionParticipant = DeepReadonly<{
  session: SessionInfo;
  participant: ParticipantMetadata;
}>;

export type Settings = DeepReadonly<{
  streams: StreamsProperties;
  buttons: ButtonsPermissions;
  chat: {
    text?: boolean;
    file?: boolean;
  };
  init: {
    session: CustomizableSessionOpts;
    record?: boolean;
    maxParticipants: number;
  };
}>;

export type ViewSettings = {
  streamsTargets: StreamsTargets;
  handleTargets?: {
    created?: HandleVideoElementEvent;
    destroyed?: HandleVideoElementEvent;
  };
  buttons?: ButtonConfig[];
  chat?: {
    text?: ChatView;
    file?: FileView;
  };
};

type StreamsProperties = DeepReadonly<{
  publisher: Partial<{
    frameRate: number;
    mirror: boolean;
    resolution: string;
    audioSource: false;
    videoSource: false;
  }>;
}>;

export class MediaDevicesNotFoundError extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, MediaDevicesNotFoundError.prototype);
    }
}

export class OpenviduNotSupportedError extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, OpenviduNotSupportedError.prototype);
    }
}