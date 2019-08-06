import { ConnectOptions, FailedFetch, Fetch } from '@devlegal/shared-ts';
import { PublisherProperties } from 'openvidu-browser';
import { LiveWidgetApi } from './LiveWidgetApi';
import { SessionId, Profile } from '../..';
import { ClientSignals } from '../utils/CallSignals';
import { MetadataOptions } from '../utils/Metadata';
import { ViewSettings } from '../utils/Types';

/**
 * API for client of tenant that needs in consulting.
 *
 * ClientApi creates a new session to which can connect several consultants (answer the call).
 */
export class ClientApi extends LiveWidgetApi {
  /**
   * Use {@see createParticipant} to instantiate it.
   *
   * @hidden
   */
  constructor(
    protected authFetch: Fetch,
    protected profile: Profile,
    protected elements: ViewSettings,
    protected connectOptions: ConnectOptions,
    protected metadataOptions: MetadataOptions,
    protected signals: ClientSignals,
  ) {
    super(authFetch, profile, elements, connectOptions, metadataOptions, signals);
  }

  /**
   * Performs call from client and sends signal to consultants of same tenant about it, to they can serve this call.
   *
   * @throws OVPublisherError
   */
  public async call(customProperties: PublisherProperties = {}): Promise<SessionId> {
    try {
      await this.connect(this.connectOptions, customProperties);
      await this.signals.call(this.activeSession!);
      return this.activeSession!.sessionId;
    } catch (error) {
      if (error instanceof FailedFetch && error.response.status === 400) {
        const errorData = await error.response.json();
        console.error(`LiveWidget error: ${errorData.error}`);
      }
      throw error;
    }
  }

  public callAudio(): Promise<SessionId> {
    return this.call({ videoSource: false });
  }
}
