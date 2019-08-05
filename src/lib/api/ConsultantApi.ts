import { ConnectOptions, FailedFetch, Fetch, MaybePromiseVoid, shallowMerge } from '@devlegal/shared-ts';
import { LiveWidgetApi } from './LiveWidgetApi';
import { SessionId } from '../..';
import { ConsultantSignals } from '../utils/CallSignals';
import { Profile } from '../..';
import { SessionParticipant, ViewSettings } from '../..';
import { MetadataOptions } from '../..';

/**
 * Callback, calling of which will produce answer to the call.
 */
type AnswerCallback =
  /**
   * @return session API can be used for various things, for disconnect, for example
   * @throws OVPublisherError
   */
  () => Promise<SessionId>;

/**
 * API for consultant that consults clients of tenant.
 *
 * ConsultantApi connects to existing session, created by client, when answers its call.
 */
export class ConsultantApi extends LiveWidgetApi {
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
    protected signals: ConsultantSignals,
  ) {
    super(authFetch, profile, elements, connectOptions, metadataOptions, signals);
  }

  /**
   * Call handler when incoming call appeared
   *
   * @param {(metadata: SessionParticipant, answer?: AnswerCallback) => MaybePromiseVoid} handler
   * @returns {Promise<void>}
   */
  public async onIncomingCall(
    handler: (metadata: SessionParticipant, answer?: AnswerCallback) => MaybePromiseVoid,
  ): Promise<void> {
    return this.signals.onCall(metadata => handler(metadata, () => this.answer(metadata.session.sessionId)));
  }

  /**
   * Call handler when incoming call cancelled
   *
   * @param {(metadata: SessionParticipant) => MaybePromiseVoid} handler
   * @returns {Promise<void>}
   */
  public async onLeftCall(handler: (metadata: SessionParticipant) => MaybePromiseVoid): Promise<void> {
    return this.signals.onLeft(handler);
  }

  /**
   * Call handler when someone answered call
   *
   * @param {(metadata: SessionParticipant) => MaybePromiseVoid} handler
   * @returns {Promise<void>}
   */
  public async onAnsweredCall(handler: (metadata: SessionParticipant) => MaybePromiseVoid): Promise<void> {
    return this.signals.onAnswered(handler);
  }

  /**
   *
   * @param {(metadata: SessionParticipant) => MaybePromiseVoid} handler
   * @returns {Promise<void>}
   */
  public async onFirstMaxParticipants(handler: (metadata: SessionParticipant) => MaybePromiseVoid): Promise<void> {
    return this.signals.onFirstMaxParticipants(handler);
  }

  /**
   * @throws OVPublisherError
   */
  public async answer(sessionId: string): Promise<SessionId> {
    const options = shallowMerge(this.connectOptions, { session: { customSessionId: sessionId } });

    try {
      await this.connect(options);
      await this.signals.answer(this.activeSession!);
      return this.activeSession!.sessionId;
    } catch (error) {
      if (error instanceof FailedFetch) {
        switch (error.response.status) {
          case 403:
            await this.signals.maxParticipants({
              sessionId,
              connection: { stream: { hasAudio: false, hasVideo: false } },
            });
            break;
          case 400:
            const errorData = await error.response.json();
            console.error(`LiveWidget error: ${errorData.error}`);
            break;
        }
      }

      throw error;
    }
  }
}
