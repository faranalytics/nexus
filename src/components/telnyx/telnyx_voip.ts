import { EventEmitter } from "node:events";
import { VoIP, VoIPEvents } from "../../interfaces/voip.js";
import { UUID } from "crypto";
import * as ws from "ws";
import { Metadata } from "../../commons/metadata.js";
import { log } from "../../commons/logger.js";
import { WebSocketMessage } from "./types.js";

export class TelnyxVoIP implements VoIP {

  public emitter: import("events") <VoIPEvents>;
  protected webSocket?: ws.WebSocket;
  protected metadata?: Metadata;
  protected callControlId?: string;

  constructor() {
    this.emitter = new EventEmitter();

  }

  public onAudioOut = (uuid: UUID, data: string): void => {
    if (this.webSocket) {
      this.webSocket.send(JSON.stringify({
        event: "media",
        media: {
          payload: data,
        },
      }));
    }
  };

  public setWebSocket(webScoket: ws.WebSocket) {
    this.webSocket = webScoket;
    this.webSocket.on("message", this.onWebSocketMessage);
    this.webSocket.on("error", log.error);
    this.emitter.emit("streaming");
  }

  public setMetadata(metadata: Metadata) {
    this.metadata = metadata;
    this.emitter.emit("metadata", this.metadata);
  }

  protected onWebSocketMessage = (data: ws.WebSocket.RawData): void => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      const message = JSON.parse(data.toString()) as WebSocketMessage;
      if (message.event == "media") {
        log.debug(JSON.stringify(message, null, 2), "telnyx_voip/onWebSocketMessage/event/media");
        this.emitter.emit("audio_in", message.media.payload);
      }
      else if (message.event == "start") {
        throw new Error("An unexpected `start` event message was emitted by the WebSocket.");
      }
      else if (message.event == "stop") {
        if (this.webSocket) {
          this.webSocket.close();
          this.webSocket.off("message", this.onWebSocketMessage);
        }
        this.emitter.emit("dispose");
        this.emitter.removeAllListeners();
      }
      else {
        log.info(JSON.stringify(message, null, 2), "telnyx_voip/onWebSocketMessage/event/unhandled");
      }
    }
    catch (err) {
      log.error(err, "telnyx_voip/onWebSocketMessage");
      this.webSocket?.off("message", this.onWebSocketMessage);
    }
  };
}