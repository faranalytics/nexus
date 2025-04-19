import { DeepgramSTT, CartesiaTTS, OpenAIAgent, Dialogue, ControllerProxy, log, SyslogLevel } from "@farar/nexus";
import { VoIP } from "../../dist/interfaces/voip.js";

log.setLevel(SyslogLevel.NOTICE);

const {
  DEEPGRAM_API_KEY = "",
  CARTESIA_API_KEY = "",
  OPENAI_API_KEY = "",
  OPENAI_SYSTEM_MESSAGE = "",
  OPENAI_GREETING_MESSAGE = "",
} = process.env;

const controller = new ControllerProxy();

controller.on("init", (voip: VoIP) => {

  const stt = new DeepgramSTT({ apiKey: DEEPGRAM_API_KEY, openAIAPIKey: OPENAI_API_KEY });
  const tts = new CartesiaTTS({ apiKey: CARTESIA_API_KEY });
  const agent = new OpenAIAgent({ apiKey: OPENAI_API_KEY, system: OPENAI_SYSTEM_MESSAGE, greeting: OPENAI_GREETING_MESSAGE });

  new Dialogue({ voip, stt, tts, agent });
});
