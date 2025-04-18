import { DeepgramSTT, CartesiaTTS, OpenAIAgent, Dialogue, VoIPEvents, Metadata, log, SyslogLevel } from "@farar/nexus";
import { EventEmitter } from "node:events";
import { Agent } from "port_agent";
import { parentPort } from "node:worker_threads";
import { UUID } from "node:crypto";

log.setLevel(SyslogLevel.NOTICE);

const {
  DEEPGRAM_API_KEY = "",
  CARTESIA_API_KEY = "",
  OPENAI_API_KEY = "",
  OPENAI_SYSTEM_MESSAGE = "",
  OPENAI_GREETING_MESSAGE = "",
} = process.env;

if (parentPort) {
  const portAgent = new Agent(parentPort);
  portAgent.register("init", (_uuid: UUID) => {

    const emitter = new EventEmitter<VoIPEvents>();

    const stt = new DeepgramSTT({ apiKey: DEEPGRAM_API_KEY, openAIAPIKey: OPENAI_API_KEY });
    const tts = new CartesiaTTS({ apiKey: CARTESIA_API_KEY });
    const agent = new OpenAIAgent({ apiKey: OPENAI_API_KEY, system: OPENAI_SYSTEM_MESSAGE, greeting: OPENAI_GREETING_MESSAGE });

    new Dialogue({ stt, tts, agent, emitter });

    portAgent.register(_uuid, (event: "audio_in" | "metadata" | "streaming" | "dispose", data) => {
      if (event == "audio_in") {
        emitter.emit("audio_in", data as string);
      }
      else if (event == "streaming") {
        emitter.emit("streaming");
      }
      else if (event == "dispose") {
        emitter.emit("dispose");
      }
      else {
        emitter.emit("metadata", data as Metadata);
      }
    });
    emitter.on("audio_out", (uuid: UUID, data: string) => {
      portAgent.call(_uuid, "audio_out", uuid, data).catch(log.error);
    });
  });
}
