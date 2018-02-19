import * as P from '@jonggrang/prelude';

import * as I from './internal';

export const enum IntMapType {
  NIL,
  TIP,
  BIN
}

export interface Nil {
  tag: IntMapType.NIL;
}

export interface Tip<A> {
  tag: IntMapType.TIP;
  key: number;
  value: A;
}

export interface Bin<A> {
  tag: IntMapType.BIN;
  prefix: I.Prefix;
  mask: I.Mask;
  left: IntMap<A>;
  right: IntMap<A>;
}

/**
 * `IntMap a` is the type of finite maps from integers to values at type `a`.
 */
export type IntMap<A> = Nil | Tip<A> | Bin<A>;

/**
 * The empty `IntMap`
 */
export const empty: IntMap<any> = {
  tag: IntMapType.NIL
};

/**
 * create an `IntMap` of a single value.
 * @param k integer
 * @param v value to insert
 */
export function singleton<A>(k: number, v: A): IntMap<A> {
  return TipIM(k, v);
}

/**
 * build an `InMap` from an associative array from integer keys to values
 */
export function fromAssocArray<A>(xs: Array<[number, A]>): IntMap<A> {
  return xs.reduce((m, [k, v]) => insert(k, v, m), empty);
}

/**
 *
 */
export function fromAssocArrayWith<A>(xs: Array<[number, A]>, f: (v1: A, v2: A) => A): IntMap<A> {
  return xs.reduce((m, [k, v]) => insertWith(f, k, v, m), empty as IntMap<A>)
}

/**
 * Checks whether an `IntMap` contains any values at all.
 * @param t IntMap<any>
 */
export function isEmpty(t: IntMap<any>): t is Nil {
  return t.tag === IntMapType.NIL;
}

/**
 * If a value is available in an `IntMap` at a given tree then `lookup`
 * will return it. Otherwise, `Nothing`.
 */
export function lookup<A>(k: number, im: IntMap<A>): P.Maybe<A> {
  while (true) {
    if (im.tag === IntMapType.NIL) {
      return P.nothing;
    }

    if (im.tag === IntMapType.TIP) {
      if (k === im.key) {
        return P.just(im.value);
      }
      return P.nothing;
    }

    if (im.tag === IntMapType.BIN) {
      if (!I.matchPrefix(im.prefix, im.mask, k)) {
        return P.nothing;
      }
      if (I.branchLeft(im.mask, k)) {
        im = im.left;
        continue;
      }
      im = im.right;
      continue;
    }
    throw new TypeError('invalid invariant IntMap detected in lookup function');
  }
}

/**
 * Like `lookup` but returning a default value if not available in the `IntMap`
 */
export function lookupDefault<A>(k: number, d: A, im: IntMap<A>): A {
  const res = lookup(k, im);
  return P.isJust(res) ? res.value : d;
}

/**
 * Is a given key in the map?
 */
export function member(k: number, im: IntMap<any>): boolean {
  return P.isJust(lookup(k, im));
}

/**
 * Update an `IntMap` by ensuring that a given value exists at a given
 * key such that for any `IntMap` `m` and integer `k`
 */
export function insert<A>(k: number, v: A, t: IntMap<A>): IntMap<A> {
  return insertWithKey(splatInsert, k, v, t);
}

/**
 * Like `insert` but if the value already exists in the `IntMap` then it is
 * combined with the new one using a splatting function. The first argument is
 * the previous value if it exists and the second the new one.
 */
export function insertWith<A>(f: (v1: A, v2: A) => A, k: number, a: A, t: IntMap<A>): IntMap<A> {
  return insertWithKey((_, v1, v2) => f(v1, v2), k, a, t);
}

/**
 * Like `insertWith` but the splatting function also has access to the
 * map key where the conflict arose.
 */
export function insertWithKey<A>(
  splat: (k: number, v1: A, v2: A) => A,
  k: number,
  a: A,
  t: IntMap<A>
): IntMap<A> {
  const op = new InsertWithKey(splat, k, a);
  return op.run(t);
}

/**
 * Delete a key and its value from map. When the key is not
 * a member of the map, the original map is returned.
 */
export function remove<A>(k: number, t: IntMap<A>): IntMap<A> {
  const op = new RemoveOp(k);
  return op.run(t);
}

/**
 * Adjust a value at a specific key. When the key is not a member of the map, the original map is returned.
 */
export function adjust<A>(f: (v: A) => A, k: number, t: IntMap<A>): IntMap<A> {
  return adjustWithKey((_, a) => f(a), k, t);
}

/**
 * Similiar to `adjust` but the function passed here have access to `key` as it first argument
 */
