import * as P from '@jonggrang/prelude';
import * as T from '@jonggrang/task';
import * as H from '@jonggrang/http-types';

import { Request, Response, responseBuffer } from '../index';
import { FileInfo } from './file-info';
import { GetFd } from './fd-cache';


export interface FileId {
  path: string;
  fd: P.Maybe<number>
}

export interface SendFile {
  (fid: FileId, start: number, end: number, hook: T.Task<void>): T.Task<void>
}

export type Recv = T.Task<Buffer>;

export type RecvBuf = (buf: Buffer, size: number) => T.Task<void>;

export interface WriteHead {
  (st: H.Status, headers: H.ResponseHeaders): T.Task<void>;
}

export interface Connection {
  readonly sendMany: (bs: Buffer[]) => T.Task<void>;
  readonly sendAll: (buf: Buffer) => T.Task<void>;
  readonly writeHead: WriteHead;
  readonly sendFile: SendFile;
  readonly recv: Recv;
  readonly recvBuf: RecvBuf;
}

export interface InternalInfo {
  readonly getFinfo: (path: string) => T.Task<FileInfo>;
  readonly getFd: GetFd;
}

export interface Logger {
  (req: Request, status: H.Status, clen: P.Maybe<number>): T.Task<void>;
}

export interface Settings {
  readonly fdCacheDuration: number;
  readonly finfoCacheDuration: number;
  readonly logger: Logger;
  readonly onException: (mreq: P.Maybe<Request>, err: Error) => T.Task<void>;
  readonly onExceptionResponse: (err: Error) => T.Task<Response>;
}

export function defaultOnException(mreq: P.Maybe<Request>, err: Error): T.Task<void> {
  return T.liftEff(() => {
    if (P.isJust(mreq)) {
      const req = mreq.value;
      console.error(
        `error when handle request ${req.method.toUpperCase()} ${req.rawPathInfo} with error message ${err.message}`
      );
    } else {
      console.error(err.message);
    }
  })
}

export function onExceptionResponse(): T.Task<Response> {
  return T.pure(responseBuffer(
    H.httpStatus(500),
    { 'content-type': 'text/plain; charset=utf-8' },
    Buffer.from('Something went wrong', 'utf8')
  ));
}
