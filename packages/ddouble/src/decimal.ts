import * as int from './integer';

export interface Decimal {
  num: int.Integer;
  exp: number;
}

export function unsafeDecimal(num: int.Integer, exp: number): Decimal {
  return {num, exp};
}

export const ZERO = unsafeDecimal(0, 0);

export function isZero(x: Decimal): boolean {
  return int.isZero(x.num);
}

export function isPositive(x: Decimal): boolean {
  return int.isPositive(x.num);
}

export function isNegative(x: Decimal): boolean {
  return int.isNegative(x.num);
}

// round exponents to specific intervals (7) to avoid too much rescaling
function roundExp(exp: number) {
  return exp === 0 ? exp : 7 * intDiv(exp, 7);
}

/**
 * Create a decimal from an integer `i` with an optional
 * exponent `exp` (=`0`) such that the result equals `i`*10^`exp`^.
 */
export function fromInteger(i: int.Integer, exp: number = 0): Decimal {
  const x = roundExp(exp);
  const diff = exp - x;
  return diff === 0 ? unsafeDecimal(i, exp) : unsafeDecimal(int.mulExp10(i, diff), x);
}

/**
 * Choose an exponent that minimizes memory usage.
 */
export function reduce(x: Decimal): Decimal {
  const p = int.isExp10(x.num);
  if (!int.isPositive(p)) return x;
  const expp = x.exp + p;

  return roundExp(expp) === x.exp ? x : fromInteger(int.cdivExp10(x.num, p), expp);
}

/**
 * Add two decimal
 * @param  {Decimal} x
 * @param  {Decimal} y
 * @return {Decimal}
 */
export function add(x: Decimal, y: Decimal): Decimal {
  const e =  Math.min(x.exp, y.exp);
  const xx = expand(x, e);
  const yy = expand(y, e);
  return fromInteger(int.add(xx, yy), e);
}

/**
 * Negate a decimal.
 */
export function negate(x: Decimal): Decimal {
  return unsafeDecimal(int.negate(x.num), x.exp);
}

/**
 * Subtract two decimals.
 */
export function substract(x: Decimal, y: Decimal): Decimal {
  return add(x, negate(y));
}

/**
 * Increment a decimal
 */
export function increment(x: Decimal): Decimal {
  return unsafeDecimal(int.increment(x.num), x.exp);
}

/**
 * Multiply two decimals with full precision.
 */
export function multiply(x: Decimal, y: Decimal): Decimal {
  const z = fromInteger(int.multiply(x, y), x.exp + y.exp);
  return z.exp < 0 ? reduce(z) : z;
}

// Rounding modes
export const enum ROUNDING {
  HALF_EVEN,
  HALF_CEILING,
  HALF_FLOOR,
  HALF_TRUNCATE,
  HALF_AWAY_FROM_ZERO,
  CEILING,
  FLOOR,
  TRUNCATE,
  AWAY_FROM_ZERO,
}

export function roundToPrecision(x: Decimal, prec: number = 0, round: ROUNDING = ROUNDING.HALF_EVEN): Decimal {
  prec = prec | 0; // convert to int32
  if (x.exp >= -prec) return x;
  const cx = reduce(x);
  const p  = -cx.exp - prec;
  if (p < 0) return cx; // already less than prec precision

  const [q, r] = int.divmodExp10(cx.num, p);

  const roundHalf = (keepOnEq: boolean) => {
    const half = int.divide(int.exp10(p), 2);
    let ord = int.compare(r, half);
    // eq
    if (ord === 0) {
      return keepOnEq ? q : int.increment(q);
    } else if (ord > 0) {
      // gt
      return int.increment(q);
    }

    // less than
    return q;
  }

  let q1 = int.isZero(q) ? q
    : round === ROUNDING.HALF_EVEN ? roundHalf(int.isEven(q))
    : round === ROUNDING.HALF_FLOOR ? roundHalf(true)
    : round === ROUNDING.HALF_CEILING ? roundHalf(false)
    : round === ROUNDING.HALF_TRUNCATE ? roundHalf(int.isPositive(q))
    : round === ROUNDING.AWAY_FROM_ZERO ? roundHalf(int.isNegative(q))
    : round === ROUNDING.FLOOR ? q
    : round === ROUNDING.CEILING ? int.increment(q)
    : round === ROUNDING.TRUNCATE ? (!int.isNegative(q) ? q : int.increment(q))
    : !int.isPositive(q) ? q : int.increment(q);

  return fromInteger(q1, -prec);
}

export function divide(x: Decimal, y: Decimal, minPrec: number = 15): Decimal {
  if (isZero(x) || isZero(y)) return ZERO;
  const e = x.exp - y.exp;
  const xdigits = int.countDigits(x.num);
  const ydigits = int.countDigits(y.num);
  const extra   = Math.max(0, ydigits - xdigits) + minPrec;

  return extra > 0
    ? reduce(fromInteger(int.divide(int.mulExp10(x.num, extra), y.num), e - extra))
    : reduce(fromInteger(int.divide(x.num, y.num), e - extra));
}

export function compare(x: Decimal, y: Decimal): 0 | 1 | -1 {
  const e = Math.min(x.exp, y.exp);
  const xx = expand(x, e);
  const yy = expand(y, e);
  return int.compare(xx.num, yy.num);
}

export function showFixed(d: Decimal, prec: number = -1000): string {
  prec = prec | 0;
  const x = roundToPrecision(d, Math.abs(prec));
  if (x.exp >= 0) {
    const frac = prec <= 0 ? '' : '.' + repeat('0', prec);
    return x.num.toString() + repeat('0', x.exp) + frac;
  }

  const digits = -x.exp;
  const sign   = isNegative(x) ? '-' : '';
  const i      = int.abs(x.num);
  const man    = int.cdivExp10(i, digits);
  const frac   = int.subtract(i, int.mulExp10(man, digits));

  return sign + man.toString() + showFrac(padLeft(frac.toString(), digits, '0'), prec);
}

// The exponent of a decimal if displayed in scientific notation.
export function getExponent(x: Decimal) {
  return int.countDigits(x.num) + x.exp - 1;
}

function showFrac(frac: string, prec: number): string {
  const fracTrimmed = frac.replace(/0+$/, '');
  const fracFull    = prec >= 0 ? padRight(fracTrimmed, prec, '0') : fracTrimmed;
  return fracFull === '' ? '' : '.' + fracFull;
}

function intDiv(x: number, y: number) {
  if (y === 0) return 0;
  const q = Math.trunc(x / y);
  const r = x % y;
  return r < 0 ? (y > 0 ? q - 1 : q + 1) : q;
}

function expand(x: Decimal, e: number) {
   if (x.exp <= e) return x;
   return fromInteger(int.mulExp10(x.num, x.exp - e), e);
}

function repeat(s: string, n: number) {
  if (n <= 0)  return "";
  if (n ===1 ) return s;
  if (n === 2) return s+s;
  let res = "";
  while(n > 0) {
    if (n & 1) res += s;
    n >>>= 1;
    s += s;
  }
  return res;
}

function padLeft(s: string, width: number, fill: string = '') {
  width = width | 0;
  const n = s.length;
  if (width <= n) return s;
  return repeat(fill, width - n) + s;
}

function padRight(s: string, width: number, fill: string = '') {
  width = width | 0;
  const n = s.length;
  if (width <= n) return s;
  return s + repeat(fill, width - n);
}
