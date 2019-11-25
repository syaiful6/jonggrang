import bigInt from 'big-integer';

export class Decimal {
  constructor(public num: bigInt.BigInteger, public exp: number) {
  }

  static fromExp(n: string, exp: number): Decimal;
  static fromExp(n: number, exp: number): Decimal;
  static fromExp(n: bigint, exp: number): Decimal;
  static fromExp(n: bigInt.BigInteger, exp: number): Decimal;
  static fromExp(n: any, exp: number) {
    const x = roundExp(exp);
    const diff = exp - x;
    return diff === 0 ? new Decimal(bigInt(n), exp) : new Decimal(bigintMulExp10(n, diff), x);
  }

  isZero() {
    return this.num.isZero();
  }

  add(y: Decimal) {
    const e =  Math.min(this.exp, y.exp);
    const xx = expand(this, e);
    const yy = expand(y, e);
    return new Decimal(xx.num.add(yy.num), e);
  }

  negate() {
    return new Decimal(this.num.negate(), this.exp);
  }

  substract(y: Decimal) {
    return this.add(y.negate());
  }

  multiply(y: Decimal) {
    const z = Decimal.fromExp(this.num.multiply(y.num), this.exp + y.exp);
    return z.exp < 0 ? z.reduce() : z;
  }

  divide(y: Decimal) {
    return this.divideWith(y);
  }

  reduce() {
    const p = countPow10(this.num);
    if (p < 0) return this;

    const expp = this.exp + p;
    return roundExp(expp) === this.exp ? this : Decimal.fromExp(bigintDivExp10(this.num, p), expp);
  }

  divideWith(y: Decimal, minPrec: number = 15) {
    if (this.isZero() || y.isZero()) return new Decimal(bigInt(0), 0);
    const e = this.exp - y.exp;
    const xdigits = countPow10(this.num);
    const ydigits = countPow10(y.num);
    const extra   = Math.max(0, ydigits - xdigits) + minPrec;
    return extra > 0
      ? Decimal.fromExp(bigintMulExp10(this.num, extra).divide(y.num), e - extra).reduce()
      : Decimal.fromExp(this.num.divide(y.num), e - extra).reduce();
  }
}

function roundExp(exp: number) {
  return exp === 0 ? exp : 7 * intDiv(exp, 7);
}

function intDiv(x: number, y: number) {
  if (y === 0) return 0;
  const q = Math.trunc(x / y);
  const r = x % y;
  return r < 0 ? (y > 0 ? q - 1 : q + 1) : q;
}

function expand(x: Decimal, e: number) {
   if (x.exp <= e) return x;
   return Decimal.fromExp(bigintMulExp10(x.num, x.exp - e), e);
}

function bigintMulExp10(i: string | number | bigint | bigInt.BigInteger, n: bigInt.BigNumber) {
  return bigInt(i as any).multiply(bigInt(10).pow(n));
}

function bigintDivExp10(i: string | number | bigint | bigInt.BigInteger, n: bigInt.BigNumber) {
  return bigInt(i as any).divide(bigInt(10).pow(n));
}

// function exp10(exp: string | number | bigint | bigInt.BigInteger) {
//   return bigintMulExp10(1, exp);
// }

function countPow10(x: bigInt.BigInteger) {
  let j = 0;
  while(!x.isZero()) {
    var {quotient, remainder} = x.divmod(10);
    if (remainder.isZero()) { j++; }
          else break;
    x = quotient;
  }
  return j
}
