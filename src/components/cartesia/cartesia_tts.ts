import { log } from "../../commons/logger.js";
import { UUID } from "node:crypto";
import { EventEmitter } from "node:events";
import { TTS, TTSEvents } from "../../interfaces/tts.js";
import * as ws from "ws";
import { once } from "node:events";
import { CartesiaChunk, CartesiaMessage } from "./types.js";

export interface CartesiaTTSEvents {
  "done": [UUID];
}

export interface CartesiaTTSOptions {
  apiKey: string;
}

export class CartesiaTTS extends EventEmitter<CartesiaTTSEvents> implements TTS {

  public emitter: EventEmitter<TTSEvents>;

  protected mutex: Promise<void>;
  protected aborts: Set<UUID>;
  protected outputFormat: { container: string, encoding: string, sample_rate: number };
  protected apiKey: string;
  protected cartesiaURL: string;
  protected webSocket: ws.WebSocket;
  protected audio: Buffer;
  protected timeout?: NodeJS.Timeout;
  protected uuid?: UUID;
  protected done: boolean;
  protected start: boolean;

  constructor({ apiKey }: CartesiaTTSOptions) {
    super();
    this.mutex = Promise.resolve();
    this.aborts = new Set();
    this.apiKey = apiKey;
    this.cartesiaURL = `wss://api.cartesia.ai/tts/websocket?cartesia_version=2024-11-13&api_key=${this.apiKey}`;
    this.webSocket = new ws.WebSocket(this.cartesiaURL);
    this.audio = Buffer.alloc(0);
    this.emitter = new EventEmitter();
    this.done = false;
    this.start = false;
    this.outputFormat = {
      container: "raw",
      encoding: "pcm_mulaw",
      sample_rate: 8000,
    };

    this.webSocket.on("message", this.onMessage);
    this.webSocket.on("error", log.error);
    this.emitter.once("dispose", this.onDispose);
  }

  public onAbortAudio = (): void => {
    try {
      if (this.uuid) {
        this.aborts.add(this.uuid);
      }
    }
    catch (err) {
      log.error(err);
    }
  };

  public onAbortTranscript = (uuid: UUID): void => {
    try {
      this.aborts.add(uuid);
    }
    catch (err) {
      log.error(err);
    }
  };

  public onTranscript = (uuid: UUID, transcript: string): void => {
    this.mutex = (async () => {
      try {
        await this.mutex;

        this.uuid = uuid;

        if (this.aborts.has(uuid)) {
          this.aborts.delete(uuid);
          return;
        }

        if (!(this.webSocket.readyState == this.webSocket.OPEN)) {
          await once(this.webSocket, "open");
        }

        const options = {
          context_id: uuid,
          language: "en",
          model_id: "sonic-2",
          voice: {
            mode: "id",
            id: "694f9389-aac1-45b6-b726-9d9369183238",
          },
          add_timestamps: true,
          output_format: this.outputFormat,
          continue: false
        };

        log.info(JSON.stringify(transcript));
        const message = JSON.stringify({ ...options, ...{ transcript } });
        this.webSocket.send(message);
        this.done = false;
        this.start = true;
        this.timeout = setTimeout(this.onTime);
        await once(this.emitter, "transcript_dispatched");
      }
      catch (err) {
        log.error(err);
      }
    })();
  };

  protected onMessage = (data: string): void => {
    const message = JSON.parse(data) as CartesiaMessage;

    if (message.context_id != this.uuid) {
      return;
    }

    if (this.aborts.has(this.uuid)) {
      this.cancelAudio();
      return;
    }

    if (message.type == "chunk") {
      this.audio = Buffer.concat([this.audio, Buffer.from((message as CartesiaChunk).data, "base64")]);
    }
    else if (message.type == "done") {
      log.info(message);
      this.done = true;
      this.emit("done", this.uuid);
    }
    else {
      log.info(message);
    }
  };

  protected onTime = (): void => {
    try {
      log.info("CartesiaTTs/onTime");
      if (this.uuid) {
        if (this.aborts.has(this.uuid)) {
          this.cancelAudio();
          return;
        }

        let audio;
        if (this.start) {
          audio = this.audio.subarray(0, 8000).toString("base64");
          this.audio = this.audio.subarray(8000);
          this.start = false;
        }
        else {
          audio = this.audio.subarray(0, 4000).toString("base64");
          this.audio = this.audio.subarray(4000);
        }

        if (audio) {
          this.emitter.emit("audio_out", this.uuid, audio);
          log.info("CartesiaTTs/onTime/emit/audio_out");
        }

        if (!this.done || this.audio.length != 0) {
          this.timeout = setTimeout(this.onTime, 500);
        }

        if (this.done && this.audio.length == 0) {
          this.emitter.emit("transcript_dispatched", this.uuid);
          log.info("CartesiaTTs/onTime/emit/transcript_dispatched");
        }
      }
    }
    catch (err) {
      log.error(err);
    }
  };

  protected cancelAudio() {
    if (this.uuid) {
      log.notice(`Abort: ${this.uuid ?? ""}`, "CartesiaTTs/onTime");
      if (!this.done) {
        const message = JSON.stringify({ context_id: this.uuid, cancel: true });
        this.webSocket.send(message);
      }
      this.audio = Buffer.alloc(0);
      clearTimeout(this.timeout);
      this.aborts.delete(this.uuid);
      this.emitter.emit("transcript_dispatched", this.uuid);
      delete this.uuid;
    }
  }

  public onDispose = (): void => {
    this.webSocket.send(JSON.stringify({ context_id: this.uuid, cancel: true }));
    this.webSocket.close();
    clearTimeout(this.timeout);
    this.emitter.removeAllListeners();
  };
}