import {
    assert,
    combineProcedures,
    ConnectOptions,
    Fetch,
    getProp,
    log,
    noop,
    shallowMerge,
    size
} from "@devlegal/shared-ts";
import {config, Env} from "../config";
import {ClientApi} from "./api/ClientApi";
import {ConsultantApi} from "./api/ConsultantApi";
import {
    ConnectSessionFactory,
    connectToSessionFactory,
    HandleSession,
    HandleVideoElementEvent,
    openviduGlobal,
    PublishersConnectSessionFactory
} from "./openvidu/openvidu";
import {BindTransportAgentsFactory, FileTransportAgent, TextTransportAgent} from "./utils/transports/transports";
import {Session, StreamEvent, StreamManager, Subscriber, VideoElementEvent} from "openvidu-browser";
import {addButtonsFactory} from "./ui/buttons/buttons";
import {initFileChatFactory, initTextChatFactory, isFileElements, isTextElements} from "./ui/chat";
import {CallSignals, ClientSignals, ConsultantSignals} from "./utils/CallSignals";
import {ParticipantMap, ParticipantType, Settings, StreamsTargets, ViewSettings} from "./utils/Types";
import {MetadataHelper, MetadataOptions} from "./utils/Metadata";
import {Auth} from "./utils/Auth";
import {Backend, Credentials, Profile, Tenant} from "./utils/Backend";
import {CommonHelper} from "./utils/CommonHelper";


export class LiveWidget {

    constructor (private env: Env) {
        config.init(env);
    }

    /**
     * Default entry point function, for advanced cases use combination of API functions/classes.
     */
    public async defaultInit<K extends ParticipantType>(type: K, credentials: Credentials, elements: ViewSettings, options: MetadataOptions = {}): Promise<ParticipantMap[K]> {
        const fetch = await Auth.createAuthFetch(credentials);
        const profile = await Backend.fetchProfile(fetch);
        return this.createParticipant(type, profile, elements, fetch, options);
    };

    public async createParticipant<K extends ParticipantType>(type: K, profile: Profile, elements: ViewSettings, fetch: Fetch, options: MetadataOptions = {}): Promise<ParticipantMap[K]> {
        assert(openviduGlobal.checkSystemRequirements() === 1, 'OpenVidu isn\'t supported');
        assert(type !== ParticipantType.Consultant || CommonHelper.isConsultantRole(profile.role.role), `Consultant must have role ROLE_CONSULTANT, but ${profile.role.role} given`);

        const tenant: Tenant = await Backend.fetchTenant(fetch);
        const agents = this.createTransportAgents(profile.settings.chat, elements.chat);
        const bindTransportAgents = BindTransportAgentsFactory.create(fetch, ...agents);

        const metadata = MetadataHelper.create(options, type, profile);
        const connectOptions: ConnectOptions = shallowMerge(profile.settings.init, {
            token: {
                data: JSON.stringify(metadata)
            },
        });
        const handleMetadata = this.handleMetadataFactory(options, fetch);
        const addButtons = addButtonsFactory(profile.settings.buttons, elements.buttons || []);
        const handleVideoCreated = combineProcedures(handleMetadata, addButtons, getProp(elements.handleTargets, 'created') || noop);
        const handleVideoDestroyed = getProp(elements.handleTargets, 'destroyed');

        const signalsCtor = type === ParticipantType.Consultant ? ConsultantSignals : ClientSignals;
        const participantCtor = type === ParticipantType.Consultant ? ConsultantApi : ClientApi;

        const connectToSession = connectToSessionFactory(fetch);
        const signals = new signalsCtor(connectToSession(), profile, tenant, metadata, fetch);
        const allToAllConnect = this.allToAllConnectSessionMetafactory(connectToSession, profile.settings, elements.streamsTargets, signals, handleVideoCreated, handleVideoDestroyed)(bindTransportAgents);
        return new participantCtor(profile, allToAllConnect, connectOptions, signals as ConsultantSignals & ClientSignals);
    };

    public async createConsultantSignals(profile: Profile, fetch: Fetch, options: MetadataOptions = {}): Promise<ConsultantSignals> {
        const connectToSession = connectToSessionFactory(fetch);
        const tenant: Tenant = await Backend.fetchTenant(fetch);
        const metadata = MetadataHelper.create(options, ParticipantType.Consultant, profile);
        return new ConsultantSignals(connectToSession(), profile, tenant, metadata, fetch);
    };

    /**
     * Creates a function that connects to the session as a publisher and connects all created in the session streams as subscribers, all according with given stream settings.
     */
    private allToAllConnectSessionMetafactory(decorated: ConnectSessionFactory,
                                              settings: Settings,
                                              targets: StreamsTargets,
                                              signals: CallSignals,
                                              videoCreated: HandleVideoElementEvent = noop,
                                              videoDestroyed: HandleVideoElementEvent = noop): PublishersConnectSessionFactory {
        const handleVideoCreating = (streamManager: StreamManager): void => {
            streamManager.on('videoElementCreated', async (event) => {
                // For some reason exceptions will be absorbed here
                try {
                    await videoCreated(event as VideoElementEvent);
                } catch (error) {
                    log('Error in videoCreated:', error);
                }
            });
            streamManager.on('videoElementDestroyed', async (event) => {
                // For some reason exceptions will be absorbed here
                try {
                    await videoDestroyed(event as VideoElementEvent);
                } catch (error) {
                    log('Error in videoDestroyed:', error);
                }
            });
        };
        const onStreamCreated = (session: Session): void => {
            session.on('streamCreated', async (event) => {
                if (size(session.remoteConnections) + 1 >= settings.init.maxParticipants) {
                    // Session has not .connection.stream yet, but it is necessary for signalParticipant
                    session.connection.stream = (event as StreamEvent).stream;
                    await signals.maxParticipants(session);
                }

                const subscriber = session.subscribe((event as StreamEvent).stream, targets.subscriber, settings.streams.subscriber);
                handleVideoCreating(subscriber);
            });
        };

        return (beforeConn: HandleSession = noop) => async (options, customProperties = {}) => {
            const beforeConnect = combineProcedures(beforeConn, onStreamCreated);
            const session = await decorated(beforeConnect)(options);
            const properties = shallowMerge(settings.streams.publisher, customProperties);

            const publisher = await session.openvidu.initPublisherAsync(targets.publisher, properties);
            handleVideoCreating(publisher);
            await session.publish(publisher);
            log('Published media', properties, publisher);

            return publisher;
        };
    };

    public createTransportAgents(settings: Settings['chat'], elements: ViewSettings['chat']): [TextTransportAgent, FileTransportAgent] {
        const textView = getProp(elements, 'text');
        const fileView = getProp(elements, 'file');

        const textAgent = textView && settings.text
            ? isTextElements(textView) ? initTextChatFactory(textView) : textView
            : noop;
        const fileAgent = fileView && settings.file
            ? isFileElements(fileView) ? initFileChatFactory(fileView) : fileView
            : noop;

        return [textAgent, fileAgent];
    };

    private handleMetadataFactory(options: MetadataOptions, fetch: Fetch): HandleVideoElementEvent {
        return async (event) => {
            const streamManager = event.target;
            if (streamManager instanceof Subscriber) {
                const handle = options.handle || noop;
                const data = MetadataHelper.get(streamManager.stream.connection);
                const userInfo = await Backend.fetchUserInfo(fetch, data.system.profile.email);
                data.system.profile.avatar = userInfo.avatar;
                return handle(data, streamManager.stream.connection);
            }
        };
    }
}
