# Nexus

A modular `VoIP` ➞ `STT` ➞ `AI Agent` ➞ `TTS` ➞ `VoIP` implementation.

## Introduction

Nexus is a modular `VoIP` ➞ `STT` ➞ `AI Agent` ➞ `TTS` ➞ `VoIP` implementation. The current implementation provides a basic _demonstrational_ working example of using Telnyx for VoIP, Deepgram for STT, OpenAI for Conversational AI, and Cartesia for TTS. You can use one of the already implemented modules or subclass a base class and implement your own.

## Installation

Clone the repository.

```bash
git clone https://github.com/faranalytics/nexus.git
```

Change directory into the Nexus repository.

```bash
cd nexus
```

Build the Nexus package.

```bash
npm run clean:build
```

Change directory into your package directory and install the package.

```bash
npm install <path-to-the-nexus-respository>
```

## Usage

```ts
import * as https from "node:https";
import * as fs from "node:fs";
import * as ws from "ws";
import * as os from "node:os";
import * as pth from "node:path";
import { once } from "node:events";
import {
  TelnyxController,
  DeepgramSTT,
  CartesiaTTS,
  OpenAIAgent,
  Dialogue,
  TelnyxVoIP,
} from "@farar/nexus";
import {
  TELNYX_API_KEY,
  DEEPGRAM_API_KEY,
  CARTESIA_API_KEY,
  OPENAI_API_KEY,
  OPENAI_SYSTEM_MESSAGE,
  GREETING_MESSAGE,
} from "./secrets.js";

const httpServer = https.createServer({
  key: fs.readFileSync(pth.join(os.homedir(), ".certs/cert.key")),
  cert: fs.readFileSync(pth.join(os.homedir(), ".certs/cert.pub")),
});

httpServer.listen(3443, "0.0.0.0");

await once(httpServer, "listening");

const webSocketServer = new ws.WebSocketServer({ noServer: true });

const controller = new TelnyxController({
  apiKey: TELNYX_API_KEY,
  httpServer,
  webSocketServer,
});

controller.on("voip", (voip: TelnyxVoIP) => {
  const stt = new DeepgramSTT({
    apiKey: DEEPGRAM_API_KEY,
    openAIAPIKey: OPENAI_API_KEY,
  });
  const tts = new CartesiaTTS({
    apiKey: CARTESIA_API_KEY,
    greeting: GREETING_MESSAGE,
  });
  const agent = new OpenAIAgent({
    apiKey: OPENAI_API_KEY,
    system: OPENAI_SYSTEM_MESSAGE,
  });
  const dialogue = new Dialogue({ voip, stt, tts, agent });
});
```

## Modules

### VoIP provider

- [Telnyx](https://telnyx.com/)

### Speech to text (STT)

- [Deepgram](https://deepgram.com/)

### Text to speech (TTS)

- [Cartesia](https://cartesia.ai/)

### AI Agent

- [OpenAI](https://platform.openai.com/docs/overview)
