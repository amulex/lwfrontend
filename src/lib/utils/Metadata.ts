import { DeepReadonly, jsonParseDefault, MaybePromiseVoid } from '@devlegal/shared-ts';
import { ParticipantType } from './Types';
import { Connection } from 'openvidu-browser';
import { ParticipantInfo, Profile } from './Backend';
import { v4 } from 'uuid';
import { AbstractStorage } from './Storage';

export type ParticipantMetadata = {
  custom: CustomMetadata;
  system: SystemMetadata;
};

export type SystemMetadata =
  | {
      type: ParticipantType.Client;
      profile: ParticipantInfo;
      clientId: string;
    }
  | {
      type: ParticipantType.Consultant;
      profile: ParticipantInfo;
    };

export type MetadataOptions = DeepReadonly<{
  data?: CustomMetadata;
  /**
   * Handler for other participants' metadata, will be called on streamCreated event.
   */
  handle?: HandleMetadata;
}>;
/**
 * Custom data that will be shown to other participants.
 */
type CustomMetadata = any;

export type HandleMetadata = (md: ParticipantMetadata, c: Connection) => MaybePromiseVoid;

export class MetadataBuilder {
  constructor(private storage: AbstractStorage) {}

  private STORAGE_VARIABLE_NAME = 'LW__userid';

  public create(options: MetadataOptions, type: ParticipantType, profile: Profile): ParticipantMetadata {
    return {
      custom: options.data,
      system: this.getSystemMetadata(type, profile),
    };
  }

  public static get(connection: Connection): ParticipantMetadata {
    return jsonParseDefault(connection.data) as ParticipantMetadata;
  }

  private getSystemMetadata(type: ParticipantType, profile: Profile): SystemMetadata {
    if (type === ParticipantType.Client) {
      let clientId = this.storage.getItem(this.STORAGE_VARIABLE_NAME);
      if (!clientId) {
        clientId = v4();
        this.storage.setItem(this.STORAGE_VARIABLE_NAME, clientId);
      }
      return { type, profile, clientId };
    } else {
      return { type, profile };
    }
  }
}
