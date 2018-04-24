import { IncomingMessage } from 'http';
import { Readable } from 'stream';

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
  STREAM,
  READABLE
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

export interface ContentReadable {
  tag: ContentType.READABLE;
  readable: Readable;
}

export type HttpContent
  = ContentFile
  | ContentBuffer
  | ContentStream
  | ContentReadable;

export type FilePath = string;

export interface StreamingBody {
  (send: (b: Buffer) => Task<void>, flush: Task<void>): Task<void>;
}

export interface Application {
  <A>(req: Request, send: (_: Response) => Task<A>): Task<A>;
}

export type Middleware = (app: Application) => Application;

/**
 * Create response file
 */
export function responseFile(
  status: H.Status,
  headers: H.ResponseHeaders,
  path: FilePath,
  part?: FilePart
): Response {
  return createResponse(status, headers, createHttpContent(ContentType.FILE, path, part));
}

/**
 * Create response buffer
 * @param status
 * @param headers
 * @param buffer
 */
export function responseBuffer(
  status: H.Status,
  headers: H.ResponseHeaders,
  buffer: Buffer
): Response {
  return createResponse(status, headers, createHttpContent(ContentType.BUFFER, buffer));
}

export function responseStream(
  status: H.Status,
  headers: H.ResponseHeaders,
  body: StreamingBody
): Response {
  return createResponse(status, headers, createHttpContent(ContentType.STREAM, body));
}

export function responseReadable(
  status: H.Status,
  headers: H.ResponseHeaders,
  body: Readable
): Response {
  return createResponse(status, headers, createHttpContent(ContentType.READABLE, body));
}

export function redirect(path: string, status?: 300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308): Response {
  return responseBuffer(status || 302, {
    'Content-Type': 'text/plain',
    Location: path
  }, Buffer.from(`redirecting to ${path}`));
}

export function responseUtf8(
  status: H.Status,
  headers: H.ResponseHeaders,
  body: string
): Response {
  return responseBuffer(status, headers, Buffer.from(body, 'utf8'));
}

export function createResponse(
  status: H.Status,
  headers: H.ResponseHeaders,
  content: HttpContent
): Response {
  return { status, headers, content };
}

export function createHttpContent(tag: ContentType.BUFFER, a: Buffer): ContentBuffer;
export function createHttpContent(tag: ContentType.STREAM, a: StreamingBody): ContentStream;
export function createHttpContent(tag: ContentType.READABLE, a: Readable): ContentReadable;
export function createHttpContent(tag: ContentType.FILE, a: string, b?: FilePart): ContentFile;
export function createHttpContent(tag: any, a: any, b?: any): any {
  let buffer: any, stream: any, path: any, part: any, readable: any;
  if (tag === ContentType.BUFFER) {
    buffer = a;
  } else if (tag === ContentType.FILE) {
    path = a;
    part = b;
  } else if (tag === ContentType.STREAM) {
    stream = a;
  } else if (tag === ContentType.READABLE) {
    readable = a;
  }
  return { tag, buffer, stream, path, part, readable } as HttpContent;
}
