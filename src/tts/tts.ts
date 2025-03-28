/* eslint-disable @typescript-eslint/no-unused-vars */
import { EventEmitter } from 'node:events';

export interface TTSEvents {
    'audio': [Buffer]
}

export abstract class TTS extends EventEmitter<TTSEvents> {

    constructor() {
        super();
    }

    public abstract onAgentMessage(uuid: string, text: string | null): void;
}