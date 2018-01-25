export function thrower(e: Error) {
  setTimeout(() => { throw e; }, 0);
}

export function o<A, B, C>(f: (_: B) => C, g: (_: A) => B) {
  return (x: A) => f(g(x));
}

export function id<A>(a: A): A {
  return a;
}

export function doNothing() {}
