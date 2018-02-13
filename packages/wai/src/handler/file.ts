import * as P from '@jonggrang/prelude';
import * as H from '@jonggrang/http-types';
import * as SM from '@jonggrang/object';

import { FileInfo } from './file-info';
import { FilePart } from '../index';


export const enum RspFileInfoType {
  WITHOUTBODY,
  WITHBODY
}

export interface RspFileInfoWithoutBody {
  readonly tag: RspFileInfoType.WITHOUTBODY;
  readonly status: H.Status;
}

export interface RspFileInfoWithBody {
  readonly tag: RspFileInfoType.WITHBODY;
  readonly  status: H.Status;
  readonly header: H.ResponseHeaders;
  readonly offset: number;
  readonly length: number;
}

export type RspFileInfo
  = RspFileInfoWithoutBody
  | RspFileInfoWithBody;

export function conditionalRequest(
  finfo: FileInfo,
  hs0: H.ResponseHeaders,
  hm: H.RequestHeaders
): RspFileInfo {
  const mcondition = (function () {
    const im = ifModified(hm, finfo.size, finfo.time);
    if (P.isJust(im)) return im;
    const ium = ifUnmodifiedSince(hm, finfo.size, finfo.time);
    if (P.isJust(ium)) return ium;
    return ifRange(hm, finfo.size, finfo.time);
  })();
  const condition = P.fromMaybe(unConditional(hm, finfo.size), mcondition);
  if (condition.tag === RspFileInfoType.WITHOUTBODY) return condition;
  let hs = addContentHeaders(hs0, condition.offset, condition.length, finfo.size);
  hs['Last-Modified'] = finfo.date;
  return rspFileInfo(RspFileInfoType.WITHBODY, condition.status, hs, condition.offset, condition.length);
}

export function addContentHeadersForFilePart(hs: H.ResponseHeaders, fp: FilePart) {
  return addContentHeaders(hs, fp.offset, fp.byteCount, fp.size);
}

function ifModified(h: H.RequestHeaders, size: number, d: Date): P.Maybe<RspFileInfo> {
  return P.mapMaybe(ifMofiedSince_(h), date =>
    date.getTime() !== d.getTime()
      ? unConditional(h, size)
      : rspFileInfo(RspFileInfoType.WITHOUTBODY, 304)
  )
}

function ifUnmodifiedSince(h: H.RequestHeaders, size: number, date1: Date): P.Maybe<RspFileInfo> {
  return P.mapMaybe(ifUnmodifiedSince_(h), date2 =>
    date1.getTime() === date2.getTime()
      ? unConditional(h, size)
      : rspFileInfo(RspFileInfoType.WITHOUTBODY, 416)
  );
}

function ifRange(h: H.RequestHeaders, size: number, mtime: Date): P.Maybe<RspFileInfo> {
  return P.chainMaybe(ifRange_(h), date =>
    h['range'] == null ? P.nothing
      : date.getTime() === mtime.getTime() ? P.just(parseRange(h['range'] as string, size))
        : P.just(rspFileInfo(RspFileInfoType.WITHBODY, 200, {}, 0, size))
  );
}

function unConditional(h: H.RequestHeaders, size: number): RspFileInfo {
  if (h['range'] != null) {
    return parseRange(h['range'] as string, size);
  }
  return rspFileInfo(RspFileInfoType.WITHBODY, 200, {}, 0, size);
}

function parseRange(rng: string, size: number): RspFileInfo {
  const parsed = H.parseByteRanges(rng);
  if (parsed.tag === P.MaybeType.NOTHING) {
    return rspFileInfo(RspFileInfoType.WITHOUTBODY, 416)
  }
  const rngs = parsed.value;
  if (rngs.length === 0) {
    return rspFileInfo(RspFileInfoType.WITHOUTBODY, 416)
  }
  const [beg, end] = checkRange(rngs[0], size);
  const len = end - beg + 1;
  const st = beg == 0 && end == size - 1 ? 200 : 206;
  return rspFileInfo(RspFileInfoType.WITHBODY, st, {}, beg, len);
}

function checkRange(rng: H.ByteRange, size: number): [number, number] {
  if (rng.tag === H.ByteRangeType.RANGEFROM) {
    return [rng.from, size - 1];
  }
  if (rng.tag === H.ByteRangeType.RANGEFROMTO) {
    return [rng.from, Math.min(size - 1, rng.to)];
  }
  if (rng.tag === H.ByteRangeType.RANGESUFFIX) {
    return [Math.max(0, size - rng.suffix), size - 1];
  }
  throw new TypeError('first argument to checkRange must be Http ByteRange');
}

function ifMofiedSince_(headers: H.RequestHeaders): P.Maybe<Date> {
  return parseHttpHeader('if-modified-since', headers as any);
}

function ifUnmodifiedSince_(headers: H.RequestHeaders): P.Maybe<Date> {
  return parseHttpHeader('if-unmodified-since', headers);
}

function ifRange_(headers: H.RequestHeaders): P.Maybe<Date> {
  return parseHttpHeader('if-range', headers);
}

function parseHttpHeader(
  key: string,
  headers: any
): P.Maybe<Date> {
  if (headers[key] != null) {
    return parseHttpDate(headers[key]);
  }
  return P.nothing;
}

function parseHttpDate(s: string): P.Maybe<Date> {
  let mdate = Date.parse(s);
  return isNaN(mdate) ? P.nothing : P.just(new Date(mdate));
}

function rspFileInfo(tag: RspFileInfoType.WITHOUTBODY, status: H.Status): RspFileInfo;
function rspFileInfo(tag: RspFileInfoType.WITHBODY, status: H.Status, headers: H.ResponseHeaders, offset: number, length: number): RspFileInfo;
function rspFileInfo(tag: RspFileInfoType, status: H.Status, headers?: H.ResponseHeaders, offset?: number, length?: number): RspFileInfo {
  return { tag, status, headers, offset, length } as RspFileInfo;
}

function contentRangeHeader(beg: number, end: number, total: number): string {
  return `bytes ${beg > end ? '*' : beg}-${end}/${total}`;
}

function addContentHeaders(hs: H.ResponseHeaders, off: number, len: number, size: number): H.ResponseHeaders {
  const hs2 = SM.assign({}, hs, {
    'Content-Length': len,
    'Accept-Ranges': 'bytes'
  });
  if (len === size) return hs2;
  hs2['Content-Ranges'] = contentRangeHeader(off, off + len - 1, size);
  return hs2;
}
