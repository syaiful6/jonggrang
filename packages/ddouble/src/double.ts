import * as int from './integer';

// Smallest positive normalized double value
const DBL_MIN = 2.2250738585072014e-308;

// Maximum double value
var DBL_MAX = 1.7976931348623157e308;

// The base-2 logarithm of _e_.
const DBL_LOG2E = 1.4426950408889634;

const DBL_LOG2   = 6931471805599453;

// Machine epsilon: the difference between 1.0 and the next representable `:double` value.
const DBL_EPSILON = 2.220446049250313e-16;

/**
 * Is this a [subnormal](https://en.wikipedia.org/wiki/Denormal_number) value?
 * @param {number} x js number to test
 * @return boolean
 */
export function isSubnormal(x: number) {
  return x !== 0 && Math.abs(x) < DBL_MIN;
}

/**
 * Round a double with rounding to even on a tie.
 */
export function round(d: number): number {
  const n = Math.round(d);
  return n - d === 0.5 && n % 2 !== 0 ? n - 1 : n;
}

/**
 * Return the integral part of a `:double` `d` .
 * If `d >= 0.0` , return the largest integer equal or less to `d` ,
 * If `d < 0.0` , return the smallest integer equal or larger to `d` .
 */
export function truncate(d: number): number {
  return d >= 0 ? Math.floor(d) : Math.ceil(d);
}

/**
 * Return the fractional part of a `:double` `d`.
 * `truncate(d) + fraction(d) === d`\
 * `fraction(-2.4) === -0.4`
 */
export function fraction(d: number): number {
  return d - truncate(d);
}

/**
 * Return the 'floored' fraction of `d`, always greater or equal to zero.
 */
export function ffraction(d: number): number {
  return d - Math.floor(d);
}

/**
 * Round a double to a specified precision. Rounds to the  even number in case of a tie.
 *
 */
export function roundToPrecision(d: number, prec: number) {
  if (prec <= 0) return round(d);
  const p = Math.pow(10, prec);
  return round(d * p) / p;
}

export function log1p(x: number) {
  if (x === Infinity) return x;
  const y = 1 + x;
  const z = y - 1;
  return z === 0 ? x : Math.log(x) * (x / z);
}

/**
 * Returns `log(exp(x) + exp(y))`.
 */
export function logaddexp(x: number, y: number) {
  if (x === y) return x + DBL_LOG2;
  const z = x - y;
  return z > 0 ? x + log1p(Math.exp(-z)) : y + log1p(Math.exp(z));
}

export function logaddexp2(x: number, y: number) {
  if (x === y) return x + 1.0;
  const z = x - y;
  return z > 0 ? x + log2p1(Math.pow(2, -z)) : y + log2p1(Math.pow(2, z));
}

export function nearlyEqual(x: number, y: number, epsilon: number = 8 * DBL_EPSILON): boolean {
  if (x === y) return true;
  const diff = Math.abs(x - y);
  if (x === 0 || y === 0 || diff < DBL_MIN) {
    // very close to zero, scale the epsilon for denormalized numbers
    return 2 * diff < epsilon * DBL_MIN;
  }
  const sum = Math.abs(x) + Math.abs(y);
  const x2 = sum > DBL_MAX ? DBL_MAX : sum;
  return 2 * diff / x2 < epsilon;
}

function log2p1(x: number) {
  return DBL_LOG2E * log1p(x);
}

const ONE_M1022 = 2.2250738585072014e-308;
const ONE_P1023 = 8.98846567431158e307;

export function ldexp(x: number, e: number) {
  if (!isFinite(x)) return x;
  if (e >= -1022) {
    return e <= 1023 ? mulExp2(x, e)
      : e <= 2046 ? mulExp2(x * ONE_P1023, e - 1023)
      : e <= 3069 ? mulExp2(x * ONE_P1023 * ONE_P1023, e - 2046)
      : x < 0 ? -1/0 /* NEG Infinity */ : 1/0 /* positive infinity */;
  }
  return e >= -2044 ? mulExp2(x * ONE_M1022, e + 1022)
    : e >= -3066 ? mulExp2(x * ONE_M1022 * ONE_M1022, e + 2044)
    : x < 0.0 ? -0 : 0;
}

