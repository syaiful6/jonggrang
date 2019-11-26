import * as int from './integer';

export interface Decimal {
  num: int.Integer;
  exp: number;
}

export function unsafeDecimal(num: int.Integer, exp: number): Decimal {
  return {num, exp};
}

export const ZERO = unsafeDecimal(0, 0);

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
  const p = int.isExp10(x);
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

export function roundToPrecision(x: Decimal, prec: number = 0, round: ROUNDING = HALF_EVEN): Decimal {
  prec = prec | 0; // convert to int32
  if (x.exp >= -prec) return x;
  const cx = reduce(x);
  const p  = -cx.exp - prec;
  if (p < 0) return cx; // already less than prec precision

  const [q, r] = int.divmodExp10(cx.num, p);

  const roundHalf: (keepOnEq: boolean) => {
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

  let q1: int.Integer;
  if (int.isZero(q)) {
    q1 = q;
  } else if (round === HALF_EVEN) {

  }
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