export function adjustWithKey<A>(f: (k: number, v: A) => A, k: number, t: IntMap<A>): IntMap<A> {
  return updateWithKey((i, a) => P.just(f(i, a)), k, t);
}

/**
 * The expression `update(f, k, itmap)` updates the value `x` at k (if it is in the map).
 * If `f(x)` is `Nothing` the element is deleted. If it is `Just<y>`, the key `k` is bound to the new value `y`.
 */
export function update<A>(f: (v: A) => P.Maybe<A>, k: number, t: IntMap<A>): IntMap<A> {
  return updateWithKey((_, v) => f(v), k, t);
}

/**
 * the expression `updateWithKey(f, k, intmap)` update `x` at `k` if it is in the map.
 *  If `f(k, x)` return 'Nothing', the element is removed. If it is `Just<y>`, the key `k`
 * is bound to the new value `y`.
 */
export function updateWithKey<A>(f: (k: number, a: A) => P.Maybe<A>, k: number, t: IntMap<A>): IntMap<A> {
  const op = new UpdateWithKeyOp(f, k);
  return op.run(t);
}

/**
 * The expression of `alter(f, k, map)` alters the value `x` at key `k`, or absence thereof.
 * 'alter' can be used to insert, delete, or update the value under given
 * key in the 'IntMap'.
 */
export function alter<A>(f: (m: P.Maybe<A>) => P.Maybe<A>, k: number, t: IntMap<A>): IntMap<A> {
  const op = new AlterOp(f, k);
  return op.run(t);
}

export function unionWithKey<A>(f: (k: number, v1: A, v2: A) => A, t1: IntMap<A>, t2: IntMap<A>): IntMap<A> {
  function go(left: IntMap<A>, right: IntMap<A>): IntMap<A> {
    if (left.tag === IntMapType.NIL) return right;
    if (right.tag === IntMapType.NIL) return left;
    if (left.tag === IntMapType.TIP) {
      return insertWithKey(f, left.key, left.value, right);
    }
    if (right.tag === IntMapType.TIP) {
      return insertWithKey((k, a, b) => f(k, b, a), right.key, right.value, left);
    }
    if (left.mask === right.mask && left.prefix === right.prefix) {
      // the prefixes are identical, we'll union symmetrically
      return BinIM(left.prefix, left.mask, go(left.left, right.left), go(left.right, right.right))
    }
    if (I.maskLonger(left.mask, right.mask) && I.matchPrefix(left.prefix, left.mask, right.prefix)) {
      // the left mask is longer and the right prefix is a subsequence of the left
      // thus, the right tree is more specific and should be union with some
      // subtree of the left tree
      if (I.branchLeft(left.mask, right.prefix)) {
        return BinIM(left.prefix, left.mask, go(left.left, right), left.right);
      }
      return BinIM(left.prefix, left.mask, left.left, go(left.right, right));
    }
    if (I.maskLonger(right.mask, left.mask) && I.matchPrefix(right.prefix, right.mask, left.prefix)) {
      // opposite of last case
      if (I.branchLeft(right.mask, left.prefix)) {
        return BinIM(right.prefix, right.mask, go(left, right.left), right.right);
      }
      return BinIM(right.prefix, right.mask, right.left, go(left, right.left))
    }
    // the prefixes disagree entirely, we'll make a new branch point
    return join(left.prefix, left.mask, left, right.prefix, right.mask, right);
  }
  return go(t1, t2);
}

export function link<A>(k1: number, t1: IntMap<A>, k2: number, t2: IntMap<A>): IntMap<A> {
  const m = I.branchMask(k1, k2);
  const p = I.mask(m, k1);
  const lf = I.branchLeft(m, k1);
  if (lf) return BinIM(p, m, t1, t2);
  return BinIM(p, m, t2, t1);
}

export function join<A>(
  k1: number, m1: I.Mask, t1: IntMap<A>,
  k2: number, m2: I.Mask, t2: IntMap<A>
): IntMap<A> {
  const m = I.branchingBit_(k1, m1, k2, m2);
  if (I.branchLeft(m, k1)) {
    return BinIM(I.mask(m, k1), m, t1, t2)
  }
  return BinIM(I.mask(m, k1), m, t2, t1);
}

function BinIM<A>(prefix: I.Prefix, mask: I.Mask, left: IntMap<A>, right: IntMap<A>): IntMap<A> {
  return { left, right, tag: IntMapType.BIN, prefix: prefix | 0, mask: mask | 0 };
}

function TipIM<A>(key: number, value: A): IntMap<A> {
  return { value, key: key | 0, tag: IntMapType.TIP }
}

