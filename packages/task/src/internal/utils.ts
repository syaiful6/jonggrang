export function thrower(e: Error) {
  setTimeout(() => { throw e; }, 0);
}

export function o<A, B, C>(f: (_: B) => C, g: (_: A) => B) {
  return (x: A) => f(g(x));
}

export function withAppend(xs: any[], x: any): any[] {
  const len = xs.length;
  const ys = new Array(len + 1);
  let i: number;
  for (i = 0; i < len; i++) {
    ys[i] = xs[i];
  }
  ys[i] = x;
  return ys;
}

export function foldrArr<A, B>(f: (a: A, b: B) => B, init: B, xs: A[]): B {
  let acc = init;
  const len = xs.length;
  for (let i = len - 1; i >= 0; i--) {
    acc = f(xs[i], acc);
  }
  return acc;
}

export function doNothing() {}
