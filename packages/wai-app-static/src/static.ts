import * as url from 'url';
import { IncomingMessage } from 'http';
import { Readable } from 'stream';

import * as P from '@jonggrang/prelude';
import * as W from '@jonggrang/wai';
import * as H from '@jonggrang/http-types';
import * as T from '@jonggrang/task';
import * as S from '@jonggrang/object';

import {
  Piece, File, StaticSettings, Folder, LookupResult, LookupResultType,
  MaxAge, MaxAgeType, toPieces
} from './types';
import { dropLastIfNull } from './helper';


export const enum StaticResponseType {
  REDIRECT,
  RAWREDIRECT,
  NOTFOUND,
  FILERESPONSE,
  NOTMODIFIED,
  SENDCONTENT,
  WAIRESPONSE
}

export type StaticResponse
  = { tag: StaticResponseType.REDIRECT; pieces: Piece[]; hash: P.Maybe<string> }
  | { tag: StaticResponseType.RAWREDIRECT; path: string }
  | { tag: StaticResponseType.NOTFOUND }
  | { tag: StaticResponseType.FILERESPONSE; file: File; headers: H.ResponseHeaders }
  | { tag: StaticResponseType.NOTMODIFIED }
  | { tag: StaticResponseType.SENDCONTENT; mimeType: string; readable: Readable }
  | { tag: StaticResponseType.WAIRESPONSE; response: W.Response };

function waiStaticResponse(response: W.Response): StaticResponse {
  return { tag: StaticResponseType.WAIRESPONSE, response: response };
}

export function serveFolder(
  settings: StaticSettings, pieces: Piece[],
  req: IncomingMessage, folder: Folder
): T.Task<StaticResponse> {
  if (P.isNothing(settings.listing)) {
    return T.pure(waiStaticResponse(W.responseBuffer(403, {
      'Content-Type': 'text/plain'
    }, Buffer.from('Directory listings disabled'))));
  }
  if (settings.addTrailingSlash) {
    const path = addTrailingSlash(req);
    if (path != null) return T.pure({ tag: StaticResponseType.RAWREDIRECT, path: path } as StaticResponse);
  }

  const listing = settings.listing.value;

  return T.pure(waiStaticResponse(W.responseBuffer(200, {
    'Content-Type': 'text/html; charset=utf-8'
  }, Buffer.from(listing(pieces, folder), 'utf8'))));
}

export function serveFile(ss: StaticSettings, req: IncomingMessage, file: File): T.Task<StaticResponse> {
  const mLastSent = ifMofiedSince_(req.headers);
  const mdate = P.mapMaybe(file.getModified, H.fromDate);

  function respond(headers: H.ResponseHeaders): T.Task<StaticResponse> {
    return T.pure({
      file,
      headers: cacheControl(ss.maxAge, headers),
      tag: StaticResponseType.FILERESPONSE } as StaticResponse
    );
  }

  const lastMod = P.isJust(mdate) && P.isJust(mLastSent) && mdate.value.equals(mLastSent.value)
    ? T.pure({ tag: StaticResponseType.NOTMODIFIED } as StaticResponse)
      : P.isJust(mdate) ? respond({ 'Last-Modified': H.formatHttpDate(mdate.value) })
        : respond({});

  if (ss.useHash) {
    return file.getHash
      .chain(mHash => {
        const lastHash = req.headers['if-none-match'];
        if (lastHash != null && P.isJust(mHash)) {
          const curHash = mHash.value;
          if (ss.weakEtags && (lastHash === curHash || lastHash === `W/${curHash}`
              || `W/${lastHash}` === curHash)) {
            return T.pure({ tag: StaticResponseType.NOTMODIFIED } as StaticResponse);
          }

          if (!ss.weakEtags && (curHash === lastHash && lastHash.indexOf('W/') !== 0)) {
            return T.pure({ tag: StaticResponseType.NOTMODIFIED } as StaticResponse);
          }
        }

        if (P.isJust(mHash)) {
          return respond({ 'ETag': mHash.value });
        }
        return lastMod;
      });
  }
  return lastMod;
}

