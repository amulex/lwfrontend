import { DomHelper, Fetch } from '@devlegal/shared-ts';
import {
  ClientMetadata,
  Media,
  ParticipantType,
  SessionParticipant,
  Stream,
  ViewSettings,
  WidgetEnv,
  WidgetSelectors,
  WidgetServicePublisherProperties,
} from './utils/Types';
import { MetadataOptions, ParticipantMetadata } from './utils/Metadata';
import { PlayerAction } from './ui/buttons/player';
import { CommonHelper } from './utils/CommonHelper';
import { LiveWidgetApi } from './api/LiveWidgetApi';
import { Backend, Credentials, Tenant } from './utils/Backend';
import { SessionId } from './openvidu/openvidu';
import { ConsultantApi } from './api/ConsultantApi';
import { ClientApi } from './api/ClientApi';
import { AbstractLiveWidget, MessageHandlerMap, WidgetServiceMessageType } from './AbstractLiveWidget';
import { Auth } from './utils/Auth';

export class LiveWidgetService extends AbstractLiveWidget {
  // | null type is because specific of vue-class-component. ? fields are not reactive...
  private _clientMetadata: ClientMetadata | null = null;
  private _incomingCalls: Map<string, SessionParticipant> = new Map();
  private _api: LiveWidgetApi | null = null;
  private _participants: ParticipantMetadata[] = [];

  constructor(settings: WidgetEnv) {
    super(settings);
  }

  public get sessionId(): SessionId | undefined {
    if (this._api) {
      return this._api.sessionId;
    }
  }

  public get hasActiveSession(): boolean {
    return this._api ? this._api.hasActiveSession : false;
  }

  public get tenant(): Tenant | undefined {
    return this._api ? this._api.tenant : undefined;
  }

  public get hasConnection(): boolean {
    return this._api !== null;
  }

  public get participants(): ParticipantMetadata[] {
    return this._participants;
  }

  public async join(sessionId: string): Promise<void> {
    if (this.isConsultantApi(this._api)) {
      const participant = this._incomingCalls.get(sessionId);
      if (participant) {
        this.emit(WidgetServiceMessageType.JOINING_CALL, participant);
        this._incomingCalls.delete(sessionId);
        await this._api.answer(sessionId);
        this.emit(WidgetServiceMessageType.JOINED_CALL, participant);
        return;
      }
    }
    throw new Error('JoinCall method available only for Consultant participant type');
  }

  public async leave(): Promise<void> {
    if (this._api) {
      this.emit(WidgetServiceMessageType.LEAVING_CALL, this.sessionId);
      this._participants = [];
      await this._api.leave();
      this.emit(WidgetServiceMessageType.LEFT_CALL, this.sessionId);
    }
  }

  public async call(properties: WidgetServicePublisherProperties = {}): Promise<void> {
    if (this.isClientApi(this._api)) {
      this.emit(WidgetServiceMessageType.CALLING);
      await this._api.call(properties);
      this.emit(WidgetServiceMessageType.CALLED, this.sessionId);
      return;
    }
    throw new Error('Call method available only for Client participant type');
  }

  public async init(
    type: ParticipantType,
    credentials: Credentials,
    selectors: WidgetSelectors,
    clientMetadata?: ClientMetadata,
  ): Promise<void>;
  public async init(
    type: ParticipantType,
    authFetch: Fetch,
    selectors: WidgetSelectors,
    clientMetadata?: ClientMetadata,
  ): Promise<void>;
  public async init(
    type: ParticipantType,
    accessProvider: Fetch | Credentials,
    selectors: WidgetSelectors,
    clientMetadata?: ClientMetadata,
  ): Promise<void> {
    const authFetch = accessProvider instanceof Function ? accessProvider : await Auth.createAuthFetch(accessProvider);

    if (clientMetadata) {
      this._clientMetadata = clientMetadata;
    }
    this._profile = await Backend.fetchProfile(authFetch);
    this._api =
      type === ParticipantType.Consultant
        ? await this.initConsultantApi(authFetch, selectors)
        : await this.initClientApi(authFetch, selectors);
    await this._api!.onParticipantLeft('all', (metadata: ParticipantMetadata) => {
      this.emit(WidgetServiceMessageType.PARTICIPANT_LEFT, metadata);
    });
    this.emit(WidgetServiceMessageType.AFTER_INIT);
  }

