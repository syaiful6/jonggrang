import {
  Request, ResponseType, FilePath, FilePart, Response, StreamingBody, Middleware
} from './type';
import * as H from '@jonggrang/http-types';
import { Task } from '@jonggrang/task';

export * from './type';

/**
 * Create response file
 */
export function responseFile(
  status: H.Status,
  headers: H.ResponseHeaders,
  path: FilePath,
  part?: FilePart
): Response {
  return createResponse(ResponseType.RESPONSEFILE,
    status, headers, undefined, undefined, path, part
  );
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
  return createResponse(ResponseType.RESPONSEBUFFER,
    status, headers, buffer, undefined, undefined, undefined
  );
}

export function responseStream(
  status: H.Status,
  headers: H.RequestHeaders,
  body: StreamingBody
): Response {
  return createResponse(ResponseType.RESPONSESTREAM,
    status, headers, undefined, body, undefined, undefined
  );
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

function createResponse(
  tag: ResponseType,
  status: H.Status,
  headers: H.ResponseHeaders,
  buffer?: Buffer,
  body?: StreamingBody,
  path?: FilePath,
  part?: FilePart
): Response {
  return {
    tag,
    status,
    headers,
    buffer,
    body,
    path,
    part
  } as Response;
}
