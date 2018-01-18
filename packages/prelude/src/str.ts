import { Maybe, nothing, just } from './maybe';

/**
 * Returns the index of the first occurrence of the pattern in the
 * given string. Returns `Nothing` if there is no match.
 */
export function indexOf(pattern: string, subj: string): Maybe<number> {
  const ix = subj.indexOf(pattern);
  return ix === -1 ? nothing : just(ix);
}

/**
 * Returns the string without the first `n` characters.
 * @param n number
 * @param s string
 */
export function drop(n: number, s: string): string {
  return s.substring(n);
}

/**
 * eturns the first `n` characters of the string.
 * @param n number
 * @param s number
 */
export function take(n: number, s: string): string {
  return s.substr(0, n);
}
