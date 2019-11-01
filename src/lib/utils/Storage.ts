import * as Cookies from 'js-cookie';

/**
 * Storage for persisting clientId uuid, generated by widget
 * Implemented via localStorage and cookies
 */
export abstract class AbstractStorage {
  public abstract getItem(key: string): string | undefined;
  public abstract setItem(key: string, value: string): void;
  public abstract removeItem(key: string): void;
}

export class LocalStorage extends AbstractStorage {
  public getItem(key: string): string | undefined {
    const val = localStorage.getItem(key);
    return val ? val : undefined;
  }

  public setItem(key: string, value: string): void {
    localStorage.setItem(key, value);
  }

  public removeItem(key: string): void {
    localStorage.removeItem(key);
  }
}

export class CookiesStorage extends AbstractStorage {
  constructor(private expires?: number) {
    super();
  }

  public getItem(key: string): string | undefined {
    return Cookies.get(key);
  }

  public setItem(key: string, value: string): void {
    Cookies.set(key, value, { expires: this.expires });
  }

  public removeItem(key: string): void {
    Cookies.remove(key);
  }
}
