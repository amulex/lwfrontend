import { LiveWidgetFactory } from './lib/LiveWidgetFactory';
import { ConsultantApi } from './lib/api/ConsultantApi';
import { ClientApi } from './lib/api/ClientApi';
import { LiveWidgetApi } from './lib/api/LiveWidgetApi';
import { MetadataHelper } from './lib/utils/Metadata';
import { Auth } from './lib/utils/Auth';
import { Backend } from './lib/utils/Backend';
import {
  Media,
  MediaDevicesNotFoundError,
  OpenviduNotSupportedError,
  ParticipantType,
  Stream,
} from './lib/utils/Types';
import { PlayerAction } from './lib/ui/buttons/player';

export default {
  LiveWidgetFactory,
  ConsultantApi,
  ClientApi,
  LiveWidgetApi,
  MetadataHelper,
  Auth,
  Backend,
  Media,
  ParticipantType,
  Stream,
  PlayerAction,

  // errors
  OpenviduNotSupportedError,
  MediaDevicesNotFoundError,
};
