export function thrower(e: Error) {
  setTimeout(() => { throw e; }, 0);
}

export function o<A, B, C>(f: (_: B) => C, g: (_: A) => B) {
  return (x: A) => f(g(x));
}

export function id<A>(a: A): A {
  return a;
}

export function withAppend(xs: any[], x: any): any[] {
  const len = xs.length;
  const ys = new Array(len + 1);
  var i: number;
  for (i = 0; i < len; i++) {
    ys[i] = xs[i];
  }
  ys[i] = x;
  return ys;
}

export function doNothing() {}
