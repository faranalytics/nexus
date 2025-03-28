import { EventEmitter } from 'node:events';
import * as ws from 'ws';

interface VoIPEvents {
    'audio': [Buffer];
}

export interface VoIPOptions {
    webSocket: ws.WebSocket;
}

export abstract class VoIP<T extends Record<keyof T, any[]>> extends EventEmitter<VoIPEvents & T> {

    protected webSocket: ws.WebSocket;

    constructor({ webSocket }: VoIPOptions) {
        super();

        this.webSocket = webSocket;
    }

    protected abstract onWebSocketMessage(data: ws.RawData, isBinary: boolean): void;
    public abstract onAudio(buffer: Buffer): void;
    public abstract onStopAudioPlayback(): void;
}