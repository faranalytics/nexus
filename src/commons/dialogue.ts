import { EventEmitter } from "node:events";
import { Agent } from "../interfaces/agent.js";
import { STT } from "../interfaces/stt.js";
import { TTS } from "../interfaces/tts.js";
import { VoIPEvents } from "../interfaces/voip.js";
import { UUID } from "node:crypto";

interface DialogueEvents {
  "ready": []
}

export interface DialogueOptions {
  stt: STT;
  tts: TTS;
  agent: Agent;
  emitter: EventEmitter<VoIPEvents>;
}

export class Dialogue extends EventEmitter<DialogueEvents> {

  public emitter: EventEmitter<VoIPEvents>;

  protected stt: STT;
  protected tts: TTS;
  protected agent: Agent;
  protected isStreaming: boolean;
  protected audioOutQueue: string[];

  constructor({ stt, tts, agent, emitter }: DialogueOptions) {
    super();
    this.stt = stt;
    this.tts = tts;
    this.agent = agent;
    this.emitter = emitter;
    this.isStreaming = false;
    this.audioOutQueue = [];

    emitter.on("audio_in", stt.onAudio);
    emitter.on("streaming", agent.onStreaming);
    emitter.on("metadata", agent.onMetadata);
    emitter.on("dispose", stt.onDispose);
    emitter.on("dispose", tts.onDispose);
    emitter.on("dispose", agent.onDispose);

    stt.emitter.on("transcript", agent.onTranscript);
    stt.emitter.on("abort_audio", tts.onAbortAudio);

    tts.emitter.on("audio_out", (uuid: UUID, data: string)=>{
      this.emitter.emit("audio_out", uuid, data);
    });
    tts.emitter.on("transcript_dispatched", agent.onTranscriptDispatched);

    agent.emitter.on("transcript", tts.onTranscript);
    agent.emitter.on("abort_transcript", tts.onAbortTranscript);
  }
}