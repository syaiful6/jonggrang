/**
 * identity combinator, return it's argument
 */
export function identity<A>(x: A): A {
  return x;
}

/**
 * constant combinator
 */
export function constant<A>(x: A): <B>(_: B) => A {
  return () => x;
}
