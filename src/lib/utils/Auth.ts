import { clone, Fetch, FetchHelper, log } from '@devlegal/shared-ts';
import { Credentials, JwtToken, Login } from './Backend';
import { config } from '../../config';

export class Auth {
  private static successfulFetchExcept401 = FetchHelper.createSuccessfulFetch(
    async response => response.ok || (await Auth.isExpired(response)),
    fetch,
  );

  /**
   * Returns a fetch function that will add headers for proper authorization on every request.
   *
   * Because middleware proxies authorization to backend, both middleware and backend need same authorization, hence same authorized fetch.
   *
   * @param token
   * @param decorated Must return response with 401 status as usual, without throwing exception, because it is used for token refreshing
   */
  public static createAuthFetchFromToken(token: JwtToken, decorated: Fetch = Auth.successfulFetchExcept401): Fetch {
    const createAuthHeaders = (jwtToken: JwtToken): Headers => {
      const headers = new Headers();
      headers.set('authorization', `Bearer ${jwtToken.token}`);
      return headers;
    };
    const refreshHeaders = async (jwtToken: JwtToken): Promise<Headers> => {
      const response = await FetchHelper.postJson(config.get().paths.backend.loginRefresh, jwtToken, decorated);
      const refreshedToken = await response.json();
      return createAuthHeaders(refreshedToken);
    };
    let authHeaders = createAuthHeaders(token);

    return async (url, passedInit?) => {
      const init = passedInit ? clone(passedInit) : {};
      init.headers = FetchHelper.mergeHeaders(init.headers, authHeaders);

      const response = await decorated(url, init);
      if (response.ok) {
        return response;
      }

      authHeaders = await refreshHeaders(token);
      return fetch(url, init);
    };
  }

  public static isExpired = async (response: Response): Promise<boolean> => {
    const { detail = '' } = await response.json();
    return response.status === 401 && detail.toLowerCase().includes('expire');
  };

  public static createAuthFetch = async (credentials: Credentials): Promise<Fetch> =>
    Auth.createAuthFetchFromToken(await Auth.getToken(credentials));

  private static getToken = async (credentials: Credentials): Promise<JwtToken> => {
    if (Auth.isToken(credentials)) {
      return credentials;
    }

    const token = await Auth.login(credentials);
    log('Given token:', token, 'for credentials:', credentials);
    return token;
  };

  private static isToken = (credentials: Credentials): credentials is JwtToken => {
    const maybeToken = credentials as JwtToken;
    return maybeToken.token !== undefined && maybeToken.refresh_token !== undefined;
  };

  private static async login(credentials: Login): Promise<JwtToken> {
    const response = await FetchHelper.postJson(config.get().paths.backend.login, credentials);
    return response.json();
  }
}
