import { ServerResponse } from 'http';
import { Readable } from 'stream';
import * as T from '@jonggrang/task';
import * as H from '@jonggrang/http-types';
import { sendStream, sendFile } from './send-stream';
import { FileId, Connection } from './types';
import { writeSock, endSock } from './utils';

/**
 * create `connection` for this response
 */
export function createConnection(response: ServerResponse): Connection {
  return new Conn(response);
}

export class Conn {
  constructor(private response: ServerResponse) {
  }

  sendAll(buf: Buffer): T.Task<void> {
    return writeSock(this.response, buf);
  }

  sendMany(bs: Buffer[]): T.Task<void> {
    return T.forIn_(bs, buf => writeSock(this.response, buf));
  }

  sendStream(stream: Readable): T.Task<void> {
    return sendStream(this.response, stream);
  }

  writeHead(st: H.Status, headers: H.ResponseHeaders): T.Task<void> {
    return T.liftEff(this.response, st, headers, this.response.writeHead);
  }

  sendFile(fid: FileId, start: number, end: number, hook: T.Task<void>): T.Task<void> {
    return sendFile(this.response, fid, start, end, hook);
  }

  get close(): T.Task<void> {
    return endSock(this.response);
  }
}
