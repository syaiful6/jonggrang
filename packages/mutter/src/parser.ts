import { Readable } from 'stream';
import { createGunzip, createInflate } from 'zlib';

import appendField from 'append-field';
import Busboy from 'busboy';
import { parse as parseContentType } from 'content-type';
import { text as parseBodyText } from 'get-body';
import { Maybe, nothing, just, isJust, isNothing } from '@jonggrang/prelude';
import { assign } from '@jonggrang/object';
import { HttpContext, Request } from '@jonggrang/wai';
import * as T from '@jonggrang/task';

import { MutterOptions, Params, Files } from './types';


/**
 * Request body type we want to parse
 */
export type RequestBodyType
  = { tag: 'urlencoded', charset: string | undefined }
  | { tag: 'multipart', boundary: string };

export function parseRequestBody(ctx: HttpContext, opts?: MutterOptions): T.Task<[Params, Files]> {
  if (!requestHasBody(ctx.request)) return T.pure([{}, {}] as [Params, Files]);

  const mctype = getRequestBodyType(ctx.request);
}

function requestHasBody(req: Request): boolean {
  return req.headers['transfer-encoding'] != undefined || !isNaN(req.headers['content-length'] as any);
}

export function getRequestBodyType(req: Request): Maybe<RequestBodyType> {
  const parsed = safeParseContentType(req);
  if (isNothing(parsed)) return nothing;

  const { type, parameters } = parsed.value;

  if (type && type.indexOf('multipart') === 0)
    return just({ tag: 'multipart', boundary: parameters.boundary || '' } as RequestBodyType);

  if (type === 'application/x-www-form-urlencoded')
    return just({ tag: 'urlencoded', charset: parameters.charset } as RequestBodyType);

  return nothing;
}

/**
 * wrap parse content type, as it may throw exception
 */
function safeParseContentType(req: Request) {
  try {
    return just(parseContentType(req));
  } catch {
    return nothing;
  }
}