function BinNE<A>(p: I.Prefix, m: I.Mask, t1: IntMap<A>, t2: IntMap<A>): IntMap<A> {
  if (t1.tag === IntMapType.NIL && t2.tag === IntMapType.NIL) {
    return empty;
  }
  if (t1.tag === IntMapType.NIL) {
    return t2;
  }
  if (t2.tag === IntMapType.NIL) {
    return t1;
  }
  return BinIM(p, m, t1, t2);
}

function splatInsert<A>(_: any, _v: any, v2: A): A {
  return v2;
}

class InsertWithKey<A> {
  constructor(
    private splat: (k: number, v1: A, v2: A) => A,
    private k: number,
    private a: A
  ) {
  }

  run(t1: IntMap<A>): IntMap<A> {
    const { splat, k, a } = this;
    switch (t1.tag) {
      case IntMapType.NIL:
        return TipIM(k, a);

      case IntMapType.TIP:
        if (k === t1.key) {
          return TipIM(t1.key, splat(k, t1.value, a))
        }
        return join(k, 0, TipIM(k, a), t1.key, 0, t1);

      case IntMapType.BIN:
        if (I.matchPrefix(t1.prefix, t1.mask, k)) {
          if (I.branchLeft(t1.mask, k)) {
            return BinIM(t1.prefix, t1.mask, this.run(t1.left), t1.right);
          }
          return BinIM(t1.prefix, t1.mask, t1.left, this.run(t1.right));
        }
        return join(k, 0, TipIM(k, a), t1.prefix, t1.mask, t1);

      default:
        throw new TypeError('invalid invariant IntMap detected in insertWithKey');
    }
  }
}

class RemoveOp {
  constructor(private k: number) {
  }

  run<A>(t1: IntMap<A>): IntMap<A> {
    const { k } = this;
    switch (t1.tag) {
      case IntMapType.NIL:
        return empty;

      case IntMapType.TIP:
        if (k === t1.key) return empty;
        return t1;

      case IntMapType.BIN:
        if (!I.matchPrefix(t1.prefix, t1.mask, k)) {
          return t1;
        }
        if (I.branchLeft(t1.mask, k)) {
          return BinNE(t1.prefix, t1.mask, this.run(t1.left), t1.right);
        }
        return BinNE(t1.prefix, t1.mask, t1.left, this.run(t1.right));

      default:
        throw new TypeError('invalid invariant IntMap detected in remove');
    }
  }
}

class UpdateWithKeyOp<A> {
  constructor(private f: (k: number, a: A) => P.Maybe<A>, private k: number) {
  }

  run(t1: IntMap<A>): IntMap<A> {
    let ret: P.Maybe<A>;
    const { f, k } = this;
    switch (t1.tag) {
      case IntMapType.NIL:
        return empty;

      case IntMapType.TIP:
        if (k === t1.key) {
          ret = f(k, t1.value);
          if (P.isJust(ret)) {
            return TipIM(t1.key, ret.value);
          }
          return empty;
        }
        return t1;

      case IntMapType.BIN:
        if (!I.matchPrefix(t1.prefix, t1.mask, k)) {
          return t1;
        }
        if (I.branchLeft(t1.mask, k)) {
          return BinNE(t1.prefix, t1.mask, this.run(t1.left), t1.right);
        }
        return BinNE(t1.prefix, t1.mask, t1.left, this.run(t1.right));

      default:
        throw new TypeError('Invalid invariant intmap detected in updateWithKey');
    }
  }
}

class AlterOp<A> {
  constructor(private f: (m: P.Maybe<A>) => P.Maybe<A>, private k: number) {
  }

  run(t1: IntMap<A>): IntMap<A> {
    const { f, k } = this;
    let ma: P.Maybe<A>;
    switch (t1.tag) {
      case IntMapType.BIN:
        if (!I.matchPrefix(t1.prefix, t1.mask, k)) {
          ma = f(P.nothing);
          if (P.isJust(ma)) return link(k, TipIM(k, ma.value), t1.prefix, t1);
          return t1;
        }
        if (I.branchLeft(t1.mask, k)) {
          return BinNE(t1.prefix, t1.mask, this.run(t1.left), t1.right);
        }
        return BinNE(t1.prefix, t1.mask, t1.left, this.run(t1.right));

      case IntMapType.TIP:
        if (k === t1.key) {
          ma = f(P.just(t1.value));
          if (P.isJust(ma)) {
            return TipIM(t1.key, ma.value);
          }
          return empty;
        }
        ma = f(P.nothing);
        if (P.isJust(ma)) {
          return link(k, TipIM(k, ma.value), t1.key, t1);
        }
        return TipIM(t1.key, t1.value);

      case IntMapType.NIL:
        ma = f(P.nothing);
        if (P.isJust(ma)) {
          return TipIM(k, ma.value);
        }
        return empty;

      default:
        throw new TypeError('Invalid IntMap invariant detected in alter function');
    }
  }
}
