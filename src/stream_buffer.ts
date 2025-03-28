import { Writable } from 'node:stream';

export class StreamBuffer extends Writable {

    public buffer: Buffer = Buffer.allocUnsafe(0);

    public _write(chunk: string | Buffer, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
        if (typeof chunk == 'string') {
            chunk = Buffer.from(chunk, 'utf8');
        }
        this.buffer = Buffer.concat([this.buffer, chunk]);
        callback();
    }
}