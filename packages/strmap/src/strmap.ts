import * as P from '@jonggrang/prelude';

export type StrMap<K extends string, V> = Readonly<Record<K, V>>;

/**
 * return true if StrMap
 */
export function isEmpty<K extends string, V>(obj: StrMap<K, V>): boolean {
  for (let key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      return false;
    }
  }
  return true;
}

/**
 * Create a map with one key/value pair
 */
export function singleton<K extends string, V>(k: K, v: V): StrMap<K, V> {
  let obj: any = {};
  obj[k] = v;
  return obj;
}

/**
 * Build `StrMap<K, V>` from an array of key-value pairs.
 * @param xs Array of key-value pairs
 */
export function fromPairs<K extends string, V>(xs: Array<[K, V]>): StrMap<K, V> {
  let obj: any = {};
  for (let i = 0, len = xs.length; i < len; i++) {
    obj[xs[i][0]] = xs[i][1];
  }
  return obj;
}

/**
 * Lookup the value for a key in a map
 * @param k key
 * @param m StrMap
 */
export function lookup<K extends string, V>(k: K, m: StrMap<K, V>): P.Maybe<V> {
  return _lookup(P.nothing, P.just, k, m) as P.Maybe<V>;
}

/**
 * Test whether a `String` appears as a key in a map
 */
export function member<K extends string, V>(k: K, m: StrMap<K, V>): boolean {
  return k in m ? true : false;
}

/**
 * Insert or replace a key/value pair in a map
 */
export function insert<K extends string, V>(k: K, v: V, m: StrMap<K, V>): StrMap<K, V> {
  let rec = thawStrMap(m);
  rec[k] = v;
  return rec;
}

/**
 * Delete a key and value from a map
 */
export function remove<K extends string, V>(k: K, m: StrMap<K, V>): StrMap<K, V> {
  let rec = thawStrMap(m);
  delete rec[k];
  return rec;
}

/**
 * Delete a key and value from a map, returning the value
 * as well as the subsequent map
 */
export function pop<K extends string, V>(k: K, m: StrMap<K, V>): P.Maybe<[V, StrMap<K, V>]> {
  return P.mapMaybe(lookup(k, m), v => [v, remove(k, m)] as [V, StrMap<K, V>]);
}

/**
 * Insert, remove or update a value for a key in a map
 */
export function alter<K extends string, V>(
  f: (m: P.Maybe<V>) => P.Maybe<V>,
  k: K,
  m: StrMap<K, V>
): StrMap<K, V> {
  let s = f(lookup(k, m));
  return s.tag === P.MaybeType.NOTHING ? remove(k, m) : insert(k, s.value, m);
}

/**
 * Remove or update a value for a key in a map
 */
export function update<K extends string, V>(
  f: (a: V) => P.Maybe<V>,
  k: K,
  m: StrMap<K, V>
): StrMap<K, V> {
  return alter(mb => P.maybe(P.nothing, f, mb), k, m);
}

/**
 *
 */
export function union<K extends string, V>(
  m1: StrMap<K, V>,
  m2: StrMap<K, V>
): StrMap<K, V> {
  let result: any = {};
  function assign(this: StrMap<K, V>, k: K) {
    result[k] = this[k];
  }
  forEachKey(m2, assign);
  forEachKey(m1, assign);
  return result;
}

function _lookup<K extends string, A, Z>(no: Z, yes: (_: A) => Z, k: K, m: StrMap<K, A>): Z {
  return k in m ? yes(m[k]) : no;
}

/**
 * Test whether all key/value pairs in a `StrMap` satisfy a predicate.
 * @param f
 * @param m
 */
export function all<K extends string, V>(
  f: (k: K, v: V) => boolean,
  m: StrMap<K, V>
): boolean {
  for (let k in m) {
    if (Object.prototype.hasOwnProperty.call(m, k) && !f(k, m[k])) {
      return false;
    }
  }
  return true;
}

function thawStrMap<K extends string, V>(
  m: StrMap<K, V>
): Record<K, V> {
  let rec = {} as Record<K, V>;
  for (let key in m) {
    if (Object.prototype.hasOwnProperty.call(m, key)) {
      rec[key] = m[key];
    }
  }
  return rec;
}

function forEachKey<K extends string>(s: StrMap<K, any>, f: (this: StrMap<K, any>, k: K) => void) {
  Object.keys(s).forEach(f, s);
}
