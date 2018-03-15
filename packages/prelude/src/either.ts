export const enum EitherType {
  LEFT,
  RIGHT
}

/**
 * The `Either` type is used to represent a choice between two types of value.
 * A common use case for `Either` is error handling, where `Left` is used to
 * carry an error value and `Right` is used to carry a success value.
 */
export type Either<A, B> = Left<A> | Right<B>;

export interface Left<A> {
  tag: EitherType.LEFT;
  value: A;
}

export interface Right<A> {
  tag: EitherType.RIGHT;
  value: A;
}

/**
 * Construct an Either with constructor Right
 * @param value
 */
export function right<A>(value: A): Right<A> {
  return { tag: EitherType.RIGHT, value };
}

/**
 * Construct an Either with constructor Right
 * @param value
 */
export function left<A>(value: A): Left<A> {
  return { tag: EitherType.LEFT, value };
}

/**
 * Take 2 functions and an `Either` value, transform the contents of a `Left`
 * with first function, if the value is a `Right` then transform the contents
 * with second function.
 * @param f
 * @param g
 * @param e
 */
export function bimapEither<A, B, C, D>(
  e: Either<A, B>,
  f: (_: A) => C,
  g: (_: B) => D,
): Either<C, D> {
  return e.tag === EitherType.LEFT ? left(f(e.value)) : right(g(e.value));
}

/**
 * mapEither allow functions to transform the contents of a `Right`.
 * `Left` value are untouched
 * @param f
 * @param e
 */
export function mapEither<A, B, C>(e: Either<A, B>, f: (_: B) => C): Either<A, C> {
  return e.tag === EitherType.RIGHT ? right(f(e.value)) : e;
}

/**
 * lmapEither allow function to transform the contents of a `Left`.
 * @param f function
 * @param e an Either
 */
export function lmapEither<A, B, C>(e: Either<A, B>, f: (_: A) => C): Either<C, B> {
  return e.tag === EitherType.LEFT ? left(f(e.value)) : e;
}

/**
 * Allows sequencing of `Either` values and functions
 * @param f
 * @param e
 */
export function chainEither<A, B, C>(e: Either<A, B>, f: (_: B) => Either<A, C>): Either<A, C> {
  return e.tag === EitherType.LEFT ? e : f(e.value);
}

/**
 * Allows for a choice to be made between two `Either`, where the first `Right` encountered
 * is taken.
 * @param e1
 * @param e2
 */
export function altEither<A, B>(e1: Either<A, B>, e2: Either<A, B>): Either<A, B> {
  return e1.tag === EitherType.LEFT ? e2 : e1;
}

/**
 * Takes two functions and an `Either` value, if the value is a `Left` the
 * inner value is applied to the first function, if the value is a `Right`
 * the inner value is applied to the second function.
 * @param f
 * @param g
 * @param e
 */
export function either<A, B, C>(f: (_: A) => C, g: (_: B) => C, e: Either<A, B>): C {
  return e.tag === EitherType.LEFT ? f(e.value) : g(e.value);
}

/**
 * Returns `true` when the `Either` value was constructed with `Left`.
 * @param e
 */
export function isLeft<A>(e: Either<A, any>): e is Left<A> {
  return e.tag === EitherType.LEFT;
}

/**
 * Returns `true` when the `Either` value was constructed with `Right`.
 * @param e
 */
export function isRight<A>(e: Either<any, A>): e is Right<A> {
  return e.tag === EitherType.RIGHT;
}
