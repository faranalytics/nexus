/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-unused-vars */
import * as http from 'node:http';
import * as https from 'node:https';
import * as fs from 'node:fs';
import * as ws from 'ws';
import { once } from 'node:events';
import { Writable, Duplex } from 'node:stream';
import { API_KEY } from './secrets.js';

class StreamBuffer extends Writable {
    public buffer: Buffer = Buffer.allocUnsafe(0);
    _write(chunk: string | Buffer, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
        if (!(chunk instanceof Buffer)) {
            chunk = Buffer.from(chunk);
        }
        this.buffer = Buffer.concat([this.buffer, chunk]);
        callback();
    }
}

const options = {
    key: fs.readFileSync('./secrets/farar_net.key'),
    cert: fs.readFileSync('./secrets/farar_net.pub'),
};

const server = https.createServer(options);
const wss = new ws.WebSocketServer({ noServer: true });

interface RequestData {
    data: {
        event_type: string, payload: {
            call_control_id: string
        }
    }
};


server.on('request', async (req: http.IncomingMessage, res: http.ServerResponse<http.IncomingMessage>) => {
    console.log('http:request');
    req.on('error', console.error);
    res.on('error', console.error);
    console.log(new Date().toLocaleString());
    const streamBuffer = new StreamBuffer();
    req.pipe(streamBuffer);
    await once(req, 'end');
    const body: RequestData = JSON.parse(streamBuffer.buffer.toString('utf-8'));
    console.log(body);
    if (body.data.event_type == 'call.initiated') {
        const callControlId = body.data.payload.call_control_id;
        try {
            let response: Response;

            response = await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/answer`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                method: 'POST'
            });

            console.log(await response.json());

            response = await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/streaming_start`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                method: 'POST',
                body: JSON.stringify({
                    'stream_url': 'wss://farar.net:3443/',
                    // 'stream_track': 'both_tracks',
                    'stream_bidirectional_mode': 'rtp'
                })
            });

        }
        catch (e) {
            console.error(e);
        }
    }
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end();
});

server.on('upgrade', (req: http.IncomingMessage, socket: Duplex, head: Buffer) => {
    console.log('upgrade');
    wss.handleUpgrade(req, socket, head, function done(ws) {
        wss.emit('connection', ws, req);
    });
});

wss.on('connection', async (socket: ws.WebSocket, req: http.IncomingMessage) => {
    console.log('wss:connection');
    socket.on('error', console.error);
    socket.on('message', (data: ws.RawData, isBinary: boolean) => {
        console.log('wss:message', isBinary);
        const message = JSON.parse(data.toString());
        console.log(message);
        if (message.event == 'media') {
            socket.send(JSON.stringify({
                'event': 'media',
                'media': {
                    'payload': message.media.payload
                }
            }));
        }
    });

});

server.listen(3443, '0.0.0.0');

await once(server, 'listening');

console.log(new Date().toLocaleString());

