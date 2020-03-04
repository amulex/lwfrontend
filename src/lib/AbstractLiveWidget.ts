import {ParticipantMap, ParticipantType, SessionParticipant, WidgetEnv} from "./utils/Types";
import {ParticipantMetadata} from "./utils/Metadata";
import {v1} from 'uuid';
import {LiveWidgetFactory} from "./LiveWidgetFactory";
import {Profile} from "./utils/Backend";

export type ParticipantSpecificHandler = (participant: SessionParticipant) => void;
export type SessionSpecificHandler = (sessionId: string) => void;
export type ChatMessageHandler<T extends string | File> = (data: T) => void;
export type VideoElementHandler = (stream: any) => void;

export type IncomingCallHandler = ParticipantSpecificHandler;
export type LeftHandler = ParticipantSpecificHandler;
export type ParticipantLeftHandler = ParticipantSpecificHandler;
export type ParticipantJoinedHandler = (participant: ParticipantMetadata) => void;
export type LeavingCallHandler = SessionSpecificHandler;
export type LeftCallHandler = SessionSpecificHandler;
export type JoiningCallHandler = ParticipantSpecificHandler;
export type JoinedCallHandler = ParticipantSpecificHandler;
export type CallingHandler = () => void;
export type CalledHandler = SessionSpecificHandler;
export type MessageReceivedHandler = ChatMessageHandler<string>;
export type FileReceivedHandler = ChatMessageHandler<File>;
export type MessageSentHandler = ChatMessageHandler<string>;
export type FileSentHandler = ChatMessageHandler<File>;
export type VideoCreatedHandler = VideoElementHandler;
export type VideoDestroyedHandler = VideoElementHandler;
export type InitHandler = () => void;

type MessageHandler = ParticipantSpecificHandler | SessionSpecificHandler | CallingHandler | ParticipantJoinedHandler | ChatMessageHandler<any> | VideoElementHandler | InitHandler;

export enum WidgetServiceMessageType {
    // in process of joining call
    JOINING_CALL = 'joining_call',
    JOINED_CALL = 'joined_call',

    // in process of leaving call
    LEAVING_CALL = 'leaving_call',
    LEFT_CALL = 'left_call',

    // in process of outgoing call
    CALLING = 'calling',
    CALLED = 'called',

    // received incoming call signal
    INCOMING_CALL = 'incoming_call',
    // someone disconnected (incoming call cancelled)
    SOMEONE_LEFT = 'left',

    // in process of communication when participant join or leave
    PARTICIPANT_JOINED = 'participant_joined',
    PARTICIPANT_LEFT = 'participant_left',

    MESSAGE_RECEIVED = 'message_received',
    MESSAGE_SENT = 'message_sent',
    FILE_RECEIVED = 'file_received',
    FILE_SENT = 'file_sent',

    VIDEO_ELEMENT_CREATED = 'video_element_created',
    VIDEO_ELEMENT_DESTROYED = 'video_element_destroyed',

    AFTER_INIT = 'after_init'
}

export type MessageHandlerMap = {
    [WidgetServiceMessageType.JOINING_CALL]: JoiningCallHandler,
    [WidgetServiceMessageType.JOINED_CALL]: JoinedCallHandler,
    [WidgetServiceMessageType.LEAVING_CALL]: LeavingCallHandler,
    [WidgetServiceMessageType.LEFT_CALL]: LeftCallHandler,
    [WidgetServiceMessageType.CALLING]: CallingHandler,
    [WidgetServiceMessageType.CALLED]: CalledHandler,
    [WidgetServiceMessageType.INCOMING_CALL]: IncomingCallHandler,
    [WidgetServiceMessageType.SOMEONE_LEFT]: LeftHandler,
    [WidgetServiceMessageType.PARTICIPANT_JOINED]: ParticipantJoinedHandler,
    [WidgetServiceMessageType.PARTICIPANT_LEFT]: ParticipantLeftHandler,
    [WidgetServiceMessageType.MESSAGE_RECEIVED]: MessageReceivedHandler,
    [WidgetServiceMessageType.MESSAGE_SENT]: MessageSentHandler,
    [WidgetServiceMessageType.FILE_RECEIVED]: FileReceivedHandler,
    [WidgetServiceMessageType.FILE_SENT]: FileSentHandler,
    [WidgetServiceMessageType.VIDEO_ELEMENT_CREATED]: VideoCreatedHandler,
    [WidgetServiceMessageType.VIDEO_ELEMENT_DESTROYED]: VideoDestroyedHandler,
    [WidgetServiceMessageType.AFTER_INIT]: InitHandler
}

export class AbstractLiveWidget {

    private _handlers: Map<WidgetServiceMessageType, Map<string, MessageHandler>> = new Map();

    protected  _profile: Profile | null = null;
    protected _lwFactory: LiveWidgetFactory;

    constructor(settings: WidgetEnv){
        this._lwFactory = new LiveWidgetFactory({
            host: {
                backend: settings.backendUrl,
                middleware: settings.middlewareUrl
            },
            storage: settings.storageSettings,
        });
    }

    protected _on<K extends WidgetServiceMessageType>(messageType: K, handler: MessageHandlerMap[K]): string {
        const uuid = v1();
        const map = this._handlers.get(messageType);
        if (!map) {
            this._handlers.set(messageType, new Map<string, MessageHandler>());
        }
        this._handlers.get(messageType)!.set(uuid, handler);
        return uuid;
    }

    public off(key: string): void {
        this._handlers.forEach(handlers => handlers.delete(key));
    }

    public async checkRequirements(): Promise<void> {
        await this._lwFactory.checkRequirements();
    }

    public get profile(): Profile | null {
        return this._profile;
    }

    protected emit(messageType: WidgetServiceMessageType, data: any = null) {
        const handlers = this._handlers.get(messageType);
        if (handlers) {
            handlers.forEach(handler => {
                handler(data);
            });
        }
    }
}
