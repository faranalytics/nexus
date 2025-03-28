import * as http from 'node:http';
import { once } from 'node:events';
import { Telnyx } from 'telnyx';
import { Controller, ControllerOptions } from './controller.js';
import { StreamBuffer } from '../stream_buffer.js';
import * as ws from 'ws';
import { TelnyxVoIP } from '../voip/telnyx_voip.js';
import { log } from '../logger.js';

export interface HTTPRequestBody {
    data: {
        event_type: string,
        payload: {
            call_control_id: string
        }
    }
};

export interface TelnyxControllerOptions {
    apiKey: string;
}

export class TelnyxController extends Controller<TelnyxVoIP> {

    protected client: Telnyx;

    constructor({ apiKey, httpServer, webSocketServer }: TelnyxControllerOptions & ControllerOptions) {
        super({ httpServer, webSocketServer });
        this.onRequest = this.onRequest.bind(this);
        this.onConnection = this.onConnection.bind(this);

        this.client = new Telnyx(apiKey);

        this.httpServer.on('upgrade', this.onUpgrade);
        this.httpServer.on('request', this.onRequest);
        this.webSocketServer.on('connection', this.onConnection);
    }

    public async onRequest(req: http.IncomingMessage, res: http.ServerResponse<http.IncomingMessage>): Promise<void> {
        try {
            log.debug('http:request');
            req.on('error', log.error);
            res.on('error', log.error);
            log.debug(new Date().toLocaleString());
            const streamBuffer = new StreamBuffer();
            req.pipe(streamBuffer);
            await once(req, 'end');
            const body: HTTPRequestBody = JSON.parse(streamBuffer.buffer.toString('utf-8'));
            const callControlId = body.data.payload.call_control_id;
            if (body.data.event_type == 'call.initiated') {
                log.debug('call.initiated')
                await this.client.calls.answer(callControlId, {
                    stream_track: 'inbound_track',
                    send_silence_when_idle: true,
                    webhook_url_method: 'POST',
                    transcription: false,
                    record_channels: 'single',
                    record_format: 'mp3',
                    record_max_length: 0,
                    record_timeout_secs: 0,
                    record_track: 'both',
                    stream_bidirectional_codec: 'PCMU',
                });
            }
            else if (body.data.event_type == 'call.answered') {
                log.debug('call.answered');
                await this.client.calls.streamingStart(callControlId, {
                    stream_track: 'inbound_track',
                    enable_dialogflow: false,
                    stream_url: 'wss://farar.net:3443/',
                    stream_bidirectional_mode: 'rtp',
                    stream_bidirectional_codec: 'PCMU'
                });
            }

            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end();
        }
        catch (err) {
            log.error(err);
        }
    }

    protected async onConnection(socket: ws.WebSocket, req: http.IncomingMessage): Promise<void> {
        try {
            log.debug('wss:connection');
            socket.on('error', log.error);
            const voip = new TelnyxVoIP({ webSocket: socket, client: this.client });
            this.emit('voip', voip);
            voip.on('start', (call_control_id: string) => {

            });
        }
        catch (err) {
            log.error(err);
        }
    }
}