import { just, nothing, Maybe } from './maybe';

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

export function foldl<A, B>(f: (b: B, a: A) => B, b: B, list: List<A>): B {
  while (list.tag !== ListType.NIL) {
    b = f(b, list.head);
    list = list.tail;
  }
  return b;
}

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