export function decode(d: number): [int.Integer, number] {
  if (d === 0) return [0, 0];

  return isSubnormal(d)
    ? decodeNormalized(d * 18014398509481984, -54)
    : decodeNormalized(d, 0);
}

/**
 * Show a `:double` in exponential (scientific) notation.
 * The optional `precision` (= `-17`) specifies the precision.
 * If `>=0` it specifies the number of digits behind the dot (up to `17` max).
 * If negative, then at most the absolute value of `precision` digits behind the dot are used.
 */
export function showExponent(d: number, precision: number = -17) {
  precision = precision | 0;
  let s = precision < 0 ? d.toExponential() : d.toExponential(precision > 20 ? 20 : precision);
  return s.replace(/[eE][\+\-]?0+$/, "");
}

export function showFixed(d: number, precision: number = -2) {
  const dabs = d < 0.0 ? -d : d;
  if (dabs < 1.0e-15 || dabs > 1.0e+21) {
    return showExponent(d, precision);
  }
  if (precision < 0) {
    // use at most |precision|
    var s = d.toFixed(-precision);              // show at full precision
    var cap = /^([\-\+]?\d+)(\.\d+)$/.exec(s);
    if (!cap) return s;
    var frac = cap[2].substr(0,1 - precision);  // then cut off
    return cap[1] + frac.replace(/(?:\.|([1-9]))0+$/,"$1"); // remove trailing zeros
  }
  return d.toFixed(precision > 20 ? 20 : precision);
}

function exp2Int(e: number) {
  return e >= -1022 && e <= 1023 ? doubleFromBits(0, (1023 + e) << 20) : Math.pow(2, e);
}

function mulExp2(x: number, e: number) {
  return x * exp2Int(e);
}

function decodeNormalized(d: number, eAdjust: number): [int.Integer, number] {
  const [lo, hi] = doubleToBits(d);
  const sign = hi < 0 ? -1 : 1;
  const exp  = ((hi >> 20) & 0x7FF) - 1043;
  const man  = (hi & 0xFFFFF) + 0x100000;

  return [int.multiply(sign, int.add(int.multiply(man, 0x100000000), uint(lo))), exp - 32 + eAdjust];
}

function uint(d: number) {
  return d < 0 ? int.add(0x100000000, d) : d;
}

let big_endian: boolean | void = undefined;

function checkBigEndian() {
  var arrayBuffer = new ArrayBuffer(2);
  var uint8Array = new Uint8Array(arrayBuffer);
  var uint16array = new Uint16Array(arrayBuffer);
  uint8Array[0] = 0x11;
  uint8Array[1] = 0x22;
  return (uint16array[0] === 0x1122);
}

function isBigEndian() {
  if (big_endian === undefined) { big_endian = checkBigEndian();  }
  return big_endian;
}

let _buf       = new ArrayBuffer(8);
let _bufFloat = new Float64Array(_buf);
let _bufInt   = new Int32Array(_buf);

export function doubleToBits(d: number): [number, number] {
  _bufFloat[0] = d;
  return isBigEndian() ? [_bufInt[1], _bufInt[2]] : [_bufInt[0], _bufInt[1]];
}

export function doubleFromBits(lo: number, hi: number): number {
  lo = lo | 0;
  hi = hi | 0;
  if (isBigEndian()) {
    _bufInt[0] = hi | 0; _bufInt[1] = lo | 0;
  }
  else {
    _bufInt[0] = lo | 0; _bufInt[1] = hi | 0;
  }
  return _bufFloat[0];
}
