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
}
