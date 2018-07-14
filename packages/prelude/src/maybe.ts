import { identity } from './combinators';

/**
 * The `Maybe` type is used to represent optional values and can be seen as
 * something like a type-safe `null`, where `Nothing` is `null` and `Just x`
 * is the non-null value `x`.
 */
export type Maybe<A> = Just<A> | Nothing;

export const enum MaybeType {
  NOTHING,
  JUST
}

export interface Nothing {
  tag: MaybeType.NOTHING;
}

export interface Just<A> {
  tag: MaybeType.JUST;
  value: A;
}

export const nothing = { tag: MaybeType.NOTHING } as Nothing;

/**
 * Construct Just a.
 * @param a
 */
export function just<A>(a: A): Maybe<A> {
  return { tag: MaybeType.JUST, value: a };
}

/**
 * functor instance
 */
export function mapMaybe<A, B>(m: Maybe<A>, f: (_: A) => B): Maybe<B> {
  return m.tag === MaybeType.NOTHING ? m : just(f(m.value));
}

/**
 * Chain instance
 */
export function chainMaybe<A, B>(m: Maybe<A>, f: (_: A) => Maybe<B>): Maybe<B> {
  return m.tag === MaybeType.NOTHING ? m : f(m.value);
}

/**
 * Take two maybe and return the first Just encountered.
 * @param m1 Maybe<A>
 * @param m2 Maybe<A>
 */
export function altMaybe<A>(m1: Maybe<A>, m2: Maybe<A>): Maybe<A> {
  return m1.tag === MaybeType.NOTHING ? m2 : m1;
}

/**
 * Takes a default value, a function, and a `Maybe` value. If the `Maybe`
 * value is `Nothing` the default value is returned, otherwise the function
 * is applied to the value inside the `Just` and the result is returned.
 * @param d The default value
 * @param f The function to be called if m is Just
 * @param m The maybe
 */
export function maybe<A, B>(d: B, f: (_: A) => B, m: Maybe<A>): B {
  return m.tag === MaybeType.NOTHING ? d : f(m.value);
}

/**
 * Similar to `maybe` but for use in cases where the default value may be
 * expensive to compute.
 */
export function maybe_<A, B>(f: () => B, g: (_: A) => B, m: Maybe<A>): B {
  return m.tag === MaybeType.NOTHING ? f() : g(m.value);
}

/**
 * Takes a default value, and a `Maybe` value. If the `Maybe` value is
 * `Nothing` the default value is returned, otherwise the value inside the
 * `Just` is returned.
 * @param d Default value to be returned in case `Maybe` is Nothing
 * @param m The `Maybe` value.
 */
export function fromMaybe<A>(d: A, m: Maybe<A>): A {
  return m.tag === MaybeType.NOTHING ? d : m.value;
}

/**
 * Similiar to `fromMaybe` but for use in case where default value may be
 * expensive to compute.
 */
export function fromMaybe_<A>(f: () => A, m: Maybe<A>): A {
  return m.tag === MaybeType.NOTHING ? f() : m.value;
}

/**
 * Returns `true` when the `Maybe` value was constructed with `Just`.
 * @param m
 */
export function isJust<A>(m: Maybe<A>): m is Just<A> {
  return m.tag === MaybeType.JUST;
}

/**
 * Returns `true` when the `Maybe` value is `Nothing`.
 * @param m
 */
export function isNothing(m: Maybe<any>): m is Nothing {
  return m.tag === MaybeType.NOTHING;
}

/**
 * Filter an array of A with function from A to Maybe<B>, keep only
 * items that returns just.
 */
export function filterMap<A, B>(xs: A[], f: (_: A) => Maybe<B>): B[] {
  let ys: B[] = [];
  let ret: Maybe<B>;
  for (let i = 0, len = xs.length; i < len; i++) {
    ret = f(xs[i]);
    if (isJust(ret)) {
      ys.push(ret.value);
    }
  }
  return ys;
}

/**
 * The catMaybes function takes a list of Maybes and returns a list of all the Just values.
 * @param xs Maybe<A>[]
 */
export function catMaybes<A>(xs: Maybe<A>[]): A[] {
  return filterMap(xs, identity);
}

/**
 * Traverse an array of A with function from A to Maybe<B>, and return Maybe<B[]>.
 * Return Just in case the function return Just for each item, otherwise
 * return Nothing.
 * @param xs
 * @param fn
 */
export function traverseMaybe<A, B>(xs: A[], fn: (_: A) => Maybe<B>): Maybe<B[]> {
  let ret: B[] = [];
  let item: Maybe<B>;
  for (let i = 0, len = xs.length; i < len; i++) {
    item = fn(xs[i]);
    if (isJust(item)) {
      ret.push(item.value);
      continue;
    }
    return nothing;
  }
  return just(ret);
}
