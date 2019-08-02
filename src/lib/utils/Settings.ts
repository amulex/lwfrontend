import {CustomizableSessionOpts, DeepReadonly} from "@devlegal/shared-ts";
import {ButtonConfig, ButtonsPermissions} from "../ui/buttons/buttons";
import {HandleVideoElementEvent} from "../openvidu/openvidu";
import {ChatView, FileView} from "../ui/chat";
import {StreamsTargets} from "./Types";

export type Settings = DeepReadonly<{
    streams: StreamsProperties,
    buttons: ButtonsPermissions,
    chat: {
        text?: boolean,
        file?: boolean,
    },
    init: {
        session: CustomizableSessionOpts,
        record?: boolean,
        maxParticipants: number
    }
}>;

export type ViewSettings = {
    streamsTargets: StreamsTargets,
    handleTargets?: {
        created?: HandleVideoElementEvent,
        destroyed?: HandleVideoElementEvent
    },
    buttons?: ButtonConfig[];
    chat?: {
        text?: ChatView,
        file?: FileView
    }
};


type StreamsProperties = DeepReadonly<{
    publisher: Partial<{
        frameRate: number;
        mirror: boolean;
        audioSource: false;
        videoSource: false,
        publishAudio: boolean;
        publishVideo: boolean;
        resolution: string;
    }>,
    subscriber: Partial<{
        subscribeToAudio: boolean;
        subscribeToVideo: boolean;
    }>
}>;