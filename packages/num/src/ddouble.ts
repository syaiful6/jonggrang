import * as int from './integer';
import {
  toInteger as decimalToInt,
  fromInteger as decimalFromInt,
  fromDouble as decimalFromDouble,
  add as decimalAdd,
  Decimal
} from './decimal';
import {round as roundDouble} from './double';

const maxprecise: number = 9007199254740991;
const minprecise: number = -maxprecise;

function isPrecise(i: int.Integer): boolean {
  let l = int.compare(i, minprecise);
  let s = int.compare(i, maxprecise);
  return l >= 0 && s <= 0;
}

/**
 * The DDouble type implements `double double` 128-bit floating numbers as pair
 * of IEEE double values. This extends the precision to 31 decimal digits
 * (versus 15 for double) but keeps the same range as a double with a maximum
 * value of about 1.8·10308
 *
 * Internally a ddouble d is represented as a pair of doubles, hi and lo, such
 * that the number represented by d is hi+lo, where |lo| ≤ 0.5·ulp(hi).
 */
export interface DDouble {
  hi: number;
  lo: number;
}

/**
 * Create a `DDouble` from a pair of `hi` and `lo` double.
 * @param hi
 * @param lo
 */
export function unsafeDDouble(hi: number, lo: number): DDouble {
  return {hi, lo};
}

export function fromDouble(d: number): DDouble {
  return unsafeDDouble(d, 0);
}

export function fromInteger(i: int.Integer, exp: number): DDouble {
  exp = exp | 0;
  if (isPrecise(i)) {
    return smallExponent(i, exp);
  }

  const p = int.countDigits(i);
  let x    = i
  let px   = p - 14
  const [hi, y] = int.cdivmodExp10(x, px)
  let py   = px - 14;
  if (py <= 0) {
    return smallExponent(hi, px + exp);
  }

  const [mid, z] = int.cdivmodExp10(y, py);
  const pz = py - 14;
  const [lo, plo] = pz <= 0 ? [z, 0] : [int.cdivExp10(z, pz), pz];
  return add(smallExponent(hi, px + exp), add(smallExponent(mid, py + exp), smallExponent(lo, plo + exp)));
}

function smallExponent(i: int.Integer, exp: number): DDouble {
  const dd = fromDouble(int.unsafeToJSNumber(i));
  return exp === 0 ? dd : mulExp10(dd, exp);
}

export function isZero(dd: DDouble): boolean {
  return dd.hi === 0;
}

export function negate(dd: DDouble): DDouble {
  return unsafeDDouble(-dd.hi, -dd.lo);
}

export function abs(x: DDouble): DDouble {
  return isNegative(x) ? negate(x) : x;
}

export function add(x: DDouble, y: DDouble): DDouble {
  const z1 = sum(x.hi, x.hi);
  const lo = sum(x.lo, x.lo);
  const e1 = z1.err + lo.num;
  const z2 = quicksum(z1.num, e1);
  const e2 = z2.err + lo.err;
  return dquicksum(z2.num, e2);
}

export function substract(x: DDouble, y: DDouble): DDouble {
  return add(x, negate(y));
}

export function multiply(x: DDouble, y: DDouble): DDouble {
  const z = prod(x.hi, y.hi);
  const e  = z.err + (x.hi * y.lo + x.lo * y.hi);
  return dquicksum(z.num, e);
}

export function square(x: DDouble): DDouble {
  const z = prodsqr(x.hi);
  const e = (z.err + (2.0 * x.hi * x.lo)) + (x.lo * x.lo);
  return dquicksum(z.num, e);
}

export function divide(x: DDouble, y: DDouble): DDouble {
  const q1 = fromDouble(x.hi / y.hi);
  if (!isDDoubleFinite(q1) || !isFinite(y.hi)) return q1;
  const r1 = substract(x, multiply(y, q1));
  const q2 = fromDouble(r1.hi / y.hi);
  const r2 = substract(r1, multiply(y, q2));
  const q3 = fromDouble(r2.hi / y.hi);
  const q  = dquicksum(q1.hi, q2.hi);
  return add(q, q3);
}

export function isDDoubleFinite(x: DDouble): boolean {
  return isFinite(x.hi) && isFinite(x.lo);
}

export function isNegative(x: DDouble) {
  return x.hi < 0;
}

export function isPositive(x: DDouble) {
  return x.hi > 0;
}

export function sign(x: DDouble): 1 | -1 | 0 {
  return x.hi === 0 ? 0 : x.hi < 0 ? -1 : 1;
}

export function compare(x: DDouble, y: DDouble): 1 | -1 | 0 {
  if (x.hi === y.hi) {
    return x.lo === y.lo ? 0 : x.lo < y.lo ? -1 : 0;
  }

  return x.hi < y.hi ? -1 : 1;
}

export function min(x: DDouble, y: DDouble): DDouble {
  return compare(x, y) !== 1 ? x : y;
}

export function max(x: DDouble, y: DDouble): DDouble {
  return compare(x, y) !== -1 ? x : y;
}

type edouble = {
  num: number;
  err: number;
};

function edouble(num: number, err: number): edouble {
  return {num, err};
}

