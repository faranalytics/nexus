/* eslint-disable @typescript-eslint/no-unused-vars */
import { Agent } from './agent.js';
import { OpenAI } from 'openai';
import { randomUUID } from 'node:crypto';
import { log } from '../logger.js';

export interface OpenAIAgentOptions {
    apiKey: string;
    system: string;
}

export class OpenAIAgent extends Agent {

    protected openAI: OpenAI;
    protected content: string;
    protected system: string;

    constructor({ apiKey, system }: OpenAIAgentOptions) {
        super();

        this.onTranscript = this.onTranscript.bind(this);

        this.openAI = new OpenAI({ 'apiKey': apiKey });
        this.content = '';
        this.system = system;
    }

    public async onTranscript(transcript: string): Promise<void> {
        try {

            this.content = this.content ? this.content + ' ' + transcript : transcript;

            log.debug(`Transcript: ${this.content}`);

            const content = this.content.slice(0);

            const completion = await this.openAI.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{
                    role: 'system',
                    content: this.system,
                },
                {
                    role: 'user',
                    content: this.content,
                }],
                temperature: 0
            });

            const message = completion.choices[0].message.content;

            log.debug(`Message: ${message}`);

            if (this.content !== content) {
                return;
            }

            const uuid = randomUUID();

            this.emit('agent_message', uuid, completion.choices[0].message.content);

            this.content = '';
        }
        catch (err) {
            log.error(err);
        }
    }
}