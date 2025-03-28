/* eslint-disable @typescript-eslint/no-unused-vars */
import * as ws from 'ws';
import { VoIP, VoIPOptions } from './voip.js';
import Telnyx from 'telnyx';
import { log } from '../logger.js';

interface TelnyxVoIPEvents {
    'start': [string];
}

export interface TelnyxVoIPOptions extends VoIPOptions {
    client: Telnyx;
}

export class TelnyxVoIP extends VoIP<TelnyxVoIPEvents> {

    protected client: Telnyx;
    protected callControlID?: string;

    constructor({ client, webSocket }: TelnyxVoIPOptions) {
        super({ webSocket });
        this.onWebSocketMessage = this.onWebSocketMessage.bind(this);
        this.onAudio = this.onAudio.bind(this);
        this.onStopAudioPlayback = this.onStopAudioPlayback.bind(this);

        this.client = client;
        this.webSocket.on('message', this.onWebSocketMessage);
    }

    protected onWebSocketMessage(data: ws.WebSocket.RawData, isBinary: boolean): void {
        try {
            const message = JSON.parse(data.toString());
            if (message.event == 'start') {
                this.emit('start', message.start.call_control_id);
                this.callControlID = message.start.call_control_id;
            }
            else if (message.event == 'media') {
                this.emit('audio', Buffer.from(message.media.payload, 'base64'));
            }
        }
        catch (err) {
            log.error(err);
        }
    }

    public onAudio(buffer: Buffer): void {
        try {
            this.webSocket.send(JSON.stringify({
                event: 'media',
                media: {
                    payload: buffer.toString('base64'),
                },
            }));
        }
        catch (err) {
            log.error(err);
        }
    }

    public async onStopAudioPlayback(): Promise<void> {
        try {
            if (this.callControlID) {
                const result = await this.client.calls.playbackStop(this.callControlID, {
                    stop: 'all',
                    overlay: false,
                });
            }
        }
        catch (err) {
            log.error(err);
        }
    }
}