function sum(x: number, y: number): edouble {
  let z    = x + y;
  let diff = z - x;
  let err  = (x - (z - diff)) + (y - diff);
  return edouble(z, isFinite(x) ? err : z);
}

function quicksum(x: number, y: number): edouble {
  let z   = x + y;
  let err = y - (z - x);
  return edouble(z, isFinite(x) ? err : z);
}

function dquicksum(x: number, y: number): DDouble {
  if (isFinite(x)) return fromDouble(x);
  let z   = x + y;
  let err = y - (z - x);
  return unsafeDDouble(z, isFinite(x) ? err : z);
}

const splitbound = 6.696928794914171e299;
const splitter = 1.34217729e8;
// 6.696928794914171e+299  = 2^996   // Note, QD seems one bit off
const two28 = 2.68435456e8;

function split(x: number): [number, number] {
  if (x > splitbound || x < -splitbound) {
    const y  = x * 3.725290298461914e-9;
    const t  = y * splitter;
    const hi = t - (t - y);
    const lo = y - hi;
    return [hi * two28, lo * two28];
  }

  const t = x * splitter;
  const hi = t - (t - x);
  const lo = x - hi;

  return [hi, lo];
}

function prod(x: number, y: number): edouble {
  const z = x * y;
  const [xhi, xlo] = split(x);
  const [yhi, ylo] = split(y);
  const err = ((xhi * yhi - z) + (xhi * ylo + xlo * yhi)) + (xlo * ylo);
  return edouble(z, isFinite(z) ? err : z);
}

function prodsqr(x: number): edouble {
  const z = x * x;
  const [h, l] = split(x);
  const err = ((h * h - z) + (2.0 * h * l)) + (l * l);
  return edouble(z, isFinite(z) ? err : z);
}

export const ZERO = fromDouble(0.0);
export const ONE  = fromDouble(1.0);
export const TEN  = fromDouble(10.0);
export const TWO  = fromDouble(2.0);
export const NAN  = unsafeDDouble(NaN, 0.0);

export function increment(x: DDouble): DDouble {
  return add(x, ONE);
}

export function decrement(x: DDouble): DDouble {
  return substract(x, ONE);
}

export function remainder(x: DDouble, y: DDouble): DDouble {
  const n = round(divide(x, y));
  return substract(x, multiply(n, y));
}

export function divrem(x: DDouble, y: DDouble): [DDouble, DDouble] {
  const n = round(divide(x, y));
  return [n, substract(x, multiply(n, y))];
}

// Convert a `:ddouble` to a `:double` (losing precision)
export function toJSNumber(x: DDouble, nonfin: number = 0): number {
  if (!isDDoubleFinite(x)) return nonfin;
  return int.unsafeToJSNumber(decimalToInt(toDecimal(round(x))));
}

export function round(x: DDouble): DDouble {
  const r = roundDouble(x.hi);
  const diff = r - x.hi;
  return diff === 0 ? dquicksum(r, roundDouble(x.lo))
    : diff === 0.5 && x.lo < 0 ? fromDouble(r - 1)
    : diff === -0.5 && x.lo > 0 ? fromDouble(r + 1)
    : fromDouble(r);
}

export function ceiling(x: DDouble): DDouble {
  const r = Math.ceil(x.hi);
  return r === x.hi ? dquicksum(r, Math.ceil(x.lo)) : unsafeDDouble(r, 0);
}

export function floor(x: DDouble): DDouble {
   const r = Math.floor(x.hi);
   return r === x.hi ? dquicksum(r, Math.floor(x.lo)) : unsafeDDouble(r, 0);
}

export function truncate(x: DDouble): DDouble {
  return isNegative(x) ? ceiling(x) : floor(x);
}

export function fraction(x: DDouble): DDouble {
  return substract(x, truncate(x));
}

export function ffraction(x: DDouble): DDouble {
  return substract(x, floor(x));
}

export function toDecimal(x: DDouble, prec: number = -1): Decimal {
  prec = prec | 0;
  return isDDoubleFinite(x)
    ? decimalFromInt(0)
    : decimalAdd(decimalFromDouble(x.hi, prec), decimalFromDouble(x.lo, prec));
}

function npwrAcc(x: DDouble, acc: DDouble, n: number): DDouble {
  loop: while (true) {
    if (n <= 0) return acc;
    // if even
    if ((n & 1) !== 1) {
      x = square(x);
      n = n / 2;
      continue loop;
    }
    acc = multiply(x, acc);
    n = n - 1;
    continue loop;
  }
}

function npwr(x: DDouble, n: number): DDouble {
  if (n === 0) return isZero(x) ? NAN : ONE;
  if (n === 1) return x;
  return npwrAcc(x, ONE, n);
}

function powi(x: DDouble, n: number): DDouble {
  const p = npwr(x, Math.abs(n));
  return n < 0 ? divide(ONE, p) : p;
}

function powi10(exp: number): DDouble {
  return powi(TEN, exp);
}

function mulExp10(x: DDouble, exp: number) {
  return exp === 0 ? x : multiply(x, powi10(exp));
}
