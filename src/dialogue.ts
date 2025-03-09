// import Telnyx from "telnyx";

// export interface DialogueOptions {
//     apiKey: string;
// }

// export class Dialogue {

//     public apiKey: string;
//     public telnyx: Telnyx;

//     constructor({ apiKey }: DialogueOptions) {
//         this.apiKey = apiKey;
//         this.telnyx = new Telnyx(apiKey);
//     }

//     public async callInitiated() {
//         const response: Telnyx.Response<Telnyx.CallsAnswerResponse> = await this.telnyx.calls.answer(callControlId, {
//             record_channels: 'dual',
//             stream_track: 'both_tracks',
//             send_silence_when_idle: false,
//             webhook_url_method: 'POST',
//             transcription: false,
//             record_format: 'mp3',
//             record_max_length: 0,
//             record_timeout_secs: 0,
//             record_track: 'both'
//         });
//     }
// }