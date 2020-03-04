import {LiveWidgetService} from "./lib/LiveWidgetService";
import {WidgetStorageType} from "./lib/utils/Storage";
import {config} from "./env";
import {WidgetEnv} from "./lib/utils/Types";
import {WidgetServiceMessageType} from "./lib/AbstractLiveWidget";
import {ParticipantMetadata} from "./lib/utils/Metadata";

const run = async () => {

    const env: WidgetEnv = {
        backendUrl: config.env.host.backend,
        middlewareUrl: config.env.host.middleware,
        storageSettings: {
            type: WidgetStorageType.LOCAL_STORAGE
        }
    };
    const service = new LiveWidgetService(env);
};

run();
