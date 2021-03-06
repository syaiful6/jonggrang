import { Maybe, nothing, just, isJust } from './maybe';

/**
 * Check if the given string is empty
 */
export function isEmpty(s: string): boolean {
  return s.length === 0;
}

/**
 * Returns the index of the first occurrence of the pattern in the
 * given string. Returns `Nothing` if there is no match.
 */
export function indexOf(pattern: string, subj: string): Maybe<number> {
  const ix = subj.indexOf(pattern);
  return ix === -1 ? nothing : just(ix);
}

/**
 * Returns the index of the last occurrence of the pattern in the
 * given string. Returns `Nothing` if there is no match.
 */
export function lastIndexOf(pattern: string, subj: string): Maybe<number> {
  const ix = subj.lastIndexOf(pattern);
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
 * Returns the first `n` characters of the string.
 * @param n number
 * @param s number
 */
export function take(n: number, s: string): string {
  return s.substr(0, n);
}

/**
 * Returns the number of contiguous characters at the beginning
 * of the string for which the predicate holds.
 */
export function count(pred: (_: string) => boolean, s: string): number {
  let i = 0;
  while (i < s.length && pred(s.charAt(i))) {
    i++;
  }
  return i;
}

/**
 * Returns the longest prefix (possibly empty) of characters that satisfy
 * the predicate.
 */
export function takeWhile(pred: (_: string) => boolean, s: string): string {
  return take(count(pred, s), s);
}

/**
 * Returns the suffix remaining after `takeWhile`.
 */
export function dropWhile(pred: (_: string) => boolean, s: string): string {
  return drop(count(pred, s), s);
}

/**
 * If the string starts with the given prefix, return the portion of the
 * string left after removing it, as a Just value. Otherwise, return Nothing.
 */
export function stripPrefix(pattern: string, str: string): Maybe<string> {
  const ix = indexOf(pattern, str);
  return isJust(ix) && ix.value === 0 ? just(drop(pattern.length, str)) : nothing;
}
