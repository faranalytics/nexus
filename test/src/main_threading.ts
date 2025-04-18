import * as https from "node:https";
import * as fs from "node:fs";
import * as ws from "ws";
import { once } from "node:events";
import { TelnyxController, VoIPEvents, log, SyslogLevel } from "@farar/nexus";
import { EventEmitter } from "node:events";
import { Agent } from "port_agent";
import { Worker } from "node:worker_threads";
import { randomUUID, UUID } from "node:crypto";

log.setLevel(SyslogLevel.INFO);

const {
  TELNYX_API_KEY = "",
  KEY_FILE = "",
  CERT_FILE = "",
  PORT = 3443,
  HOST_NAME = "0.0.0.0",
  STREAM_URL = "wss://example.com:3443/"
} = process.env;

log.notice(new Date().toLocaleString());

const httpServer = https.createServer({
  key: fs.readFileSync(KEY_FILE),
  cert: fs.readFileSync(CERT_FILE),
});

httpServer.listen(parseInt(PORT.toString()), HOST_NAME);

await once(httpServer, "listening");

log.info(`httpServer is listening on ${PORT.toString()}, ${HOST_NAME}`);

const webSocketServer = new ws.WebSocketServer({ noServer: true });

const controller = new TelnyxController({
  apiKey: TELNYX_API_KEY,
  httpServer,
  webSocketServer,
  streamURL: STREAM_URL
});

controller.on("init", (emitter: EventEmitter<VoIPEvents>) => {
  try {
    const worker = new Worker(new URL(`file:///home/farar/workspace/repos/phone-thing/nexus/test/dist/worker.js?${Date.now().toString()}`));
    worker.on("error", log.error);
    const agent = new Agent(worker);
    const _uuid = randomUUID();
    emitter.on("audio_in", (data: string) => {
      agent.call(_uuid, "audio_in", data).catch(log.error);
    });
    emitter.on("streaming", () => {
      agent.call(_uuid, "streaming").catch(log.error);
    });
    agent.register(_uuid, (event: string, uuid: UUID, data: string) => {
      if (event == "audio_out") {
        emitter.emit("audio_out", uuid, data);
      }
    });
    agent.call("init", _uuid).catch(log.error);
  }
  catch (err) {
    log.error(err);
  }
});
