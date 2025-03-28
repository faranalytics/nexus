import * as http from 'node:http';
import * as ws from 'ws';
import { EventEmitter } from 'node:events';
import { Duplex } from 'node:stream';
import { Dialogue } from '../dialogue.js';
import { log } from '../logger.js';

interface ControllerEvents<T> {
    'voip': [T];
}

export interface ControllerOptions {
    httpServer: http.Server;
    webSocketServer: ws.Server;
}

export abstract class Controller<T> extends EventEmitter<ControllerEvents<T>> {

    protected httpServer: http.Server;
    protected webSocketServer: ws.WebSocketServer;
    protected callIdDialogue: Map<string, Dialogue>;

    constructor({ httpServer, webSocketServer }: ControllerOptions) {
        super();
        this.onUpgrade = this.onUpgrade.bind(this);
        this.onRequest = this.onRequest.bind(this);
        this.onConnection = this.onConnection.bind(this);
        this.httpServer = httpServer;
        this.webSocketServer = webSocketServer;
        this.callIdDialogue = new Map();
    }

    protected onUpgrade(req: http.IncomingMessage, socket: Duplex, head: Buffer): void {
        try {
            socket.on('error', log.error);
            this.webSocketServer.handleUpgrade(req, socket, head, (client: ws.WebSocket, request: http.IncomingMessage) => {
                this.webSocketServer.emit('connection', client, request);
            });
        }
        catch (err) {
            log.error(err);
        }
    }

    protected abstract onRequest(req: http.IncomingMessage, res: http.ServerResponse<http.IncomingMessage>): Promise<void>;

    protected abstract onConnection(socket: ws.WebSocket, req: http.IncomingMessage): Promise<void>;
}