import { assert, ConnectOptions, Fetch, shallowMerge } from '@devlegal/shared-ts';
import { config, Env, WidgetStorageType } from '../config';
import { ClientApi } from './api/ClientApi';
import { ConsultantApi } from './api/ConsultantApi';
import { openviduGlobal } from './openvidu/openvidu';
import { ClientSignals, ConsultantSignals } from './utils/CallSignals';
import {
  MediaDevicesNotFoundError,
  OpenviduNotSupportedError,
  ParticipantMap,
  ParticipantType,
  ViewSettings,
} from './utils/Types';
import { MetadataBuilder, MetadataOptions } from './utils/Metadata';
import { Auth } from './utils/Auth';
import { Backend, Credentials, Profile } from './utils/Backend';
import { CommonHelper } from './utils/CommonHelper';
import { MediaDevicesChecker } from './utils/MediaDevicesChecker';
import { CookiesStorage, LocalStorage } from './utils/Storage';

export class LiveWidgetFactory {
  private mediaDevicesChecker: MediaDevicesChecker;
  private metadataBuilder: MetadataBuilder;

  constructor(private env: Env) {
    config.init(env);
    this.mediaDevicesChecker = new MediaDevicesChecker();
    const storage =
      env.storage.type === WidgetStorageType.COOKIES ? new CookiesStorage(env.storage.expires) : new LocalStorage();
    this.metadataBuilder = new MetadataBuilder(storage);
  }

  /**
   * Checks requirements for LiveWidget:
   * 1) Openvidu support
   * 2) Presence of at least one media device
   *
   * @returns {Promise<void>}
   * @throws MediaDevicesNotFoundError | OpenviduNotSupportedError
   */
  public async checkRequirements(): Promise<void> {
    if (openviduGlobal.checkSystemRequirements() !== 1) {
      throw new OpenviduNotSupportedError("OpenVidu isn't supported. LiveWidget will not work...");
    }

    const isDevicesAvailable = await this.mediaDevicesChecker.isMediaDevicesAvailable();
    if (!isDevicesAvailable) {
      throw new MediaDevicesNotFoundError('Unable to find media devices. LiveWidget will not work...');
    }
  }

  /**
   * Default entry point function, for advanced cases use combination of API functions/classes.
   */
  public async defaultInit<K extends ParticipantType>(
    type: K,
    credentials: Credentials,
    elements: ViewSettings,
    metadataOptions: MetadataOptions = {},
  ): Promise<ParticipantMap[K]> {
    const fetch = await Auth.createAuthFetch(credentials);
    return this.createParticipant(type, fetch, elements, metadataOptions);
  }

  public async createParticipant<K extends ParticipantType>(
    type: K,
    authFetch: Fetch,
    elements: ViewSettings,
    metadataOptions: MetadataOptions = {},
  ): Promise<ParticipantMap[K]> {
    const profile = await Backend.fetchProfile(authFetch);
    assert(
      type !== ParticipantType.Consultant || CommonHelper.isConsultantRole(profile.role.role),
      `Consultant must have role ROLE_CONSULTANT, but ${profile.role.role} given`,
    );

    const metadata = this.metadataBuilder.create(metadataOptions, type, profile);
    const connectOptions: ConnectOptions = shallowMerge(profile.settings.init, {
      token: {
        data: JSON.stringify(metadata),
      },
    });

    const signalsCtor = type === ParticipantType.Consultant ? ConsultantSignals : ClientSignals;
    const participantCtor = type === ParticipantType.Consultant ? ConsultantApi : ClientApi;

    const signals = new signalsCtor(authFetch, metadata);
    await signals.init();

    return new participantCtor(
      authFetch,
      profile,
      elements,
      connectOptions,
      metadataOptions,
      this.mediaDevicesChecker,
      signals as ConsultantSignals & ClientSignals,
    );
  }

  public async createConsultantSignals(
    profile: Profile,
    authFetch: Fetch,
    options: MetadataOptions = {},
  ): Promise<ConsultantSignals> {
    const metadata = this.metadataBuilder.create(options, ParticipantType.Consultant, profile);
    return new ConsultantSignals(authFetch, metadata);
  }
}
