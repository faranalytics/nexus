import * as https from "node:https";
import * as fs from "node:fs";
import * as ws from "ws";
import { once } from "node:events";
import { TelnyxController, DeepgramSTT, CartesiaTTS, OpenAIAgent, Dialogue, log, SyslogLevel, VoIP } from "@farar/nexus";

log.setLevel(SyslogLevel.NOTICE);

const {
  TELNYX_API_KEY = "",
  DEEPGRAM_API_KEY = "",
  CARTESIA_API_KEY = "",
  OPENAI_API_KEY = "",
  OPENAI_SYSTEM_MESSAGE = "",
  OPENAI_GREETING_MESSAGE = "",
  KEY_FILE = "",
  CERT_FILE = "",
  PORT = 3443,
  HOST_NAME = "0.0.0.0",
  STREAM_URL = "wss://example.com:3443/"
} = process.env;

log.info(new Date().toLocaleString());

const httpServer = https.createServer({
  key: fs.readFileSync(KEY_FILE),
  cert: fs.readFileSync(CERT_FILE),
});

httpServer.listen(parseInt(PORT.toString()), HOST_NAME);

await once(httpServer, "listening");

log.notice(`httpServer is listening on ${PORT.toString()}, ${HOST_NAME}`);

const webSocketServer = new ws.WebSocketServer({ noServer: true });

const controller = new TelnyxController({
  apiKey: TELNYX_API_KEY,
  httpServer,
  webSocketServer,
  streamURL: STREAM_URL
});

controller.on("init", (voip: VoIP) => {  
  const stt = new DeepgramSTT({ apiKey: DEEPGRAM_API_KEY, openAIAPIKey: OPENAI_API_KEY });
  const tts = new CartesiaTTS({ apiKey: CARTESIA_API_KEY });
  const agent = new OpenAIAgent({ apiKey: OPENAI_API_KEY, system: OPENAI_SYSTEM_MESSAGE, greeting: OPENAI_GREETING_MESSAGE });
  const dialogue = new Dialogue({ voip, stt, tts, agent });
  dialogue.start();
});
