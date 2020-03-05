import { Publisher, StreamManager, Subscriber } from 'openvidu-browser';
import { Stream } from './Types';

export class CommonHelper {
  public static isConsultantRole(role?: string): boolean {
    return role === 'ROLE_CONSULTANT';
  }

  public static getStream(manager: StreamManager): Stream {
    if (manager instanceof Publisher) {
      return Stream.Publisher;
    }
    if (manager instanceof Subscriber) {
      return Stream.Subscriber;
    }
    throw new Error('Invalid stream type');
  }

  public static padLeft(str: string | number, padLength: number, padChar: string = '0'): string {
    const pad = new Array(1 + padLength).join(padChar);
    return (pad + str).slice(-pad.length);
  }
}
