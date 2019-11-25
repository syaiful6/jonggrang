const maxprecise: number = 9007199254740991;
const minprecise: number = -maxprecise;

function isPrecise(i: number): boolean {
  return i >= minprecise && i <= maxprecise;
}

function isInt53(i: number): boolean {
  if (!isPrecise(i)) return false;
  return Math.floor(i) === i;
}

class DDouble {
  constructor(public hi: number, public lo: number) {
  }

  static fromNumber(x: number): DDouble {
    return new DDouble(x, 0.0);
  }

  static fromExp(n: number, exp: number): DDouble | null {
    if (!isInt53(n) || !isInt53(exp)) return null;
    const dd = DDouble.fromNumber(n);
    return exp === 0 ? dd : mulExp10(dd, exp);
  }

  negate(): DDouble {
    return new DDouble(-this.hi, -this.lo);
  }

  add(x: DDouble): DDouble {
    const z1 = sum(this.hi, x.hi);
    const lo = sum(this.lo, x.lo);
    const e1 = z1.err + lo.num;
    const z2 = quicksum(z1.num, e1);
    const e2 = z2.err + lo.err;
    return dquicksum(z2.num, e2);
  }

  substract(x: DDouble): DDouble {
    return this.add(x.negate());
  }

  multiply(y: DDouble): DDouble {
    const z = prod(this.hi, y.hi);
    const e  = z.err + (this.hi * y.lo + this.lo * y.hi);
    return dquicksum(z.num, e);
  }

  square() {
    const z = prodsqr(this.hi);
    const e = (z.err + (2.0 * this.hi * this.lo)) + (this.lo * this.lo);
    return dquicksum(z.num, e);
  }

  divide(y: DDouble): DDouble {
    const q1 = DDouble.fromNumber(this.hi / y.hi);
    if (!q1.isFinite() || !isFinite(y.hi)) return q1;
    const r1 = this.substract(y.multiply(q1));
    const q2 = DDouble.fromNumber(r1.hi / y.hi);
    const r2 = r1.substract(y.multiply(q2));
    const q3 = DDouble.fromNumber(r2.hi / y.hi);
    const q  = dquicksum(q1.hi, q2.hi);
    return q.add(q3);
  }

  isZero() {
    return this.hi === 0;
  }

  isNeg() {
    return this.hi < 0;
  }

  isPos() {
    return this.hi > 0;
  }

  isFinite() {
    return isFinite(this.hi) && isFinite(this.lo);
  }
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
  if (isFinite(x)) return DDouble.fromNumber(x);
  let z   = x + y;
  let err = y - (z - x);
  return new DDouble(z, isFinite(x) ? err : z);
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

const zero = DDouble.fromNumber(0.0);
const one  = DDouble.fromNumber(1.0);
const ten  = DDouble.fromNumber(10.0);
const two  = DDouble.fromNumber(2.0);
const nan  = new DDouble(NaN, 0.0);

function npwrAcc(x: DDouble, acc: DDouble, n: number): DDouble {
  loop: while (true) {
    if (n <= 0) return acc;
    // if even
    if ((n & 1) !== 1) {
      x = x.square();
      n = n / 2;
      continue loop;
    }
    acc = x.multiply(acc);
    n = n - 1;
    continue;
  }
}

function npwr(x: DDouble, n: number): DDouble {
  if (n === 0) return x.isZero() ? nan : one;
  if (n === 1) return x;
  return npwrAcc(x, one, n);
}

function powi(x: DDouble, n: number): DDouble {
  const p = npwr(x, Math.abs(n));
  return n < 0 ? one.divide(p) : p;
}

function powi10(exp: number): DDouble {
  return powi(ten, exp);
}

function mulExp10(x: DDouble, exp: number) {
  return exp === 0 ? x : x.multiply(powi10(exp));
}
