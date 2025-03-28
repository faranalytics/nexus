import { VoIP } from './voip/voip.js';
import { TTS } from './tts/tts.js';
import { STT } from './stt/stt.js';
import { Agent } from './agent/agent.js';

export interface DialogueOptions {
    voip: VoIP<any>;
    stt: STT;
    tts: TTS;
    agent: Agent;
}

export class Dialogue {

    protected voip: VoIP<any>;
    protected stt: STT;
    protected tts: TTS;
    protected agent: Agent;

    constructor({ voip, stt, tts, agent }: DialogueOptions) {
        this.voip = voip;
        this.stt = stt;
        this.tts = tts;
        this.agent = agent;

        this.voip.on('audio', this.stt.onAudio);
        this.stt.on('transcript', this.agent.onTranscript);
        this.agent.on('agent_message', this.tts.onAgentMessage);
        this.agent.on('stop_audio_playback', this.voip.onStopAudioPlayback);
        this.tts.on('audio', this.voip.onAudio);
    }
}