  public async disconnect(): Promise<void> {
    if (this._api) {
      this._api.disconnect();
    }
  }

  public async canSwitchPublisherVideo(): Promise<boolean> {
    if (!this.profile) {
      return false;
    }
    return this.profile.settings.buttons.custom.publisher.video === true && (await this.isCameraAvailable());
  }

  public async canSwitchSubscriberVideo(): Promise<boolean> {
    if (!this.profile) {
      return false;
    }
    return this.profile.settings.buttons.custom.subscriber.video === true;
  }

  public async canPublishVideo(): Promise<boolean> {
    if (!this.profile) {
      return false;
    }
    return this.profile.settings.streams.publisher.videoSource !== false && (await this.isCameraAvailable());
  }

  public async canSwitchPublisherAudio(): Promise<boolean> {
    if (!this.profile) {
      return false;
    }
    return this.profile.settings.buttons.custom.publisher.audio === true && (await this.isMicrophoneAvailable());
  }

  public async canSwitchSubscriberAudio(): Promise<boolean> {
    if (!this.profile) {
      return false;
    }
    return this.profile.settings.buttons.custom.subscriber.audio === true;
  }

  public async canPublishAudio(): Promise<boolean> {
    if (!this.profile) {
      return false;
    }
    return this.profile.settings.streams.publisher.audioSource !== false && (await this.isMicrophoneAvailable());
  }

  public canSendFiles(): boolean {
    if (!this.profile) {
      return false;
    }
    return this.profile.settings.chat.file === true;
  }

  public canSendMessages(): boolean {
    if (!this.profile) {
      return false;
    }
    return this.profile.settings.chat.text === true;
  }

  public canUseChat(): boolean {
    return this.canSendFiles() || this.canSendMessages();
  }

  public async isCameraAvailable(): Promise<boolean> {
    return this._api !== null && (await this._api.isCameraAvailable());
  }

  public async isMicrophoneAvailable(): Promise<boolean> {
    return this._api !== null && (await this._api.isMicrophoneAvailable());
  }

  public isConsultant(): boolean {
    return this.isConsultantApi(this._api);
  }

  public isClient(): boolean {
    return this.isClientApi(this._api);
  }

  public on<K extends WidgetServiceMessageType>(messageType: K, handler: MessageHandlerMap[K]): string {
    return this._on(messageType, handler);
  }

  private isConsultantApi(api: LiveWidgetApi | null): api is ConsultantApi {
    return api instanceof ConsultantApi;
  }

  private isClientApi(api: LiveWidgetApi | null): api is ClientApi {
    return api instanceof ClientApi;
  }

  private async initConsultantApi(authFetch: Fetch, selectors: WidgetSelectors): Promise<ConsultantApi> {
    const api = await this._lwFactory.createParticipant(
      ParticipantType.Consultant,
      authFetch,
      this.getViewSettings(selectors),
      this.metadata,
    );
    if (api) {
      await api.onIncomingCall((participant: SessionParticipant) => {
        this._incomingCalls.set(participant.session.sessionId, participant);
        this.emit(WidgetServiceMessageType.INCOMING_CALL, participant);
      });
      await api.onLeftCall((participant: SessionParticipant) => {
        this._incomingCalls.delete(participant.session.sessionId);
        this._participants = this._participants.filter(
          p => p.system.profile.email !== participant.participant.system.profile.email,
        );
        this.emit(WidgetServiceMessageType.SOMEONE_LEFT, participant);
      });
      await api.onAnsweredCall((participant: SessionParticipant) => {
        this._incomingCalls.delete(participant.session.sessionId);
        this._participants = this._participants.filter(
          p => p.system.profile.email !== participant.participant.system.profile.email,
        );
        this.emit(WidgetServiceMessageType.SOMEONE_LEFT, participant);
      });
      return api;
    } else {
      throw new Error('Unable to create Consultant API');
    }
  }

