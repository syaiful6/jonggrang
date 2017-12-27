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
  return { tag: MaybeType.JUST, value: a }
}

/**
 * functor instance
 */
export function mapMaybe<A, B>(f: (_: A) => B, m: Maybe<A>): Maybe<B> {
  return m.tag === MaybeType.NOTHING ? m : just(f(m.value));
}

/**
 * Chain instance
 */
export function chainMaybe<A, B>(f: (_: A) => Maybe<B>, m: Maybe<A>): Maybe<B> {
  return m.tag === MaybeType.NOTHING ? m : f(m.value);
}

export function altMaybe<A>(m1: Maybe<A>, m2: Maybe<A>): Maybe<A> {
  return m1.tag === MaybeType.NOTHING ? m2 : m1;
}

export function applyMaybe<A, B>(fm: Maybe<(_: A) => B>, m: Maybe<A>): Maybe<B> {
  return fm.tag === MaybeType.NOTHING ? fm : mapMaybe(fm.value, m);
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
 * Returns `true` when the `Maybe` value was constructed with `Just`.
 * @param m
 */
export function isJust<A>(m: Maybe<A>): m is Just<A> {
  return maybe(false, alwaysTrue, m);
}

/**
 * Returns `true` when the `Maybe` value is `Nothing`.
 * @param m
 */
export function isNothing(m: Maybe<any>): m is Nothing {
  return maybe(true, alwaysFalse, m);
}

function alwaysTrue() {
  return true;
}

function alwaysFalse() {
  return false;
}
