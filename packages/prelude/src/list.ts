import { just, nothing, Maybe, mapMaybe, isNothing, isJust } from './maybe';
import { Either, isLeft } from './either';
import { identity } from './combinators';


export const enum ListType {
  NIL,
  CONS
}

export type List<A>
  = { tag: ListType.NIL }
  | { tag: ListType.CONS; head: A; tail: List<A> };

class StdList<A> {
  constructor(readonly tag: ListType, readonly head: A | undefined, readonly tail: List<A> | undefined) {
  }
}

/**
 * Create list with cons
 * @param head the head of list
 * @param tail the tail of list
 * @return list
 */
export function cons<A>(head: A, tail: List<A>): List<A> {
  return new StdList(ListType.CONS, head, tail) as List<A>;
}

/**
 * The empty list
 */
export const nil = new StdList(ListType.NIL, undefined, undefined) as List<any>;

/**
 * create a list
 */
export function list<A>(...xs: A[]): List<A> {
  return xs.reduceRight((li, a) => cons(a, li), nil);
}

// to and from array

/**
 * Create a list from an array
 */
export function fromArray<A>(xs: A[]): List<A> {
  return xs.reduceRight((xs, x) => cons(x, xs), nil);
}

/**
 * convert a list to an array
 */
export function toArray<A>(xs: List<A>): A[] {
  let out: A[] = [];
  while (xs.tag === ListType.CONS) {
    out.push(xs.head);
    xs = xs.tail;
  }
  return out;
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

// Indexed operations

/**
 * Get the element at the specified index, or `Nothing` if the index is out-of-bounds.
 */
export function index<A>(xs: List<A>, i: number): Maybe<A> {
  while (xs.tag !== ListType.NIL) {
    if (i === 0) return just(xs.head);
    xs = xs.tail;
    i--;
  }

  return nothing;
}

/**
 * Find the first index for which a predicate holds.
 */
export function findIndex<A>(f: (_: A) => boolean, xs: List<A>): Maybe<number> {
  let i = 0;
  while (xs.tag !== ListType.NIL) {
    if (f(xs.head)) return just(i);
    xs = xs.tail;
    i++;
  }
  return nothing;
}

/**
 * Find the last index for which a predicate holds.
 */
export function findLastIndex<A>(f: (_: A) => boolean, xs: List<A>): Maybe<number> {
  return mapMaybe(findIndex(f, reverse(xs)), ix => (length(xs) - 1) - ix);
}

/**
 * Insert an element into a list at the specified index, returning a new
 * list or `Nothing` if the index is out-of-bounds.
 */
export function insertAt<A>(ix: number, x: A, xs: List<A>): Maybe<List<A>> {
  return ix === 0 ? just(cons(x, xs))
    : xs.tag === ListType.CONS ? mapMaybe(insertAt(ix - 1, x, xs.tail), ys => cons(xs.head, ys))
      : nothing;
}

/**
 * Delete an element from a list at the specified index, returning a new
 * list or `Nothing` if the index is out-of-bounds.
 */
export function deleteAt<A>(ix: number, xs: List<A>): Maybe<List<A>> {
  return ix === 0 && xs.tag === ListType.CONS ? just(xs.tail)
    : xs.tag === ListType.CONS ?  mapMaybe(deleteAt(ix - 1, xs.tail), ys => cons(xs.head, ys))
      : nothing;
}

/**
 * Update the element at the specified index, returning a new
 * list or `Nothing` if the index is out-of-bounds.
 */
export function updateAt<A>(ix: number, x: A, xs: List<A>): Maybe<List<A>> {
  return ix === 0 && xs.tag === ListType.CONS ? just(cons(x, xs.tail))
    : xs.tag === ListType.CONS ? mapMaybe(updateAt(ix - 1, x, xs.tail), ys => cons(xs.head, ys))
      : nothing;
}

/**
 * Update the element at the specified index by applying a function to
 * the current value, returning a new list or `Nothing` if the index is
 * out-of-bounds.
 */
export function modifiAt<A>(ix: number, f: (x: A) => A, xs: List<A>): Maybe<List<A>> {
  return alterAt(ix, x => just(f(x)), xs);
}

/**
 * Update or delete the element at the specified index by applying a
 * function to the current value, returning a new list or `Nothing` if the
 * index is out-of-bounds.
 */
export function alterAt<A>(ix: number, f: (x: A) => Maybe<A>, xs: List<A>): Maybe<List<A>> {
  if (ix === 0 && xs.tag === ListType.CONS) {
    let ret = f(xs.head);
    return isNothing(ret) ? just(xs.tail) : just(cons(ret.value, xs.tail));
  }

  return xs.tag === ListType.CONS
    ? mapMaybe(alterAt(ix - 1, f, xs.tail), ys => cons(xs.head, ys))
    : nothing;
}

// Transformations

/**
 * Flatten a list of lists.
 */
export function concat<A>(xxs: List<List<A>>): List<A> {
  return concatMap(identity as any, xxs);
}

/**
 * Apply a function to each element in a list, and flatten the results
 * into a single, new list.
 */
export function concatMap<A, B>(f: (x: A) => List<B>, xs: List<A>): List<B> {
  let acc: List<B> = nil;
  while (xs.tag !==  ListType.NIL) {
    acc = append(acc, f(xs.head));
    xs = xs.tail;
  }
  return acc;
}

/**
 * Transform each element in a list using a given function
 */
export function map<A, B>(f: (_: A) => B, xs: List<A>): List<B> {
  let acc: List<B> = nil;
  while (xs.tag === ListType.CONS) {
    acc = cons(f(xs.head), acc);
    xs = xs.tail;
  }
  return reverse(acc);
}

/**
 * Apply a function to each element in a list, keeping only the results which
 * contain a value.
 */
export function filterMap<A, B>(f: (x: A) => Maybe<B>, xs: List<A>): List<B> {
  let acc: List<B> = nil;
  let ret: Maybe<B>;
  while (xs.tag !== ListType.NIL) {
    ret = f(xs.head);
    if (isJust(ret)) acc = cons(ret.value, acc);
    xs = xs.tail;
  }
  return reverse(acc);
}

/**
 * Filter a list, keeping the elements which satisfy a predicate function.
 */
export function filter<A>(f: (x: A) => boolean, xs: List<A>): List<A> {
  let acc: List<A> = nil;
  while (xs.tag !== ListType.NIL) {
    if (f(xs.head)) acc = cons(xs.head, acc);
    xs = xs.tail;
  }
  return reverse(acc);
}

/**
 * partition a List on an either predicate.
 */
export function partitionMap<A, L, R>(
  f: (_: A) => Either<L, R>,
  xs: List<A>
): { left: List<L>; right: List<R> } {
  function select(x: A, acc: { left: List<L>; right: List<R> }): { left: List<L>; right: List<R> } {
    let ret = f(x);
    return isLeft(ret) ? { left: cons(ret.value, acc.left), right: acc.right }
      : { left: acc.left, right: cons(ret.value, acc.right) };
  }
  return foldr(select, { left: nil, right: nil }, xs);
}

/**
 * The 'find' function takes a predicate and a structure and returns
 * the leftmost element of the structure matching the predicate, or
 * 'Nothing' if there is no such element.
 */
export function find<A>(f: (_: A) => boolean, xs: List<A>): Maybe<A> {
  while (xs.tag !== ListType.NIL) {
    if (f(xs.head)) return just(xs.head);
    xs = xs.tail;
  }
  return nothing;
}

/**
 * Append to list
 */
export function append<A>(xs: List<A>, ys: List<A>): List<A> {
  return foldr(cons, ys, xs) as any;
}

// Zipping
/**
 * Apply a function to pairs of elements at the same positions in two lists,
 * collecting the results in a new list.
 * If one list is longer, elements will be discarded from the longer list.
 */
export function zipWith<A, B, C>(f: (a: A, b: B) => C, xs: List<A>, ys: List<B>): List<C> {
  let acc: List<C> = nil;
  while (xs.tag === ListType.CONS && ys.tag === ListType.CONS) {
    acc = cons(f(xs.head, ys.head), acc);
    xs = xs.tail;
    ys = ys.tail;
  }
  return reverse(acc);
}

/**
 * Collect pairs of elements at the same positions in two lists.
 */
export function zip<A, B>(xs: List<A>, ys: List<B>): List<[A, B]> {
  return zipWith(arrTuple as any, xs, ys);
}

/**
 * Convert List<A> to string using mapping function from A to string
 */
export function joinWith<A>(xs: List<A>, f: (x: A) => string): string {
  let out = '';
  while (xs.tag !== ListType.NIL) {
    out += f(xs.head);
    xs = xs.tail;
  }
  return out;
}

/**
 * Joins the elements of list  with a separator between them.
 */
export function join(xs: List<string>, separator?: string): string {
  let out = '';
  let first = true;
  separator = separator || '';
  while (xs.tag === ListType.CONS) {
    if (first) {
      out += xs.head;
      first = false;
    } else {
      out += separator + xs.head;
    }
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

function arrTuple<A, B>(x: A, y: B): [A, B] {
  return [x, y];
}
