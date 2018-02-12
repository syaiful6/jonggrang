import * as SM from '@jonggrang/object';

export function smInsertTuple<K extends string, A>(pair: [K, A], sm: SM.StrMap<K, A>): SM.StrMap<K, A> {
  return SM.insert(pair[0], pair[1], sm);
}

export function identity<A>(a: A): A {
  return a;
}
