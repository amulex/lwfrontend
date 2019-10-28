import { openviduGlobal } from '../openvidu/openvidu';
import { Device } from 'openvidu-browser';

export class MediaDevicesChecker {
  private availableDevices: Device[] | undefined;

  private async getDevices() {
    this.availableDevices = await openviduGlobal.getDevices();
  }

  public async isMicrophoneAvailable(): Promise<boolean> {
    if (this.availableDevices === undefined) {
      await this.getDevices();
      if (!this.availableDevices) {
        return false;
      }
    }
    const availableMicrophones = this.availableDevices.filter(device => device.kind === 'audioinput');
    return availableMicrophones.length > 0;
  }

  public async isCameraAvailable(): Promise<boolean> {
    if (this.availableDevices === undefined) {
      await this.getDevices();
      if (!this.availableDevices) {
        return false;
      }
    }

    const availableCameras = this.availableDevices.filter(device => device.kind === 'videoinput');
    return availableCameras.length > 0;
  }

  public async isMediaDevicesAvailable(): Promise<boolean> {
    return (await this.isCameraAvailable()) || (await this.isMicrophoneAvailable());
  }
}
