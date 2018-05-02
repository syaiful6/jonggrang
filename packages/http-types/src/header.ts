import * as M from '@jonggrang/prelude/lib/maybe';

export interface RequestHeaders {
  'accept'?: string;
  'access-control-allow-origin'?: string;
  'access-control-allow-credentials'?: string;
  'access-control-expose-headers'?: string;
  'access-control-max-age'?: string;
  'access-control-allow-methods'?: string;
  'access-control-allow-headers'?: string;
  'accept-patch'?: string;
  'accept-ranges'?: string;
  'age'?: string;
  'allow'?: string;
  'alt-svc'?: string;
  'cache-control'?: string;
  'connection'?: string;
  'content-disposition'?: string;
  'content-encoding'?: string;
  'content-language'?: string;
  'content-length'?: string;
  'content-location'?: string;
  'content-range'?: string;
  'content-type'?: string;
  'date'?: string;
  'expires'?: string;
  'host'?: string;
  'last-modified'?: string;
  'location'?: string;
  'pragma'?: string;
  'proxy-authenticate'?: string;
  'public-key-pins'?: string;
  'retry-after'?: string;
  'set-cookie'?: string[];
  'strict-transport-security'?: string;
  'trailer'?: string;
  'transfer-encoding'?: string;
  'tk'?: string;
  'upgrade'?: string;
  'vary'?: string;
  'via'?: string;
  'warning'?: string;
  'www-authenticate'?: string;
  [header: string]: string | string[] | undefined;
}

export interface ResponseHeaders {
  [header: string]: number | string | string[] | undefined;
}

export const enum ByteRangeType {
  RANGEFROM,
  RANGEFROMTO,
  RANGESUFFIX
}

export interface ByteRangeFrom {
  tag: ByteRangeType.RANGEFROM;
  from: number;
}

export interface ByteRangeFromTo {
  tag: ByteRangeType.RANGEFROMTO;
  from: number;
  to: number;
}

export interface ByteRangeSuffix {
  tag: ByteRangeType.RANGESUFFIX;
  suffix: number;
}

export type ByteRange = ByteRangeFrom | ByteRangeFromTo | ByteRangeSuffix;

export type ByteRanges = ByteRange[];

export function renderByteRange(b: ByteRange): string {
  switch (b.tag) {
    case ByteRangeType.RANGEFROM:
      return `${b.from}-`;
    case ByteRangeType.RANGEFROMTO:
      return `${b.from}-${b.to}`;
    case ByteRangeType.RANGESUFFIX:
      return `-${b.suffix}`;
  }
}

export function renderByteRanges(b: ByteRanges): string {
  return 'bytes=' + b.map(renderByteRange).join(',');
}

export function byteRange(tag: ByteRangeType.RANGEFROM, from: number): ByteRangeFrom;
export function byteRange(tag: ByteRangeType.RANGESUFFIX, suffix: number): ByteRangeSuffix;
export function byteRange(tag: ByteRangeType.RANGEFROMTO, from: number, to: number): ByteRangeFromTo;
export function byteRange(tag: ByteRangeType, from: number, to?: number): any {
  return {
    tag,
    suffix: tag === ByteRangeType.RANGESUFFIX ? from : undefined,
    from: tag === ByteRangeType.RANGESUFFIX ? undefined : from,
    to: to
  };
}

export function parseByteRanges(bs: string): M.Maybe<ByteRanges> {
  const ix = bs.indexOf('=');
  if (ix === -1) {
    return M.nothing;
  }
  const xs = bs.slice(ix + 1).split(',');
  const ranges: ByteRanges = [];
  let suffix: number;
  let start: number;
  let end: number;
  let range: string[];
  for (let i = 0, len = xs.length; i < len; i++) {
    if (xs[i].charAt(0) === '-') {
      suffix = parseInt(xs[i].substring(1), 10);
      if (isNaN(suffix)) {
        return M.nothing;
      }
      ranges.push(byteRange(ByteRangeType.RANGESUFFIX, suffix));
      continue;
    }
    if (xs[i].indexOf('-') === -1) {
      return M.nothing;
    }
    range = xs[i].split('-');
    start = parseInt(range[0], 10);
    end = parseInt(range[1], 10);
    if (isNaN(start)) {
      return M.nothing;
    }
    if (!isNaN(end) && start <= end) {
      ranges.push(byteRange(ByteRangeType.RANGEFROMTO, start, end));
    } else {
      ranges.push(byteRange(ByteRangeType.RANGEFROM, start));
    }
  }
  return M.just(ranges);
}
