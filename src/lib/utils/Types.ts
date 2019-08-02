import {OpenViduTargetElement} from "../openvidu/openvidu";
import {ConsultantApi} from "../api/ConsultantApi";
import {ClientApi} from "../api/ClientApi";

export enum Stream {Publisher = 'publisher', Subscriber = 'subscriber'}
export enum Media {Video = 'video', Audio = 'audio'}

export type StreamsTargets = {
    [K in Stream]: OpenViduTargetElement
};

export enum ParticipantType {Client = 'client', Consultant = 'consultant'}

export type ParticipantMap = {
    client: ClientApi,
    consultant: ConsultantApi
};
