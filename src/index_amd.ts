import {LiveWidgetFactory} from "./lib/LiveWidgetFactory";
import {ConsultantApi} from "./lib/api/ConsultantApi";
import {ClientApi} from "./lib/api/ClientApi";
import {LiveWidgetApi} from "./lib/api/LiveWidgetApi";
import {MetadataHelper} from "./lib/utils/Metadata";
import {Auth} from "./lib/utils/Auth";
import {Backend} from "./lib/utils/Backend";
import {Media, MediaDevicesNotFoundError, OpenviduNotSupportedError, ParticipantType, Stream} from "./lib/utils/Types";
import {PlayerAction} from "./lib/ui/buttons/player";

export default {
    LiveWidgetFactory: LiveWidgetFactory,
    ConsultantApi: ConsultantApi,
    ClientApi: ClientApi,
    LiveWidgetApi: LiveWidgetApi,
    MetadataHelper: MetadataHelper,
    Auth: Auth,
    Backend: Backend,
    Media: Media,
    ParticipantType: ParticipantType,
    Stream: Stream,
    PlayerAction: PlayerAction,

    // errors
    OpenviduNotSupportedError: OpenviduNotSupportedError,
    MediaDevicesNotFoundError: MediaDevicesNotFoundError
}