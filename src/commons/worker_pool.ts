import { EventEmitter } from "stream";
import * as worker_threads from "node:worker_threads";
import { Agent } from "port_agent";
import { randomUUID, UUID } from "node:crypto";
import { VoIP } from "../interfaces/voip.js";
import { ControllerEvents } from "../interfaces/controller.js";
import { log } from "./logger.js";

export interface WorkerPoolOptions {
  controller: EventEmitter<ControllerEvents>;
  workerURL: string | URL;
}
export class WorkerPool {

  protected controller: EventEmitter<ControllerEvents>;
  protected workerURL: string | URL;

  constructor({ controller, workerURL }: WorkerPoolOptions) {
    this.controller = controller;
    this.workerURL = workerURL;
    this.controller.on("init", this.onInit);

    // TODO: Implement a worker pool.
  }

  protected onInit = (voip: VoIP): void => {
    try {
      const worker = new worker_threads.Worker(new URL(`${this.workerURL}?${Date.now().toString()}`));
      worker.on("error", log.error);
      const agent = new Agent(worker);
      const uuid = randomUUID();
      voip.emitter.on("audio_in", (data: string) => {
        agent.call(uuid, "audio_in", data).catch(log.error);
      });
      voip.emitter.on("streaming", () => {
        agent.call(uuid, "streaming").catch(log.error);
      });
      voip.emitter.on("metadata", () => {
        agent.call(uuid, "metadata").catch(log.error);
      });
      voip.emitter.on("dispose", ()=>{
        agent.deregister(uuid);
      });
      agent.register(uuid, (event: string, uuid: UUID, data: string) => {
        if (event == "audio_out") {
          voip.onAudioOut(uuid, data);
        }
      });
      agent.call("init", uuid).catch(log.error);
    }
    catch (err) {
      log.error(err);
    }
  };
}