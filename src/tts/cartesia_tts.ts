import { CartesiaClient } from "@cartesia/cartesia-js";
import { TTS } from './tts.js';
import { log } from '../logger.js';
import { randomUUID } from "node:crypto";

export interface CartesiaTTSOptions {
    apiKey: string;
    greeting: string;
}

export class CartesiaTTS extends TTS {

    protected cartesiaClient: CartesiaClient;
    protected mutex: Promise<void>;

    constructor({ apiKey, greeting }: CartesiaTTSOptions) {
        super();

        this.onAgentMessage = this.onAgentMessage.bind(this);

        this.cartesiaClient = new CartesiaClient({ apiKey });
        this.mutex = Promise.resolve();

        setTimeout(() => {
            this.onAgentMessage(randomUUID(), greeting);
        });
    }

    public async onAgentMessage(uuid: string, transcript: string): Promise<void> {
        try {
            await (this.mutex = (async () => {

                await this.mutex;

                const websocket = this.cartesiaClient.tts.websocket({
                    container: 'raw',
                    encoding: "pcm_mulaw",
                    sampleRate: 8000,
                });

                await websocket.connect();

                const response = await websocket.send({
                    modelId: "sonic-2",
                    voice: {
                        mode: "id",
                        id: "694f9389-aac1-45b6-b726-9d9369183238",
                    },
                    transcript: transcript,
                });

                for await (const data of response.events("message")) {
                    const message = JSON.parse(data);
                    if (!message.done) {
                        this.emit('audio', Buffer.from(message.data, 'base64'));
                    }
                }
            })());
        }
        catch (err) {
            log.error(err);
        }
    }
}

