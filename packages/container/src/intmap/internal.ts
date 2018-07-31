export type Mask = number;

export type Prefix = number;

export function maskLonger(m1: Mask, m2: Mask): boolean {
  return m1 < m2;
}

export function highestBitMask(x1: number): number {
  const x2 = x1 | x1 >>> 1;
  const x3 = x2 | x2 >>> 2;
  const x4 = x3 | x3 >>> 4;
  const x5 = x4 | x4 >>> 8;
  const x6 = x5 | x5 >>> 16;
  return x6 ^ x6 >>> 1;
}

export function highestBit(x: number, m: number): number {
  return highb(x & ~(m - 1 | 0), m);
}

function highb(x: number, m: number): number {
  while (x !== m) {
    x = x & ~m;
    m = 2 * m | 0;
  }
  return m;
}

export function branchingBit_(k1: number, m1: Mask, k2: number, m2: number): number {
  return highestBit(k1 ^ k2, Math.max(1, 2 * Math.max(m1, m2) | 0));
}

export function branchingBit(k1: number, k2: number) {
  return branchingBit_(k1, 0, k2, 0);
}

export function branchMask(x1: number, x2: number) {
  return highestBitMask(x1 ^ x2);
}

export function branchLeft(m: Mask, k: number) {
  return (m & k) === 0;
}

export function mask(m: Mask, k: number): Prefix {
  return (k | (m - 1 | 0)) & ~m;
}

export function matchPrefix(p: Prefix, m: Mask, k: number) {
  return mask(m, k) === p;
}
