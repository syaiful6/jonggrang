import { Readable } from 'stream';
import { IncomingMessage, ServerResponse } from 'http';

import * as P from '@jonggrang/prelude';
import * as T from '@jonggrang/task';
import * as H from '@jonggrang/http-types';

import { Response, HttpContext } from '../type';
import { FileInfo } from './file-info';
import { GetFd } from './fd-cache';
import { ListenOptions } from 'net';


/**
 * Data type to abstract file identifiers
 */
export interface FileId {
  path: string;
  fd: P.Maybe<number>;
}

export function fileId(path: string, fd: P.Maybe<number>): FileId {
  return { path, fd };
}

/**
 * A function for sending `FileId`
 */
export interface SendFile {
  (fid: FileId, start: number, end: number, hook: T.Task<void>): T.Task<void>;
}

export interface WriteHead {
  (st: H.Status, headers: H.ResponseHeaders): T.Task<void>;
}

/**
 * Data type to manipulate Task actions for connections
 */
export interface Connection {
  sendMany(bs: Buffer[]): T.Task<void>;
  sendAll(buf: Buffer): T.Task<void>;
  readonly close: T.Task<void>;
  readonly writeHead: WriteHead;
  readonly sendFile: SendFile;
  sendStream<T extends Readable>(readable: T): T.Task<void>;
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
  (req: IncomingMessage, status: H.Status, clen: P.Maybe<number>): T.Task<void>;
}

export interface ListenOpts extends ListenOptions {
  permission?: number;
}

export interface Settings {
  readonly fdCacheDuration: number;
  readonly finfoCacheDuration: number;
  readonly logger: Logger;
  readonly listenOpts: ListenOpts;
  createConnection(res: ServerResponse): Connection;
  createHttpContext(req: IncomingMessage): HttpContext;
  onException(mreq: P.Maybe<IncomingMessage>, err: Error): T.Task<void>;
  onExceptionResponse(err: Error): Response;
}
