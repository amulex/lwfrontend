import {CallSignals} from '../utils/CallSignals';
import {combineProcedures, ConnectOptions, Fetch, getProp, log, noop, shallowMerge, size} from '@devlegal/shared-ts';
import {ConnectToSessionFactory, HandleVideoElementEvent} from '../openvidu/openvidu';
import {
    Connection,
    Publisher,
    PublisherProperties,
    Session,
    StreamEvent, StreamManager,
    Subscriber, VideoElementEvent,
} from 'openvidu-browser';
import { Backend, Profile, Tenant } from '../utils/Backend';
import { ParticipantType, ViewSettings } from '../utils/Types';
import { HandleMetadata, MetadataHelper, MetadataOptions } from '../utils/Metadata';
import {BindTransportAgentsFactory, TransportAgentsFactory} from "../utils/transports/transports";
import {AddButtonsFactory} from "../ui/buttons/buttons";
import {MediaDevicesChecker} from "../utils/MediaDevicesChecker";

export class LiveWidgetApi {
  protected activePublisher?: Publisher;

  private participantLeftHandlers: Array<{ type: ParticipantType | 'all'; handle: HandleMetadata }> = [];

  protected constructor(
    protected authFetch: Fetch,
    protected profile: Profile,
    protected elements: ViewSettings,
    protected connectOptions: ConnectOptions,
    protected metadataOptions: MetadataOptions,
    protected mediaDevicesChecker: MediaDevicesChecker,
    protected signals: CallSignals,
    private aWindow: Window = window,
  ) {
    aWindow.addEventListener('unload', () => this.disconnect());
  }

  public async isCameraAvailable(): Promise<boolean> {
    return this.mediaDevicesChecker.isCameraAvailable();
  }

  public async isMicrophoneAvailable(): Promise<boolean> {
    return this.mediaDevicesChecker.isMicrophoneAvailable();
  }

  public onParticipantLeft(type: ParticipantType | 'all', handle: HandleMetadata) {
    this.participantLeftHandlers.push({ type, handle });
  }

  public async disconnect(): Promise<void> {
    await this.leave();
    return this.signals.disconnect();
  }

  public async leave(): Promise<void> {
    if (this.activeSession) {
      await this.signals.leave(this.activeSession);
      await this.activeSession.unpublish(this.activePublisher!);
      await this.activeSession.disconnect();
      this.activePublisher = undefined;
    }
  }

  public get sessionId(): string | undefined {
    return this.activeSession ? this.activeSession.sessionId : undefined;
  }

  public get hasActiveSession(): boolean {
    return this.sessionId !== undefined;
  }

  public get tenant(): Tenant | undefined {
    return this.signals.tenant;
  }

  protected async connect(
    connectOptions: ConnectOptions = this.connectOptions,
    publisherProperties?: PublisherProperties,
  ): Promise<void> {
    this.activePublisher = await this.connectAllToAll(connectOptions, publisherProperties);
    if (!this.activeSession) {
      throw new Error('Error creating Openvidu session');
    }

    const handleParticipantLeft = (connection: Connection) => {
      this.participantLeftHandlers.forEach(handler => {
        const metadata = MetadataHelper.get(connection);
        if (handler.type === 'all' || metadata.system.type === handler.type) {
          // prevent sending to oneself
          if (metadata.system.profile.email !== this.profile.email) {
            handler.handle(metadata, connection);
          }
        }
      });
    };

    this.activeSession.on('sessionDisconnected', event => handleParticipantLeft((event.target as Session).connection));
    this.activeSession.on('streamDestroyed', event => handleParticipantLeft((event as StreamEvent).stream.connection));
  }

  protected get activeSession(): Session | undefined {
    return this.activePublisher ? this.activePublisher.session : undefined;
  }

  private async connectAllToAll(connectOptions: ConnectOptions, customProperties: PublisherProperties = {}) {
    const handleMetadata = this.handleMetadataFactory(this.metadataOptions, this.authFetch);
    const addButtons = AddButtonsFactory.create(this.profile.settings.buttons, this.elements.buttons || []);

    const handleVideoCreated = combineProcedures(
      handleMetadata,
      addButtons,
      getProp(this.elements.handleTargets, 'created') || noop,
    );
    const handleVideoDestroyed = getProp(this.elements.handleTargets, 'destroyed') || noop;

    const handleVideoCreating = (streamManager: StreamManager): void => {
      streamManager.on('videoElementCreated', async event => {
        // For some reason exceptions will be absorbed here
        try {
          await handleVideoCreated(event as VideoElementEvent);
        } catch (error) {
          log('Error in videoCreated:', error);
        }
      });
      streamManager.on('videoElementDestroyed', async event => {
        // For some reason exceptions will be absorbed here
        try {
          await handleVideoDestroyed(event as VideoElementEvent);
        } catch (error) {
          log('Error in videoDestroyed:', error);
        }
      });
    };
    const onStreamCreated = (session: Session): void => {
      session.on('streamCreated', async event => {
        if (size(session.remoteConnections) + 1 >= this.profile.settings.init.maxParticipants) {
          // Session has not .connection.stream yet, but it is necessary for signalParticipant
          session.connection.stream = (event as StreamEvent).stream;
          await this.signals.maxParticipants(session);
        }

        const subscriber = session.subscribe(
          (event as StreamEvent).stream,
          this.elements.streamsTargets.subscriber,
          this.profile.settings.streams.subscriber,
        );
        handleVideoCreating(subscriber);
      });
    };

    const agents = TransportAgentsFactory.create(this.profile.settings.chat, this.elements.chat);
    const bindTransportAgents = BindTransportAgentsFactory.create(this.authFetch, ...agents);
    const connector = ConnectToSessionFactory.create(this.authFetch);
    const beforeConnect = combineProcedures(bindTransportAgents, onStreamCreated);
    const openviduSession = await connector(beforeConnect)(connectOptions);

    if ( ! (await this.isCameraAvailable())) {
      customProperties.videoSource = false;
    }
    if ( ! (await this.isMicrophoneAvailable())) {
      customProperties.audioSource = false;
    }

    const properties = shallowMerge(this.profile.settings.streams.publisher, customProperties);
    const publisher = await openviduSession.openvidu.initPublisherAsync(
      this.elements.streamsTargets.publisher,
      properties,
    );
    handleVideoCreating(publisher);
    await openviduSession.publish(publisher);
    log('Published media', properties, publisher);

    return publisher;
  }

  private handleMetadataFactory(options: MetadataOptions, fetch: Fetch): HandleVideoElementEvent {
    return async event => {
      const streamManager = event.target;
      if (streamManager instanceof Subscriber) {
        const handle = options.handle || noop;
        const data = MetadataHelper.get(streamManager.stream.connection);
        const userInfo = await Backend.fetchUserInfo(fetch, data.system.profile.email);
        data.system.profile.avatar = userInfo.avatar;
        return handle(data, streamManager.stream.connection);
      }
    };
  }
}
