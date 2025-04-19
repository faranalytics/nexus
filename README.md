# Nexus

A modular `VoIP` ➞ `STT` ➞ `AI Agent` ➞ `TTS` ➞ `VoIP` implementation.

## Introduction

Nexus is a modular `VoIP` ➞ `STT` ➞ `AI Agent` ➞ `TTS` ➞ `VoIP` implementation. Interfaces are provided for each component of the VoIP application. A Nexus application is contructed by passing a `VoIP`, `STT`, `Agent`, and `TTS` implementation into a `Dialogue` implementation.

```ts
const stt = new DeepgramSTT({
  apiKey: DEEPGRAM_API_KEY,
  openAIAPIKey: OPENAI_API_KEY,
});
const tts = new CartesiaTTS({ apiKey: CARTESIA_API_KEY });
const agent = new OpenAIAgent({
  apiKey: OPENAI_API_KEY,
  system: OPENAI_SYSTEM_MESSAGE,
  greeting: OPENAI_GREETING_MESSAGE,
});
const dialogue = new Dialogue({ voip, stt, tts, agent });
dialogue.start();
```

Working examples of `VoIP`, `STT`, `Agent`, and `TTS` implementations are provided in the [implementations](https://github.com/faranalytics/nexus/tree/main/src/components) directory. You can use an implementation _as-is_, subclass it, or implement your own.

- VoIP: A Telnyx Controller and Telnyx VoIP implementation.
- STT: An implementation that uses Deepgram for speech to text.
- Agent: A simple OpenAI Agent implementation.
- TTS: An implementation that uses Cartesia for text to speech.

## Development Installation

### Clone the Nexus repository and build the package

#### Clone the repository.

```bash
git clone https://github.com/faranalytics/nexus.git
```

#### Change directory into the Nexus repository.

```bash
cd nexus
```

#### Install the package dependencies.

```bash
npm install && npm update
```

#### Build the Nexus package.

You can use the `clean:build` script in order to do a clean build.

```bash
npm run clean:build
```

Alternatively, you can use the `tsc:watch` script in order to watch and build the package. This will build the package each time you make a change to a file in `./src`. If you use the `tsc:watch` script, you will need to open a new terminal in order to build and run your application.

```bash
npm run tsc:watch
```

### Install your package

#### Change directory into your package directory and install the package.

```bash
npm install <path-to-the-nexus-respository> --save
```

You should now be able to import Nexus artifacts into your package.

```ts
import {
  TelnyxController,
  DeepgramSTT,
  CartesiaTTS,
  OpenAIAgent,
  Dialogue,
  log,
  SyslogLevel,
} from "@farar/nexus";
```

## Configuration

You can create a `.env` file in order to provide configuration settings for your application.

`.env`

```ini
TELNYX_API_KEY = "";
DEEPGRAM_API_KEY = "";
CARTESIA_API_KEY = "";
OPENAI_API_KEY = "";
OPENAI_SYSTEM_MESSAGE = "You are handling a phone call.  You have personal preferences and you are very opinionated.  Respond with one concise sentence."
OPENAI_GREETING_MESSAGE = "I'm ready."
KEY_FILE = ""
CERT_FILE = ""
PORT = 3443
HOST_NAME = "0.0.0.0"
STREAM_URL = "wss://example.com:3443/"
```

## Usage

An [example](https://github.com/faranalytics/nexus/tree/main/example) application is provided in the example subpackage.

```ts
import * as https from "node:https";
import * as fs from "node:fs";
import * as ws from "ws";
import { once } from "node:events";
import {
  TelnyxController,
  DeepgramSTT,
  CartesiaTTS,
  OpenAIAgent,
  Dialogue,
  SyslogLevel,
  VoIP,
} from "@farar/nexus";

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
  STREAM_URL = "wss://example.com:3443/",
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
  streamURL: STREAM_URL,
});

controller.on("init", (voip: VoIP) => {
  const stt = new DeepgramSTT({
    apiKey: DEEPGRAM_API_KEY,
    openAIAPIKey: OPENAI_API_KEY,
  });
  const tts = new CartesiaTTS({ apiKey: CARTESIA_API_KEY });
  const agent = new OpenAIAgent({
    apiKey: OPENAI_API_KEY,
    system: OPENAI_SYSTEM_MESSAGE,
    greeting: OPENAI_GREETING_MESSAGE,
  });
  const dialogue = new Dialogue({ voip, stt, tts, agent });
  dialogue.start();
});
```

## Modules

Nexus provides example [implementations](https://github.com/faranalytics/nexus/tree/main/src/implementations) for each of the artifacts that comprise a VoIP Agent application.

### VoIP provider

- [Telnyx](https://telnyx.com/)

### Speech to text (STT)

- [Deepgram](https://deepgram.com/)

### Text to speech (TTS)

- [Cartesia](https://cartesia.ai/)

### AI Agent

- [OpenAI](https://platform.openai.com/docs/overview)
