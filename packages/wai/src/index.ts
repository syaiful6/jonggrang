import * as H from '@jonggrang/http-types';
import { Task, pure } from '@jonggrang/task';

import {
  Request, ContentType, HttpContent, ContentFile, ContentBuffer, ContentStream,
  FilePath, FilePart, Response, StreamingBody, Middleware
} from './type';
import { Buffer } from 'buffer';
export * from './type';
export * from './handler/types';
export * from './handler/run';

/**
 * Create response file
 */
export function responseFile(
  status: H.Status,
  headers: H.ResponseHeaders,
  path: FilePath,
  part?: FilePart
): Response {
  return createResponse(status, headers, createHttpContent(ContentType.FILE, path, part))
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
  headers: H.RequestHeaders,
  body: StreamingBody
): Response {
  return createResponse(status, headers, createHttpContent(ContentType.STREAM, body));
}

/**
 * Get response status
 */
export function responseStatus(resp: Response): H.Status {
  return resp.status;
}

/**
 * Get response headers
 */
export function responseHeaders(resp: Response): H.ResponseHeaders {
  return resp.headers;
}

/**
 * Apply a function that modifies a response as a 'Middleware'
 * @param f Response modifier
 */
export function modifyResponse(
  f: (r: Response) => Response
): Middleware {
  return (app) =>
    <A>(req: Request, send: (r: Response) => Task<A>) =>
      app(req, s => send(f(s)));
}

/**
 * conditionally apply a 'Middleware'
 * @param pred
 * @param middle
 */
export function ifRequest(
  pred: (req: Request) => boolean,
  middle: Middleware
): Middleware {
  return (app) =>
  <A>(req: Request, send: (r: Response) => Task<A>) =>
    pred(req) ? middle(app)(req, send) : app(req, send);
}

export const defaultRequest: Request = {
  method: 'GET',
  headers: {},
  httpVersion: H.httpVersion(1, 0),
  rawPathInfo: '',
  rawQueryString: '',
  isSecure: false,
  query: {},
  pathInfo: [],
  body: pure(Buffer.allocUnsafe(0)),
  vault: {}
}

export function createResponse(
  status: H.Status,
  headers: H.ResponseHeaders,
  content: HttpContent
): Response {
  return { status, headers, content }
}

export function createHttpContent(tag: ContentType.BUFFER, a: Buffer): ContentBuffer;
export function createHttpContent(tag: ContentType.STREAM, a: StreamingBody): ContentStream;
export function createHttpContent(tag: ContentType.FILE, a: string, b?: FilePart): ContentFile;
export function createHttpContent(tag: any, a: any, b?: any): any {
  let buffer: any, stream: any, path: any, part: any;
  if (tag === ContentType.BUFFER) {
    buffer = a;
  } else if (tag === ContentType.FILE) {
    path = a;
    part = b;
  } else if (tag === ContentType.STREAM) {
    stream = a;
  }
  return { tag, buffer, stream, path, part } as HttpContent;
}
