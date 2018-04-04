import { just, nothing, Maybe, mapMaybe } from './maybe';

export const enum ListType {
  NIL,
  CONS
}

export type List<A>
  = { tag: ListType.NIL }
  | { tag: ListType.CONS; head: A; tail: List<A> };

/**
 * Create list with cons
 * @param head the head of list
 * @param tail the tail of list
 * @return list
 */
export function cons<A>(head: A, tail: List<A>): List<A> {
  return { head, tail, tag: ListType.CONS };
}

export const nil: List<any> = { tag: ListType.NIL };

/**
 * create a list
 */
export function list<A>(...xs: A[]): List<A> {
  return xs.reduceRight((li, a) => cons(a, li), nil);
}

/**
 * Create a list with a single element.
 */
export function singleton<A>(head: A): List<A> {
  return cons(head, nil);
}

/**
 * Create a list containing a range of integers, including both endpoints.
 */
export function range(start: number, end: number): List<number> {
  if (start === end) return singleton(start);

  let list: List<number> = nil;
  let step = start > end ? 1 : -1;
  while (start !== end) {
    list = cons(end, list);
    end += step;
  }

  return cons(end, list);
}

/**
 * Left-associative fold of a structure.
 */
export function foldl<A, B>(f: (b: B, a: A) => B, b: B, list: List<A>): B {
  while (list.tag !== ListType.NIL) {
    b = f(b, list.head);
    list = list.tail;
  }
  return b;
}

/**
 * Right-associative fold of a structure.
 */
export function foldr<A, B>(f: (a: A, b: B) => B, b: B, list: List<A>): B {
  return foldl((b2, a2) => f(a2, b2), b, foldl((b1, a1) => cons(a1, b1), nil, list));
}

/**
 * Append an element to the end of a list, creating a new list.
 */
export function snoc<A>(xs: List<A>, x: A): List<A> {
  return foldr(cons, singleton(x), xs) as any;
}

// Non-indexed reads

/**
 * Get the first element in a list, or `Nothing` if the list is empty.
 */
export function head<A>(xs: List<A>): Maybe<A> {
  return xs.tag === ListType.NIL ? nothing : just(xs.head);
}

/**
 * Get all but the first element of a list, or `Nothing` if the list is empty.
 */
export function tail<A>(xs: List<A>): Maybe<List<A>> {
  return xs.tag === ListType.NIL ? nothing : just(xs.tail);
}

/**
 * Break a list into its first element, and the remaining elements,
 * or `Nothing` if the list is empty.
 */
export function uncons<A>(xs: List<A>): Maybe<{ head: A, tail: List<A> }> {
  return xs.tag === ListType.NIL ? nothing : just({ head: xs.head, tail: xs.tail });
}

/**
 * Get the last element in a list, or `Nothing` if the list is empty.
 */
export function last<A>(xs: List<A>): Maybe<A> {
  while (xs.tag !== ListType.NIL) {
    if (isEmpty(xs.tail)) {
      return just(xs.head);
    }
    xs = xs.tail;
  }
  return nothing;
}

/**
 * Get all but the last element of a list, or `Nothing` if the list is empty.
 */
export function init<A>(xs: List<A>): Maybe<List<A>> {
  return mapMaybe(unsnoc(xs), _takeInit);
}

/**
 * Break a list into its last element, and the preceding elements,
 * or `Nothing` if the list is empty.
 */
export function unsnoc<A>(xs: List<A>): Maybe<{ init: List<A>, last: A }> {
  let acc: List<A> = nil;
  while (xs.tag !== ListType.NIL) {
    if (isEmpty(xs.tail)) {
      return just({ init: reverse(acc), last: xs.head });
    }
    acc = cons(xs.head, acc);
    xs = xs.tail;
  }
  return nothing;
}

/**
 * Reverse a list.
 */
export function reverse<A>(xs: List<A>): List<A> {
  let acc = nil;
  while (xs.tag !== ListType.NIL) {
    acc = cons(xs.head, acc);
    xs = xs.tail;
  }
  return acc;
}

/**
 * Test whether a list is empty.
 */
export function isEmpty<A>(xs: List<A>): xs is { tag: ListType.NIL } {
  return xs.tag === ListType.NIL;
}

/**
 * Get the length of a list
 */
export function length(xs: List<any>): number {
  return foldl(_increment, 0, xs);
}

export function joinWith<A>(xs: List<A>, f: (x: A) => string): string {
  let out = '';
  while (xs.tag !== ListType.NIL) {
    out += f(xs.head);
    xs = xs.tail;
  }
  return out;
}

function _increment(a: number) {
  return a + 1;
}

function _takeInit<A>(un: { init: List<A>, last: A }): List<A> {
  return un.init;
}
