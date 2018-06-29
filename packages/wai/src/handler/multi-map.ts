import { intmap as I } from '@jonggrang/container';
import { Maybe, chainMaybe, just, nothing, isNothing, list as L } from '@jonggrang/prelude';
import * as T from '@jonggrang/task';

export type MMap<A> = I.IntMap<L.List<A>>;

export const isEmpty = I.isEmpty;

export const empty = I.empty;

export function singleton<A>(k: number, v: A): MMap<A> {
  return I.singleton(k, L.singleton(v));
}

export function search<A>(k: number, m: MMap<A>): Maybe<A> {
  return chainMaybe(I.lookup(k, m), L.head);
}

export function searchWith<A>(k: number, f: (_: A) => boolean, m: MMap<A>): Maybe<A> {
  const ret = I.lookup(k, m);
  return isNothing(ret) ? ret : L.find(f, ret.value);
}

export function insert<A>(k: number, v: A, m: MMap<A>): MMap<A> {
  return I.insertWith(L.append, k, L.singleton(v), m);
}

export function toList<A>(m: MMap<A>): L.List<A> {
  return L.concat(I.foldrWithKey((_, v, xs) => L.cons(v, xs), L.nil, m));
}

export function pruneWith<A>(m: MMap<A>, f: (_: A) => T.Task<boolean>): T.Task<MMap<A>> {
  function go(xs: L.List<[number, L.List<A>]>, acc: L.List<[number, L.List<A>]>): T.Task<L.List<[number, L.List<A>]>> {
    if (L.isEmpty(xs)) return T.pure(acc);
    const [k, s] = xs.head;
    return prune(s, f).chain(mt =>
      isNothing(mt)   ? go(xs.tail, acc)
      /* otherwise */ : go(xs.tail, L.cons([k, mt.value] as [number, L.List<A>], acc)));
  }
  return go(toDescList(m), L.nil).map(fromAssocList);
}

function fromAssocList<A>(xs: L.List<[number, A]>): I.IntMap<A> {
  const t = L.foldl((m, [k, v]) => I.insert(k, v, m), I.empty, xs);
  return t;
}

function toDescList<A>(m: I.IntMap<A>): L.List<[number, A]> {
  return I.foldlWithKey((k, xs, v) => L.cons([k, v], xs), L.nil, m);
}

function prune<A>(xs: L.List<A>, f: (_: A) => T.Task<boolean>): T.Task<Maybe<L.List<A>>> {
  function go(xs: L.List<A>): T.Task<L.List<A>> {
    return L.isEmpty(xs) ? T.pure(xs)
      : f(xs.head).chain(keep => go(xs.tail).map(rs => keep ? L.cons(xs.head, rs) : rs));
  }
  return go(xs).map(nel);
}

export function merge<A>(m1: MMap<A>, m2: MMap<A>): MMap<A> {
  return I.unionWithKey((_, a, b) => L.append(a, b), m1, m2);
}

function nel<A>(xs: L.List<A>): Maybe<L.List<A>> {
  return L.isEmpty(xs) ? nothing : just(xs);
}
