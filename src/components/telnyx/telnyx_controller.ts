import { log } from "../../commons/logger.js";
import * as http from "node:http";
import { once } from "node:events";
import { Telnyx } from "telnyx";
import { StreamBuffer } from "../../commons/stream_buffer.js";
import * as ws from "ws";
import { EventEmitter } from "node:events";
import { Duplex } from "node:stream";
import { ControllerEvents } from "../../interfaces/controller.js";
import { VoIPEvents } from "../../interfaces/voip.js";
import { Metadata } from "../../commons/metadata.js";
import { UUID } from "node:crypto";
import { WebSocketMessage } from "./types.js";

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
  httpServer: http.Server;
  webSocketServer: ws.Server;
  streamURL: string;
}

export class TelnyxController extends EventEmitter<ControllerEvents> {

  protected client: Telnyx;
  protected httpServer: http.Server;
  protected webSocketServer: ws.WebSocketServer;
  protected streamURL: string;
  protected registrar: Map<string, Registrant>;

  constructor({ apiKey, httpServer, webSocketServer, streamURL }: TelnyxControllerOptions) {
    super();

    this.client = new Telnyx(apiKey);
    this.httpServer = httpServer;
    this.webSocketServer = webSocketServer;
    this.streamURL = streamURL;
    this.registrar = new Map();

    this.httpServer.on("upgrade", this.onUpgrade);
    this.httpServer.on("request", this.onRequest);
    this.webSocketServer.on("connection", this.onConnection);
  }

  protected onRequest = (req: http.IncomingMessage, res: http.ServerResponse): void => {
    void (async () => {
      try {
        req.on("error", log.error);
        res.on("error", log.error);
        const streamBuffer = new StreamBuffer();
        req.pipe(streamBuffer);
        await once(req, "end");
        const body = JSON.parse(streamBuffer.buffer.toString("utf-8")) as HTTPRequestBody;
        log.info(JSON.stringify(body, null, 2), "telnyx_controller/onRequest/body");
        const callControlId = body.data.payload.call_control_id;
        if (body.data.event_type == "call.initiated") {
          log.info(body, "telnyx_controller/onRequest/call.initiated");
          this.registrar.set(callControlId, new Registrant());
          const registrant = this.registrar.get(callControlId);
          if (registrant) {
            this.emit("init", registrant.emitter);
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            await this.client.calls.answer(callControlId, {
              stream_track: "inbound_track",
              send_silence_when_idle: true,
              webhook_url_method: "POST",
              transcription: false,
              stream_bidirectional_mode: "rtp",
              stream_bidirectional_codec: "PCMU",
            });
          }
        }
        else if (body.data.event_type == "call.answered") {
          log.info(body, "telnyx_controller/onRequest/call.answered");
          await this.client.calls.streamingStart(callControlId, {
            stream_track: "inbound_track",
            enable_dialogflow: false,
            stream_url: this.streamURL,
            stream_bidirectional_mode: "rtp",
            stream_bidirectional_target_legs: "self",
            stream_bidirectional_codec: "PCMU"
          });
        }
        else if (body.data.event_type == "call.hangup") {
          log.info(body, "telnyx_controller/onRequest/call.hangup");
          const registrant = this.registrar.get(callControlId);
          if (registrant) {
            registrant.emitter.emit("dispose");
            this.registrar.delete(callControlId);
            registrant.emitter.removeAllListeners();
          }
        }
        else if (body.data.event_type == "streaming.started") {
          log.info(body, "telnyx_controller/onRequest/streaming.started");
        }
        else if (body.data.event_type == "streaming.stopped") {
          log.info(body, "telnyx_controller/onRequest/streaming.stopped");
        }
        else {
          log.notice(body, "telnyx_controller/onRequest");
        }
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end();
      }
      catch (err) {
        log.error(err);
      }
    })();
  };

  protected onConnection = (webSocket: ws.WebSocket): void => {
    try {
      log.info("telnyx_controller/onConnection");
      webSocket.on("error", log.error);
      new WebSocketListener({
        webSocket,
        registrar: this.registrar
      });
    }
    catch (err) {
      log.error(err);
    }
  };

  protected onUpgrade = (req: http.IncomingMessage, socket: Duplex, head: Buffer): void => {
    try {
      log.debug("telnyx_controller/onUpgrade");
      socket.on("error", log.error);
      this.webSocketServer.handleUpgrade(req, socket, head, (client: ws.WebSocket, request: http.IncomingMessage) => {
        this.webSocketServer.emit("connection", client, request);
      });
    }
    catch (err) {
      log.error(err);
    }
  };
}

class Registrant {
  public webSocketListener?: WebSocketListener;
  public emitter: EventEmitter<VoIPEvents>;
  public events: string[];

  constructor() {
    this.events = [];
    this.emitter = new EventEmitter<VoIPEvents>();
  }
}

interface WebSocketListenerOptions {
  webSocket: ws.WebSocket;
  registrar: Map<string, Registrant>;
}

class WebSocketListener {

  public emitter?: EventEmitter<VoIPEvents>;

  protected webSocket: ws.WebSocket;
  protected registrar: Map<string, Registrant>;
  protected metadata?: Metadata;
  protected callControlId?: string;

  constructor({ webSocket, registrar }: WebSocketListenerOptions) {
    this.webSocket = webSocket;
    this.registrar = registrar;
    this.webSocket.on("message", this.onWebSocketMessage);
    this.webSocket.on("error", log.error);
  }

  protected onWebSocketMessage = (data: ws.WebSocket.RawData): void => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      const message = JSON.parse(data.toString()) as WebSocketMessage;
      if (message.event == "media") {
        log.debug(JSON.stringify(message, null, 2), "telnyx_voip/onWebSocketMessage/event/media");
        this.emitter?.emit("audio_in", message.media.payload);
      }
      else if (message.event == "start") {
        log.info(JSON.stringify(message, null, 2), "telnyx_voip/onWebSocketMessage/event/start");
        this.callControlId = message.start.call_control_id;
        this.metadata = new Metadata({
          to: message.start.to,
          from: message.start.from,
          channels: message.start.media_format.channels,
          encoding: message.start.media_format.encoding,
          sampleRate: message.start.media_format.sample_rate,
          serverCallStartTime: (new Date()).toISOString()
        });
        this.emitter = this.registrar.get(this.callControlId)?.emitter;
        this.emitter?.emit("streaming");
        this.emitter?.emit("metadata", this.metadata);
        this.emitter?.on("audio_out", (uuid: UUID, data: string) => {
          this.webSocket.send(JSON.stringify({
            event: "media",
            media: {
              payload: data,
            },
          }));
        });
      }
      else if (message.event == "stop") {
        this.webSocket.close();
        this.webSocket.off("message", this.onWebSocketMessage);
        if (this.callControlId) {
          this.registrar.delete(this.callControlId);
        }
        this.emitter?.emit("dispose");
        this.emitter?.removeAllListeners();
      }
      else {
        log.info(JSON.stringify(message, null, 2), "telnyx_voip/onWebSocketMessage/event/unhandled");
      }
    }
    catch (err) {
      log.error(err, "telnyx_voip/onWebSocketMessage");
    }
  };
}