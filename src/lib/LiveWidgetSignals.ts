import {AbstractLiveWidget, IncomingCallHandler, LeftHandler, WidgetServiceMessageType} from "./AbstractLiveWidget";
import {WidgetEnv} from "./utils/Types";
import {Backend, Credentials, Profile} from "./utils/Backend";
import {Fetch} from "@devlegal/shared-ts";
import {ClientMetadata} from "./LiveWidgetService";
import {Auth} from "./utils/Auth";
import {MetadataOptions} from "./utils/Metadata";

export class LiveWidgetSignals extends AbstractLiveWidget{

    private _profile?: Profile;

    constructor(settings: WidgetEnv) {
        super(settings);
    }

    public async init(credentials: Credentials, clientMetadata?: ClientMetadata): Promise<void>
    public async init(authFetch: Fetch, clientMetadata?: ClientMetadata): Promise<void>
    public async init(accessProvider: Fetch | Credentials, clientMetadata?: ClientMetadata): Promise<void> {
        const authFetch = accessProvider instanceof Function ? accessProvider : (await Auth.createAuthFetch(accessProvider));
        this._profile = await Backend.fetchProfile(authFetch);
        const metadata: MetadataOptions = {
            data: clientMetadata
        };

        await this._lwFactory.createConsultantSignals(this._profile, authFetch, metadata);
    }

    public onIncomingCall(handler: IncomingCallHandler): string {
        return this._on(WidgetServiceMessageType.INCOMING_CALL, handler);
    }

    public onIncomingCallCancelled(handler: LeftHandler): string {
        return this._on(WidgetServiceMessageType.SOMEONE_LEFT, handler);
    }
}
