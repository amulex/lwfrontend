import { assert, ConnectOptions, Fetch, shallowMerge } from '@devlegal/shared-ts';
import { config, Env } from '../config';
import { ClientApi } from './api/ClientApi';
import { ConsultantApi } from './api/ConsultantApi';
import { openviduGlobal } from './openvidu/openvidu';
import { ClientSignals, ConsultantSignals } from './utils/CallSignals';
import { ParticipantMap, ParticipantType, ViewSettings } from './utils/Types';
import { MetadataHelper, MetadataOptions } from './utils/Metadata';
import { Auth } from './utils/Auth';
import { Backend, Credentials, Profile } from './utils/Backend';
import { CommonHelper } from './utils/CommonHelper';

export class LiveWidget {
  constructor(private env: Env) {
    config.init(env);
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
    assert(openviduGlobal.checkSystemRequirements() === 1, "OpenVidu isn't supported");
    assert(
      type !== ParticipantType.Consultant || CommonHelper.isConsultantRole(profile.role.role),
      `Consultant must have role ROLE_CONSULTANT, but ${profile.role.role} given`,
    );

    const metadata = MetadataHelper.create(metadataOptions, type, profile);
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
      signals as ConsultantSignals & ClientSignals,
    );
  }

  public async createConsultantSignals(
    profile: Profile,
    authFetch: Fetch,
    options: MetadataOptions = {},
  ): Promise<ConsultantSignals> {
    const metadata = MetadataHelper.create(options, ParticipantType.Consultant, profile);
    return new ConsultantSignals(authFetch, metadata);
  }
}
