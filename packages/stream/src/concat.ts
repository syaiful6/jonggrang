import { Writable } from 'readable-stream';

/**
 * Assume the readable stream piped to this writable always a Buffer
 */
class ConcatStream extends Writable {
  private _buffers: Buffer[];
  private _bufferLength: number;
  constructor(readonly cb: (error: Error | null | undefined, val?: Buffer) => void) {
    super();
    this._buffers = [];
    this._bufferLength = 0;
    this.once('finish', () => cb(null, Buffer.concat(this._buffers, this._bufferLength)));
    this.once('error', cb);
  }

  _write(chunk: any, encoding: string, callback: Function) {
    if (Buffer.isBuffer(chunk)) {
      this._buffers.push(chunk);
      this._bufferLength += chunk.length;
      return callback();
    } else if (typeof chunk === 'string') {
      const buffer = Buffer.from(chunk, encoding);
      this._buffers.push(buffer);
      this._bufferLength += buffer.length;
      return callback();
    }
    // expecting Buffer or string
    callback(new Error('ConcatStream need to operate on Buffer or string, got ' + typeof chunk + ' instead'));
  }
}

export function concatStream(cb: (error: Error | null | undefined, val?: Buffer) => void): Writable {
  return new ConcatStream(cb);
}
