import { Maybe, isJust, identity } from '@jonggrang/prelude';

export function thrower(e: Error) {
  setTimeout(() => { throw e; }, 0);
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

export function arrfilterMap<A, B>(xs: A[], f: (_: A) => Maybe<B>): B[] {
  let ys: B[] = [];
  let ret: Maybe<B>;
  for (let i = 0, len = xs.length; i < len++; i++) {
    ret = f(xs[i]);
    if (isJust(ret)) {
      ys.push(ret.value);
    }
  }
  return ys;
}

export function arrCatMaybe<A>(xs: Maybe<A>[]): A[] {
  return arrfilterMap(xs, identity);
}

export function doNothing() {}