  private async initClientApi(authFetch: Fetch, selectors: WidgetSelectors): Promise<ClientApi> {
    const api = await this._lwFactory.createParticipant(
      ParticipantType.Client,
      authFetch,
      this.getViewSettings(selectors),
      this.metadata,
    );
    if (api) {
      return api;
    } else {
      throw new Error('Unable to create Client API');
    }
  }

  private onParticipantJoined(md: ParticipantMetadata, connection: any) {
    this._participants.push(md);
    this.emit(WidgetServiceMessageType.PARTICIPANT_JOINED, md);
  }

  private onMessageReceived(text: string, time: Date) {
    this.emit(WidgetServiceMessageType.MESSAGE_RECEIVED, text);
  }

  private onFileReceived(file: File, time: Date) {
    this.emit(WidgetServiceMessageType.FILE_RECEIVED, file);
  }

  private onMessageSent(text: string) {
    this.emit(WidgetServiceMessageType.MESSAGE_SENT, text);
  }

  private onFileSent(file: File) {
    this.emit(WidgetServiceMessageType.FILE_SENT, file);
  }

  private onVideoCreated(ev: any) {
    this.emit(WidgetServiceMessageType.VIDEO_ELEMENT_CREATED, ev);
  }

  private onVideoDestroyed(ev: any) {
    this.emit(WidgetServiceMessageType.VIDEO_ELEMENT_DESTROYED, ev);
  }

  private getViewSettings(selectors: WidgetSelectors): ViewSettings {
    const settings: ViewSettings = {
      streamsTargets: {
        publisher: DomHelper.query(selectors.streamsTargets.publisher),
        subscriber: DomHelper.query(selectors.streamsTargets.subscriber),
      },
      handleTargets: {
        created: this.onVideoCreated.bind(this),
        destroyed: this.onVideoDestroyed.bind(this),
      },
      buttons: [],
      chat: {},
    };

    if (selectors.buttons) {
      if (selectors.buttons.toggleMic) {
        settings.buttons!.push({
          elements: () => DomHelper.queryAll(selectors.buttons!.toggleMic!),
          streams: [Stream.Publisher],
          media: [Media.Audio],
          action: PlayerAction.Toggle,
        });
      }

      if (selectors.buttons.toggleCamera) {
        settings.buttons!.push({
          elements: () => DomHelper.queryAll(selectors.buttons!.toggleCamera!),
          streams: [Stream.Publisher],
          media: [Media.Video],
          action: PlayerAction.Toggle,
        });
      }

      if (selectors.buttons.toggleSound) {
        settings.buttons!.push({
          elements: () => DomHelper.queryAll(selectors.buttons!.toggleSound!),
          streams: [Stream.Subscriber],
          media: [Media.Audio],
          action: PlayerAction.Toggle,
        });
      }
    }

    if (selectors.chat) {
      settings.chat!.text = {
        input: DomHelper.query(selectors.chat.input) as HTMLTextAreaElement,
        button: DomHelper.query(selectors.chat.button),
        messages: {
          container: DomHelper.query(selectors.chat.messages.container),
          messageTemplate: DomHelper.query(selectors.chat.messages.template),
          formatTime: (time: Date) =>
            `${CommonHelper.padLeft(time.getHours(), 2)}:${CommonHelper.padLeft(time.getMinutes(), 2)}`,
          onReceived: this.onMessageReceived.bind(this),
          onSent: this.onMessageSent.bind(this),
        },
      };
    }

    if (selectors.file) {
      settings.chat!.file = {
        input: DomHelper.query(selectors.file.input) as HTMLInputElement,
        messages: {
          container: DomHelper.query(selectors.file.messages.container),
          messageTemplate: DomHelper.query(selectors.file.messages.template),
          formatTime: (time: Date) =>
            `${CommonHelper.padLeft(time.getHours(), 2)}:${CommonHelper.padLeft(time.getMinutes(), 2)}`,
          formatText: (file: File) => `Download ${file.name}`,
          onReceived: this.onFileReceived.bind(this),
          onSent: this.onFileSent.bind(this),
        },
      };
    }

    return settings;
  }

  private get metadata(): MetadataOptions {
    return {
      data: this._clientMetadata ? this._clientMetadata : undefined,
      handle: this.onParticipantJoined.bind(this),
    };
  }
}
