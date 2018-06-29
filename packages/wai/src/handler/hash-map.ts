import { intmap as I } from '@jonggrang/container';
import * as M from '@jonggrang/object';
import { Maybe, isNothing } from '@jonggrang/prelude';

export type HashMap<A> = I.IntMap<Record<string, A>>;

export const empty = I.empty;

export const isEmpty = I.isEmpty;

export function insert<A>(h: number, k: string, v: A, m: HashMap<A>): HashMap<A> {
  return I.insertWith(M.union as any, h, M.singleton(k, v), m);
}

export function lookup<A>(h: number, k: string, hm: HashMap<A>): Maybe<A> {
  const ret = I.lookup(h, hm);
  return isNothing(ret) ? ret : M.lookup(k, ret.value);
}