export function staticApp(ss: StaticSettings): W.Application {
  return function staticApplication(ctx, respond) {
    const pieces = H.decodePathSegments(url.parse(ctx.request.url as string).pathname as string);
    return staticAppPieces(ss, pieces, ctx, respond);
  };
}

function staticAppPieces<A>(
  ss: StaticSettings,
  rawPieces: string[],
  ctx: W.HttpContext,
  sendResponse: (resp: W.Response) => T.Task<A>
): T.Task<A> {
  const req = ctx.request;
  if (['GET', 'HEAD'].indexOf(req.method as string) === -1) {
    return sendResponse(W.responseBuffer(405, {
      'Content-Type': 'text/plain'
    }, Buffer.from('Only GET or HEAD is supported')));
  }
  const mpieces = toPieces(rawPieces);

  if (P.isJust(mpieces)) {
    return checkPieces(ss, mpieces.value, req)
    .chain(srespond => {
      switch (srespond.tag) {
        case StaticResponseType.FILERESPONSE:
          const { file } = srespond;
          return ss.getMimeType(file)
            .chain(mime => {
              const headers = S.assign({}, srespond.headers, {
                'Content-Type': mime
              });
              return sendResponse(file.toResponse(200, headers));
            });

        case StaticResponseType.NOTMODIFIED:
          return sendResponse(W.responseBuffer(304, {}, Buffer.from('')));

        case StaticResponseType.SENDCONTENT:
          return sendResponse(W.responseReadable(200, {
            'Content-Type': srespond.mimeType
          }, srespond.readable));

        case StaticResponseType.REDIRECT:
          const reqQs = url.parse(req.url as string, true).query;
          const loc = ss.mkRedirect(srespond.pieces, srespond.pieces.map(encodeURIComponent).join('/'));
          const qString =
            P.isJust(srespond.hash)
            ? S.assign({}, reqQs, { etag: srespond.hash.value })
            : S.remove('etag', reqQs as any);
          const qs = H.renderQuery(qString as any);
          return sendResponse(W.responseBuffer(301, {
            'Content-Type': 'text/plain',
            Location: loc + (qs !== '' ? `?${qs}` : '')
          }, Buffer.from('')));

        case StaticResponseType.RAWREDIRECT:
          return sendResponse(W.responseBuffer(301, {
            'Content-Type': 'text/plain',
            Location: srespond.path
          }, Buffer.from('Redirect')));

        case StaticResponseType.NOTFOUND:
          if (P.isJust(ss.notFoundHandler)) {
            return ss.notFoundHandler.value(ctx, sendResponse);
          }
          return sendResponse(W.responseBuffer(404, {
            'Content-Type': 'text/plain'
          }, Buffer.from('File not found')));

        case StaticResponseType.WAIRESPONSE:
          return sendResponse(srespond.response);
      }
    });
  }

  return sendResponse(W.responseBuffer(403, {
    'Content-Type': 'text/plain'
  }, Buffer.from('Forbidden')));
}

export function cacheControl(maxage: MaxAge, headers: H.ResponseHeaders): H.ResponseHeaders {
  let cInt: number | null = null;

  if (maxage.tag === MaxAgeType.MaxAgeSeconds) {
    cInt = maxage.seconds;
  }
  if (maxage.tag === MaxAgeType.MaxAgeForever) {
    cInt = 31536000;
  }
  let extraHeaders: H.ResponseHeaders = S.assign({}, headers);
  if (cInt != null) {
    extraHeaders['Cache-Control'] = `public, max-age=${cInt}`;
  }
  if (maxage.tag === MaxAgeType.MaxAgeForever) {
    extraHeaders['Expires'] = 'Thu, 31 Dec 2037 23:55:55 GMT';
  }
  return extraHeaders;
}

function ifMofiedSince_(headers: H.RequestHeaders): P.Maybe<H.HttpDate> {
  return parseHttpHeader('if-modified-since', headers as any);
}

