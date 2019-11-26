import bigInt from 'big-integer';

// javascript's number max precision 53bit
const MAX_PRECISE = 9007199254740991; // 2^53 -1
const MIN_PRECISE = -MAX_PRECISE;
// LOG Base used by big integer library
const LOG_BASE = 7;
//
export type Integer = number | bigint | bigInt.BigInteger;

function isSmall(x: number) {
  return x >= MIN_PRECISE && x <= MAX_PRECISE
}

export function isPositive(x: Integer) {
  return typeof x === 'number' ? x > 0 : compare(x, 0) > 0;
}

export function isInteger53(x: number): boolean {
  if (isNaN(x) || !isSmall(x)) return false;
  return Math.floor(x) === x;
}

function unBig(x: Integer): Integer {
  if (typeof x === 'number') return isSmall(x) ? x : bigInt(x);
  if ((x as any).isSmall && isSmall((x as any).value)) return x;

  if (Array.isArray((x as any).value) && (x as any).length === 1) {
    var v: any = (x as any).value[0];
    if ((x as any).sign) v = -v;
    if (isSmall(v)) return v;
  }
  return x;
}

export function unsafeToJSNumber(x: Integer): number {
  return typeof x === 'number' ? x : bigInt(x).toJSNumber();
}

export function isZero(x: Integer): boolean {
  return typeof x === 'number' ? x === 0 : bigInt(x as any).isZero();
}

export function add(x: Integer, y: Integer): Integer {
  return unBig(bigInt(x as any).add(y));
}

export function subtract(x: Integer, y: Integer): Integer {
  return unBig(bigInt(x as any).subtract(y));
}

export function multiply(x: Integer, y: Integer): Integer {
  return unBig(bigInt(x as any).multiply(y));
}

export function divmod(x: Integer, y: Integer): [Integer, Integer] {
  if (typeof x === 'number' && typeof y === 'number') {
    let q = Math.trunc(x / y);
    let r = x % y;
    if (r < 0) {
      if (y > 0) { q = q - 1; r = r + y; }
          else { q = q + 1; r = r - y; }
    }
    return [q, r];
  }
  const d  = bigInt(y as any);
  let {quotient: q, remainder: r} = bigInt(x as any).divmod(d);
  if (r.isNegative()) {
    if (d.isPositive()) { q = q.prev(); r = r.add(d) }
                   else { q = q.next(); r = r.subtract(d) }
  }
  return [unBig(q), unBig(r)];
}

export function divide(x: Integer, y: Integer): Integer {
  if (isZero(y)) return 0;
  if (typeof x === 'number' && typeof y === 'number') {
    const q = Math.trunc(x / y);
    const r = x % y;
    return r< 0 ? (y > 0 ? q - 1 : q + 1) : q;
  }
  return divmod(x, y)[0];
}

export function mod(x: Integer, y: Integer) {
  if (isZero(y)) return 0;
  if (typeof x === 'number' && typeof y === 'number') {
    let r = x % y;
    return r < 0 ? (y > 0 ? r + y : r - y) : r;
  }
  divmod(x, y)[1];
}

export function exp10(n: Integer): Integer {
  return mulExp10(1, n);
}

export function mulExp10(i: Integer, n: Integer): Integer {
  if (typeof i === 'number' && typeof n === 'number' && isSmall(i) && n <= 14) {
    return multiply(i, Math.pow(10, n));
  }
  return multiply(i, bigInt(10).pow(n));
}

export function cdivmodExp10(i: Integer, n: Integer): [Integer, Integer] {
  if (compare(n, 0) <= 0) return [i, 0];
  const cq = cdivExp10(i, n);
  const cr = subtract(i, mulExp10(cq, n));
  return [cq, cr];
}

export function divmodExp10(i: Integer, n: Integer): Integer {
  const [cq, cr] = cdivmodExp10(i, n);
  return isPositive(cr) ? [cq, cr] : [decrement(cq), add(cr, exp10(n))];
}

export function cdivExp10(i: Integer, n: Integer): Integer {
  if (typeof i === 'number' && typeof n === 'number' && isSmall(i) && n <= 14) {
    return Math.trunc(i / Math.pow(10, n));
  }
  return bigInt(i as any).divide(bigInt(10).pow(n));
}

export function compare(x: Integer, y: Integer): 1 | 0 | -1 {
  return bigInt(x as any).compare(y);
}

export function negate(x: Integer) {
  if (typeof x === 'number') return -x;
  return bigInt(x as any).negate();
}

export function increment(x: Integer) {
  return unBig(bigInt(x as any).next());
}

export function decrement(x: Integer) {
  if (typeof x === 'number') return x - 1;
  return unBig(bigInt(x as any).prev());
}

// Return the number of ending `0` digits of `i`. Return `0` when `i==0`.
export function isExp10(x: Integer): number {
  if (typeof x === 'number') {
    return countPow10Small(x);
  }
  if ((x as any).isSmall) return countPow10Small((x as any).value);
  // otherwise use slowpath
  x = bigInt(x as any);
  let j = 0;
  while (!x.isZero()) {
    const {quotient, remainder} = x.divmod(10);
    if (remainder.isZero()) { j++; }
    else break;
    x = quotient;
  }
  return j;
}

const TEN = bigInt(10);

export function bigCountDigits(x: Integer): Integer {
  if (typeof x === 'number') {
    return countDigitSmall(x);
  }
  if ((x as any).isSmall) return countDigitSmall((x as any).value);
  if (Array.isArray((x as any).value) && (x as any).length === 1) {
    // this is BigInteger implementation
    let v: number[] = (x as any).value;
    let l = v.length;
    return countDigitSmall(v[l-1]) + (LOG_BASE * (l - 1));
  }
  // native bigInt
  let digits = 0;
  let y = bigInt(x as any);
  let bits = y.bitLength();
  while (bits.compareTo(4) > 0) {
    let reduce = bits.divide(4);
    y = y.divide(TEN.pow(reduce));
    digits += reduce.toJSNumber();
    bits = y.bitLength();
  }
  if (y.compareTo(9) > 0) {
    digits += 1;
  }
  return digits;
}

const LOG10 = Math.log(10);

function countDigitSmall(x: number) {
  if (x === 0) return x;
  x = Math.abs(x);
  if (x < 1e8) return countDigit8(x);
  return (1 + Math.floor(Math.log(Math.abs(x)))) / LOG10;
}

function countDigit8(x: number) {
  if (x < 1e4) {
    return x < 1e2 ? (x < 10 ? 1 : 2) : (x < 1000 ? 3 : 4)
  }
  return x < 1e6 ?  (x < 1e5 ? 5 : 6) : (x < 1e7 ? 7 : 8);
}

function countPow10Small(x: number) {
  let j = 0;
  while(x !== 0) {
    var m = x % 10;
    if (m === 0) { j++; }
    else break;
    x = x / 10;
  }
  return j;
}
