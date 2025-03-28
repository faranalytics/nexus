import { log } from './logger.js';
import * as https from 'node:https';
import * as fs from 'node:fs';
import * as ws from 'ws';
import * as os from 'node:os';
import * as pth from 'node:path';
import { once } from 'node:events';
import { TelnyxController, DeepgramSTT, CartesiaTTS, OpenAIAgent, Dialogue, TelnyxVoIP } from '@farar/nexus';
import { TELNYX_API_KEY, DEEPGRAM_API_KEY, CARTESIA_API_KEY, OPENAI_API_KEY, OPENAI_SYSTEM_MESSAGE, GREETING_MESSAGE } from './secrets.js';

log.debug(new Date().toLocaleString());

const httpServer = https.createServer({
    key: fs.readFileSync(pth.join(os.homedir(), '.certs/farar_net.key')),
    cert: fs.readFileSync(pth.join(os.homedir(), '.certs/farar_net.pub')),
});

httpServer.listen(3443, '0.0.0.0');

await once(httpServer, 'listening');

const webSocketServer = new ws.WebSocketServer({ noServer: true });

const controller = new TelnyxController({ apiKey: TELNYX_API_KEY, httpServer, webSocketServer });

controller.on('voip', (voip: TelnyxVoIP) => {
    const stt = new DeepgramSTT({ apiKey: DEEPGRAM_API_KEY, openAIAPIKey: OPENAI_API_KEY });
    const tts = new CartesiaTTS({ apiKey: CARTESIA_API_KEY, greeting: GREETING_MESSAGE });
    const agent = new OpenAIAgent({ apiKey: OPENAI_API_KEY, system: OPENAI_SYSTEM_MESSAGE });
    const dialogue = new Dialogue({ voip, stt, tts, agent });
});
