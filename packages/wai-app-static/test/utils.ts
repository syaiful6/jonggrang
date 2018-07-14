import { Transform } from 'stream';
import * as H from '@jonggrang/http-types';


export interface Option {
  method: H.HttpMethod;
  url: string;
  headers: H.RequestHeaders;
}

export class IncomingMessageMock extends Transform {
  public method: H.HttpMethod;
  public url: string;
  public headers: H.RequestHeaders;
  public rawHeaders: Array<string | string[]>;
  private _failError: Error | null;
  constructor(options?: Partial<Option>) {
    super();
    (this as any)._writableState.objectMode = true;
    (this as any)._readableState.objectMode = false;

    options = options || {};
    this.method = options.method ? options.method : 'GET';
    this.url = options.url ? options.url : '/';
    this.headers = {};
    this.rawHeaders = [];
    this._failError = null;
    if (options.headers) {
      Object.keys(options.headers).forEach(key => {
        let val = (options as any).headers[key];
        if (val != null) {
          this.headers[key.toLowerCase()] = val;
          this.rawHeaders.push(key);
          this.rawHeaders.push(val);
        }
      });
    }

    if (this.method === 'GET' || this.method === 'HEAD' || this.method === 'DELETE') {
      this.end();
    }
  }

  _transform(chunk: any, encoding: string, next: Function) {
    if (this._failError)
      return this.emit('error', this._failError);

    if (typeof chunk !== 'string' && !Buffer.isBuffer(chunk))
      chunk = JSON.stringify(chunk);

    this.push(chunk);
    next();
  }

  _fail(error: Error) {
    this._failError = error;
  }
}
