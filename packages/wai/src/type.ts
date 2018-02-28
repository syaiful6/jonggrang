import { IncomingMessage } from 'http';

import * as H from '@jonggrang/http-types';
import { Task } from '@jonggrang/task';

export type Request = IncomingMessage;

export interface Response {
  status: H.Status;
  headers: H.ResponseHeaders;
  content: HttpContent;
}

export interface FilePart {
  offset: number;
  byteCount: number;
  size: number;
}

export const enum ContentType {
  FILE,
  BUFFER,
  STREAM
}

export interface ContentFile {
  tag: ContentType.FILE;
  path: string;
  part?: FilePart;
}

export interface ContentBuffer {
  tag: ContentType.BUFFER;
  buffer: Buffer;
}

export interface ContentStream {
  tag: ContentType.STREAM;
  stream: StreamingBody;
}

export type HttpContent
  = ContentFile
  | ContentBuffer
  | ContentStream;

export type FilePath = string;

export interface StreamingBody {
  (send: (b: Buffer) => Task<void>, flush: Task<void>): Task<void>;
}

export interface Application {
  <A>(req: Request, send: (_: Response) => Task<A>): Task<A>;
}

export type Middleware = (app: Application) => Application;
