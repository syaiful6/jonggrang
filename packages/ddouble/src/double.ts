// Smallest positive normalized double value
const DBL_MIN = 2.2250738585072014e-308;

/**
 * Is this a [subnormal](https://en.wikipedia.org/wiki/Denormal_number) value?
 * @param {number} x js number to test
 * @return boolean
 */
export function isSubnormal(x: number) {
  return x !== 0 && Math.abs(x) < DBL_MIN;
}
