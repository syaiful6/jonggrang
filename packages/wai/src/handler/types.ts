import * as P from '@jonggrang/prelude';
import * as T from '@jonggrang/task';
import * as H from '@jonggrang/http-types';

import { Request, Response, responseBuffer } from '../index';
import { FileInfo } from './file-info';
import { GetFd } from './fd-cache';
import { ListenOptions } from 'net';


export interface FileId {
  path: string;
  fd: P.Maybe<number>
}

export function fileId(path: string, fd: P.Maybe<number>): FileId {
  return { path, fd };
}

export interface SendFile {
  (fid: FileId, start: number, end: number, hook: T.Task<void>): T.Task<void>
}

export interface WriteHead {
  (st: H.Status, headers: H.ResponseHeaders): T.Task<void>;
}

export interface Connection {
  readonly sendMany: (bs: Buffer[]) => T.Task<void>;
  readonly sendAll: (buf: Buffer) => T.Task<void>;
  readonly close: T.Task<void>;
  readonly writeHead: WriteHead;
  readonly sendFile: SendFile;
}

export interface InternalInfo {
  readonly getFinfo: (path: string) => T.Task<FileInfo>;
  readonly getFd: GetFd;
}

export function internalInfo(
  getFinfo: (path: string) => T.Task<FileInfo>,
  getFd: GetFd
): InternalInfo {
  return { getFinfo, getFd };
}

export interface Logger {
  (req: Request, status: H.Status, clen: P.Maybe<number>): T.Task<void>;
}

export interface ListenOpts extends ListenOptions {
  permission?: number;
}

export interface Settings {
  readonly fdCacheDuration: number;
  readonly finfoCacheDuration: number;
  readonly logger: Logger;
  readonly listenOpts: ListenOpts;
  readonly onException: (mreq: P.Maybe<Request>, err: Error) => T.Task<void>;
  readonly onExceptionResponse: (err: Error) => Response;
}

export const defaultSettings: Settings = {
  fdCacheDuration: 0,
  finfoCacheDuration: 0,
  logger: () => T.pure(void 0),
  listenOpts: {
    host: '127.0.0.1',
    port: 3000
  },
  onException: defaultOnException,
  onExceptionResponse: onExceptionResponse
};

export function defaultOnException(mreq: P.Maybe<Request>, err: Error): T.Task<void> {
  return T.liftEff(null, mreq, err, defaultOnExceptionEff);
}

function defaultOnExceptionEff(mreq: P.Maybe<Request>, err: Error) {
  if (P.isJust(mreq)) {
    const req = mreq.value;
    console.error(
      `error when handle request ${req.method} ${req.url} with error message ${err.message}`
    );
  } else {
    console.error(err.message);
  }
}

export function onExceptionResponse(): Response {
  return responseBuffer(
    500,
    { 'content-type': 'text/plain; charset=utf-8' },
    Buffer.from('Something went wrong', 'utf8')
  );
}
