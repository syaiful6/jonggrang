import * as H from '@jonggrang/http-types';
import { Task } from '@jonggrang/task';

import { Request, Response, Middleware, HttpContext, createResponse } from './type';
export * from './type';
export * from './handler/types';
export * from './handler/run';


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
 * Apply the provided function to the response header list of the Response.
 */
export function mapResponseHeaders(resp: Response, fn: (headers: H.ResponseHeaders) => H.ResponseHeaders): Response {
  return createResponse(resp.status, fn(resp.headers), resp.content);
}

/**
 * Apply the provided function to the response status of the Response
 */
export function mapResponseStatus(resp: Response, fn: (status: H.Status) => H.Status): Response {
  return createResponse(fn(resp.status), resp.headers, resp.content);
}

/**
 * Apply a function that modifies a response as a 'Middleware'
 * @param f Response modifier
 */
export function modifyResponse(
  f: (r: Response) => Response
): Middleware {
  return (app) =>
    <A>(ctx: HttpContext, send: (r: Response) => Task<A>) =>
      app(ctx, s => send(f(s)));
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
  <A>(ctx: HttpContext, send: (r: Response) => Task<A>) =>
    pred(ctx.request) ? middle(app)(ctx, send) : app(ctx, send);
}
