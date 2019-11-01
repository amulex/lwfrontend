import { LiveWidgetFactory } from './lib/LiveWidgetFactory';
import { ConsultantApi } from './lib/api/ConsultantApi';
import { ClientApi } from './lib/api/ClientApi';
import { LiveWidgetApi } from './lib/api/LiveWidgetApi';
import { MetadataBuilder } from './lib/utils/Metadata';
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
import { WidgetStorageType } from './lib/utils/Storage';

export default {
  LiveWidgetFactory,
  ConsultantApi,
  ClientApi,
  LiveWidgetApi,
  MetadataBuilder,
  Auth,
  Backend,
  Media,
  ParticipantType,
  Stream,
  PlayerAction,
  WidgetStorageType,

  // errors
  OpenviduNotSupportedError,
  MediaDevicesNotFoundError,
};
