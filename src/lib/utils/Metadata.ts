import {DeepReadonly, jsonParseDefault, MaybePromiseVoid} from "@devlegal/shared-ts";
import {ParticipantType} from "./Types";
import {Connection} from "openvidu-browser";
import {ParticipantInfo, Profile} from "./Backend";

export type ParticipantMetadata = {
    custom: CustomMetadata,
    system: {
        type: ParticipantType
        profile: ParticipantInfo
    }
};

export type MetadataOptions = DeepReadonly<{
    data?: CustomMetadata;
    /**
     * Handler for other participants' metadata, will be called on streamCreated event.
     */
    handle?: HandleMetadata
}>;
/**
 * Custom data that will be shown to other participants.
 */
type CustomMetadata = any;

export type HandleMetadata = (md: ParticipantMetadata, c: Connection) => MaybePromiseVoid;

export class MetadataHelper {

    public static create(options: MetadataOptions, type: ParticipantType, profile: Profile): ParticipantMetadata {
        return {
            custom: options.data,
            system: {type, profile}
        };
    }

    public static get (connection: Connection): ParticipantMetadata {
        return jsonParseDefault(connection.data) as ParticipantMetadata;
    }
}