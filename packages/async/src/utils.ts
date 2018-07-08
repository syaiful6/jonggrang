import { Maybe, isJust, identity } from '@jonggrang/prelude';

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

export function arrReplicate<A>(n: number, a: A): A[] {
  let result = new Array(n);
  for (let i = 0; i < n; i++) {
    result[i] = a;
  }
  return result;
}
