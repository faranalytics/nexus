import { EventEmitter } from 'node:events';

export interface STTOptions {

}

export abstract class STT extends EventEmitter {

    constructor() {
        super();
    }

    public abstract onAudio(buffer: Buffer): void;
}