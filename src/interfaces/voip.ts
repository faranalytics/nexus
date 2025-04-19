import EventEmitter from "node:events";
import { Metadata } from "../commons/metadata.js";
import { UUID } from "node:crypto";

export interface VoIPEvents {
  "audio_in": [string];
  "audio_out": [UUID, string];
  "metadata": [Metadata];
  "abort_transcript": [UUID];
  "streaming": [];
  "dispose": [];
}

export interface VoIP {
  emitter: EventEmitter<VoIPEvents>;
  onAudioOut: (uuid: UUID, data: string) => void;
}