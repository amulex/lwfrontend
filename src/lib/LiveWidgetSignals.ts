import { AbstractLiveWidget, IncomingCallHandler, LeftHandler, WidgetServiceMessageType } from './AbstractLiveWidget';
import { ClientMetadata, SessionParticipant, WidgetEnv } from './utils/Types';
import { Backend, Credentials } from './utils/Backend';
import { Fetch } from '@devlegal/shared-ts';
import { Auth } from './utils/Auth';
import { MetadataOptions, ParticipantMetadata } from './utils/Metadata';
import { ConsultantSignals } from './utils/CallSignals';

export class LiveWidgetSignals extends AbstractLiveWidget {
  private _signals?: ConsultantSignals;
  private _incomingCalls: Map<string, SessionParticipant> = new Map();
  private _participants: ParticipantMetadata[] = [];

  constructor(settings: WidgetEnv) {
    super(settings);
  }

  public async init(credentials: Credentials, clientMetadata?: ClientMetadata): Promise<void>;
  public async init(authFetch: Fetch, clientMetadata?: ClientMetadata): Promise<void>;
  public async init(accessProvider: Fetch | Credentials, clientMetadata?: ClientMetadata): Promise<void> {
    const authFetch = accessProvider instanceof Function ? accessProvider : await Auth.createAuthFetch(accessProvider);
    this._profile = await Backend.fetchProfile(authFetch);
    const metadata: MetadataOptions = {
      data: clientMetadata,
    };

    this._signals = await this._lwFactory.createConsultantSignals(this._profile, authFetch, metadata);
    const promiseOnCall = this._signals.onCall((participant: SessionParticipant) => {
      this._incomingCalls.set(participant.session.sessionId, participant);
      this.emit(WidgetServiceMessageType.INCOMING_CALL, participant);
    });

    const promiseOnLeft = this._signals.onLeft((participant: SessionParticipant) => {
      this._incomingCalls.delete(participant.session.sessionId);
      this._participants = this._participants.filter(
        p => p.system.profile.email !== participant.participant.system.profile.email,
      );
      this.emit(WidgetServiceMessageType.SOMEONE_LEFT, participant);
    });

    const promiseOnAnswered = this._signals.onAnswered((participant: SessionParticipant) => {
      this._incomingCalls.delete(participant.session.sessionId);
      this._participants = this._participants.filter(
        p => p.system.profile.email !== participant.participant.system.profile.email,
      );
      this.emit(WidgetServiceMessageType.SOMEONE_LEFT, participant);
    });

    await Promise.all([promiseOnCall, promiseOnLeft, promiseOnAnswered]);
  }

  public onIncomingCall(handler: IncomingCallHandler): string {
    return this._on(WidgetServiceMessageType.INCOMING_CALL, handler);
  }

  public onIncomingCallCancelled(handler: LeftHandler): string {
    return this._on(WidgetServiceMessageType.SOMEONE_LEFT, handler);
  }

  public async disconnect(): Promise<void> {
    if (this._signals) {
      this._incomingCalls.clear();
      this._participants = [];
      this._signals!.disconnect();
    }
  }
}
