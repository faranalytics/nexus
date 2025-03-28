import { EventEmitter } from 'node:events';

export interface AgentEvents {
    'stop_audio_playback': [void];
    'abort_agent_message': [string];
    'agent_message': [string, string | null];
}

export abstract class Agent extends EventEmitter<AgentEvents> {

    constructor() {
        super();
    }
    
    public abstract onTranscript(text: string): Promise<void>;
}