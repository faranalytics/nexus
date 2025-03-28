import { STT } from './stt.js';
import { createClient, ListenLiveClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { once } from 'node:events';
import OpenAI from 'openai';
import { log } from '../logger.js';

export interface DeepgramSTTOptions {
    apiKey: string;
    openAIAPIKey: string;
}

export class DeepgramSTT extends STT {

    protected listenLiveClient: ListenLiveClient;
    protected transcript: string;
    protected openAI: OpenAI;

    constructor({ apiKey, openAIAPIKey }: DeepgramSTTOptions) {
        super();

        this.onAudio = this.onAudio.bind(this);

        this.transcript = '';

        const deepgram = createClient(apiKey);

        this.openAI = new OpenAI({ 'apiKey': openAIAPIKey });

        this.listenLiveClient = deepgram.listen.live({
            model: "nova-3",
            language: "en-US",
            // smart_format: true,
            encoding: 'mulaw',
            sample_rate: 8000,
            endpointing: 500,
            punctuate: true
        });

        this.listenLiveClient.on(LiveTranscriptionEvents.Close, () => {
            log.debug('deepgram:close');
        });

        this.listenLiveClient.on(LiveTranscriptionEvents.Transcript, async (data) => {
            try {
                log.debug('deepgram:transcript');
                const transcript = data.channel.alternatives[0].transcript;
                if (transcript !== '') {
                    if (data.is_final) {
                        this.transcript = this.transcript === '' ? transcript : this.transcript + ' ' + transcript;
                        if (data.speech_final) {
                            this.emit('transcript', this.transcript);
                            this.transcript = '';
                        }
                    }
                }
            }
            catch(err) {
                log.error(err);
            }
        });

        this.listenLiveClient.on(LiveTranscriptionEvents.Metadata, (data) => {
            log.debug('deepgram:metadata');
            log.debug(data);
        });

        this.listenLiveClient.on(LiveTranscriptionEvents.Error, (err) => {
            log.debug('deepgram:error');
            log.error(err);
        });

        this.listenLiveClient.on(LiveTranscriptionEvents.Unhandled, (err) => {
            log.debug('deepgram:unhandled');
            log.error(err);
        });
    }

    public async onAudio(buffer: Buffer): Promise<void> {
        try {
            if (!this.listenLiveClient.isConnected) {
                await once(this.listenLiveClient, LiveTranscriptionEvents.Open);
            }
            this.listenLiveClient.send(new Uint8Array(buffer).buffer);
        }
        catch (err) {
            log.error(err);
        }
    }
}