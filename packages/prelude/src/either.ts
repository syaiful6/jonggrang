export const enum EitherType {
  LEFT,
  RIGHT
}

/**
 * The `Either` type is used to represent a choice between two types of value.
 * A common use case for `Either` is error handling, where `Left` is used to
 * carry an error value and `Right` is used to carry a success value.
 */
export type Either<A, B> = Left<A> | Right<B>

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
 * mapEither allow functions to transform the contents of a `Right`.
 * `Left` value are untouched
 * @param f
 * @param e
 */
export function mapEither<A, B, C>(f: (_: B) => C, e: Either<A, B>): Either<A, C> {
  return e.tag === EitherType.LEFT ? e : right(f(e.value));
}

export function chainEither<A, B, C>(f: (_: B) => Either<A, C>, e: Either<A, B>): Either<A, C> {
  return e.tag === EitherType.LEFT ? e : f(e.value);
}

export function altEither<A, B>(e1: Either<A, B>, e2: Either<A, B>): Either<A, B> {
  return e1.tag === EitherType.LEFT ? e1 : e2;
}

export function either<A, B, C>(f: (_: A) => C, g: (_: B) => C, e: Either<A, B>): C {
  return e.tag === EitherType.LEFT ? f(e.value) : g(e.value);
}

export function isLeft(e: Either<any, any>): boolean {
  return e.tag === EitherType.LEFT;
}

export function isRight(e: Either<any, any>): boolean {
  return e.tag === EitherType.RIGHT;
}