function parseHttpHeader(
  key: string,
  headers: any
): P.Maybe<H.HttpDate> {
  if (headers[key] != null) {
    return H.parseHTTPDate(headers[key]);
  }
  return P.nothing;
}

export function checkPieces(
  settings: StaticSettings,
  pieces: Piece[],
  request: W.Request
): T.Task<StaticResponse> {
  const isEmpty = safeInit(pieces).some(nullLength);
  if (isEmpty) {
    return T.pure(
      { tag: StaticResponseType.REDIRECT,
        pieces: filterButLast(pieces, notNullLength),
        hash: P.nothing
      } as StaticResponse
    );
  }
  const lookupResult: T.Task<P.Either<string, LookupResult>> = T.co(function* () {
    const nonIndexResult: LookupResult  = yield settings.lookupFile(pieces);
    if (nonIndexResult.tag === LookupResultType.LRFILE) {
      return T.pure(P.right(nonIndexResult));
    }
    const eIndexResult: P.Either<string, LookupResult> = yield lookupIndices(
      settings.indices.map(ix => dropLastIfNull(pieces.concat(ix)))
    );
    if (P.isLeft(eIndexResult)) {
      return T.pure(P.left(eIndexResult.value));
    }
    const { value: indexResult } = eIndexResult;
    if (indexResult.tag === LookupResultType.LRNOTFOUND) {
      return T.pure(P.right(nonIndexResult));
    }
    if (indexResult.tag === LookupResultType.LRFILE && settings.redirectToIndex) {
      const file = indexResult.file;
      return T.pure(P.left((function () {
        const repieces = pieces.slice().reverse();
        if (repieces.length === 0) {
          return file.name;
        }
        const lastSegment = repieces[0];
        if (lastSegment == '') return file.name;
        return `${lastSegment}/${file.name}`;
      })()));
    }
    return T.pure(P.right(indexResult));
  });

  function lookupIndices(xs: Array<Piece[]>): T.Task<P.Either<string, LookupResult>> {
    if (xs.length === 0) {
      return T.pure(P.right({ tag: LookupResultType.LRNOTFOUND } as LookupResult));
    }
    return settings.lookupFile(xs[0])
      .chain(lr => {
        if (lr.tag === LookupResultType.LRNOTFOUND) {
          return lookupIndices(xs.slice(1));
        }
        if (settings.addTrailingSlash) {
          const redirect = addTrailingSlash(request);
          if (redirect != null) {
            return T.pure(P.left(redirect));
          }
        }
        return T.pure(P.right(lr));
      });
  }

  return lookupResult.chain(res => {
    if (P.isLeft(res)) {
      return T.pure({ tag: StaticResponseType.RAWREDIRECT, path: res.value } as StaticResponse);
    }
    const { value: result } = res;
    if (result.tag === LookupResultType.LRNOTFOUND) {
      return T.pure({ tag: StaticResponseType.NOTFOUND } as StaticResponse);
    }
    if (result.tag === LookupResultType.LRFILE) {
      return serveFile(settings, request, result.file);
    }
    return serveFolder(settings, pieces, request, result.folder);
  });
}

function nullLength<T extends { length: number }>(t: T): boolean {
  return t.length === 0;
}

function notNullLength<T extends { length: number }>(t: T): boolean {
  return t.length > 0;
}

export function safeInit<A>(xs: A[]): A[] {
  return xs.length === 0 ? [] : xs.slice(0, -1);
}

export function filterButLast<A>(
  xs: A[],
  fn: (a: A) => boolean
) {
  let result: A[] = [];
  let i = 0;
  for (let max = xs.length - 1; i < max; i++) {
    if (fn(xs[i])) {
      result.push(xs[i]);
    }
  }
  result.push(xs[i]);
  return result;
}

export function addTrailingSlash(req: IncomingMessage): string | null {
  const path = url.parse(req.url as string).pathname;
  if (path == null) return '/';
  if (path.charAt(path.length - 1) === '/') return null;
  return path + '/';
}
