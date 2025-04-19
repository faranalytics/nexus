import { UUID } from "node:crypto";
import { VoIP, VoIPEvents } from "../interfaces/voip.js";
import { EventEmitter } from "node:stream";
import { Agent } from "port_agent";
import { log } from "./logger.js";
import { Metadata } from "./metadata.js";

export interface VoIPProxyOptions {
  uuid: UUID;
  agent: Agent;
}

export class VoIPProxy implements VoIP {

  public emitter: EventEmitter<VoIPEvents>;

  protected uuid: UUID;
  protected agent: Agent;

  constructor({ uuid, agent }: VoIPProxyOptions) {
    this.uuid = uuid;
    this.emitter = new EventEmitter();
    this.agent = agent;
    this.agent.register(this.uuid, (event: "audio_in" | "metadata" | "streaming" | "dispose", data) => {
      if (event == "audio_in") {
        this.emitter.emit("audio_in", data as string);
      }
      else if (event == "streaming") {
        this.emitter.emit("streaming");
      }
      else if (event == "dispose") {
        this.emitter.emit("dispose");
      }
      else {
        this.emitter.emit("metadata", data as Metadata);
      }
    });
  }

  public onAudioOut = (uuid: UUID, data: string): void => {
    this.agent.call(this.uuid, "audio_out", uuid, data).catch(log.error);
  };
}