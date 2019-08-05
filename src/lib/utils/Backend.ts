import { ConnectionId } from '../openvidu/openvidu';
import {
  Base64,
  clone,
  FetchHelper,
  DeepReadonly,
  Email,
  Fetch,
  filterDictionary,
  log,
  MimeType,
} from '@devlegal/shared-ts';
import { config } from '../../config';
import { Connection, Session } from 'openvidu-browser';
import { Settings } from './Types';

export type Login = Readonly<{
  email: Email;
  password: string;
}>;

export type JwtToken = Readonly<{
  token: string;
  refresh_token: string;
}>;

export type Credentials = Login | JwtToken;
/**
 * Role string with "ROLE_" prefix.
 */
type RoleString = string;

type BaseProfile = {
  email: Email;
  name?: string;
  surname?: string;
  patronymic?: string;
  role: {
    role: RoleString;
  };
};

export type Profile = BaseProfile & {
  settings: Settings;
};

export type UserInfo = BaseProfile & {
  avatar?: Base64;
};

export type ParticipantInfo = Profile & UserInfo;

export type Tenant = DeepReadonly<{
  key: string;
  name: string;
  logo?: Base64;
  greeting?: string;
}>;

export type Message = {
  type: MessageType;
  typeRelated: TextData | FileData;
  time: Date;
  connection: ConnectionId;
};

type TextData = {
  text: string;
};
type FileData = {
  name: string;
  type: MimeType;
  size: number;
};

export enum MessageType {
  Text = 'text',
  File = 'file',
}

type ParticipantRoles = { [connectionId: string]: RoleString };
type FetchParticipantRoles = (connectionIds: ConnectionId[]) => Promise<ParticipantRoles>;

export class Backend {
  public static async fetchProfile(fetch: Fetch): Promise<Profile> {
    const response = await fetch(config.get().paths.backend.profile);
    return response.json();
  }

  public static async fetchTenant(fetch: Fetch): Promise<Tenant> {
    const response = await fetch(config.get().paths.backend.tenant);
    return response.json();
  }

  public static async fetchUserInfo(fetch: Fetch, email: string): Promise<UserInfo> {
    const response = await fetch(`${config.get().paths.backend.userInfo}?email=${email}`);
    return response.json();
  }

  public static logMessage(message: Message, fetch: Fetch): Promise<Response> {
    return FetchHelper.postJson(config.get().paths.backend.messages, message, fetch);
  }

  /**
   * @param connections
   * @param predicate role is undefined if connection wasn't found on backend
   * @param fetch
   */
  public static async filterParticipantsByRole(
    connections: Connection[],
    predicate: (role?: RoleString) => boolean,
    fetch: Fetch,
  ): Promise<Connection[]> {
    const fetchParticipantRoles: FetchParticipantRoles = async connectionIds => {
      const url = new URL(config.get().paths.backend.participantRoles);
      FetchHelper.searchParamsAddArray('id[]', connectionIds, url.searchParams);
      const response = await fetch(url.toString());
      return response.json();
    };

    const fetchParticipantRolesCached = ((): FetchParticipantRoles => {
      const cache: ParticipantRoles = {};
      return async connectionIds => {
        const notCachedIds = connectionIds.filter(connectionId => !cache[connectionId]);

        if (notCachedIds.length) {
          const newRoles = await fetchParticipantRoles(notCachedIds);
          Object.assign(cache, newRoles);
        }

        return filterDictionary(cache, (role, id) => connectionIds.includes(id));
      };
    })();

    const ids = connections.map(c => c.connectionId);
    const roles = await fetchParticipantRolesCached(ids);
    return connections.filter(connection => predicate(roles[connection.connectionId]));
  }

  /**
   * See ImportCdr description on backend for details.
   */
  /*public static logConnectionFactory(fetch: Fetch) {
        return async (session: Session): Promise<Response> => {
            await FetchHelper.postJson(config.get().paths.backend.sessions, {id: session.sessionId}, fetch);
            return FetchHelper.postJson(config.get().paths.backend.connections, {
                id: session.connection.connectionId,
                session: session.sessionId
            }, fetch);
        };
    }*/

  public static async logConnection(session: Session, fetch: Fetch): Promise<Response> {
    await FetchHelper.postJson(config.get().paths.backend.sessions, { id: session.sessionId }, fetch);
    return FetchHelper.postJson(
      config.get().paths.backend.connections,
      {
        id: session.connection.connectionId,
        session: session.sessionId,
      },
      fetch,
    );
  }
}
