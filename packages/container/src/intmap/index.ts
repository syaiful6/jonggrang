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
 * this is hold All `IntMap` union
 */
class StdIntMap<A> {
  constructor(
    readonly tag: IntMapType, readonly key: number | undefined, readonly value: A | undefined,
    readonly prefix: I.Prefix | undefined, readonly mask: I.Mask | undefined,
    readonly left: IntMap<A> | undefined, readonly right: IntMap<A> | undefined
  ) {
  }
}

/**
 * The empty `IntMap`
 */
export const empty = new StdIntMap(
  IntMapType.NIL, undefined, undefined, undefined, undefined, undefined, undefined
) as IntMap<any>;

/**
 * create an `IntMap` of a single value.
 * @param k integer
 * @param v value to insert
 */
export function singleton<A>(k: number, v: A): IntMap<A> {
  return TipIM(k, v);
}

/**
 * build an `IntMap` from an associative array from integer keys to values
 */
export function fromAssocArray<A>(xs: Array<[number, A]>): IntMap<A> {
  return xs.reduce((m, [k, v]) => insert(k, v, m), empty);
}

/**
 * build an `IntMap` from associative array from integer keys to values
 * with splatting function.
 */
export function fromAssocArrayWith<A>(xs: Array<[number, A]>, f: (v1: A, v2: A) => A): IntMap<A> {
  return xs.reduce((m, [k, v]) => insertWith(f, k, v, m), empty as IntMap<A>);
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

/**
 * Difference between two maps (based on keys).
 */
export function difference<A, B>(t1: IntMap<A>, t2: IntMap<B>): IntMap<A> {
  return mergeWithKey(combineDiff, id, alwaysEmpty, t1, t2);
}

/**
 * Difference with a combining function.
 */
export function differenceWith<A, B>(
  combine: (a: A, b: B) => P.Maybe<A>,
  t1: IntMap<A>,
  t2: IntMap<B>
): IntMap<A> {
  return differenceWithKey((_, a, b) => combine(a, b), t1, t2);
}

/**
 * Difference with a combining function. When two equal keys
 * are encountered, the combining function is applied to the key and
 * both values. If it returns 'Nothing', the elements is discarded.
 * If it returns (`Just y`), the element is updated with a new value `y`.
 */
export function differenceWithKey<A, B>(
  f: (k: number, a: A, b: B) => P.Maybe<A>,
  t1: IntMap<A>,
  t2: IntMap<B>
): IntMap<A> {
  return mergeWithKey(f, id, alwaysEmpty, t1, t2);
}

export function unionWithKey<A>(f: (k: number, v1: A, v2: A) => A, t1: IntMap<A>, t2: IntMap<A>): IntMap<A> {
  const op = new UnionWithKeyOp(f);
  return op.run(t1, t2);
}

export function mergeWithKey<A, B, C>(
  f: (k: number, a: A, b: B) => P.Maybe<C>,
  g1: (t1: IntMap<A>) => IntMap<C>,
  g2: (t2: IntMap<B>) => IntMap<C>,
  t1: IntMap<A>,
  t2: IntMap<B>
): IntMap<C> {
  function combine(t1x: IntMap<A>, t2x: IntMap<B>): IntMap<C> {
    if (t1x.tag === IntMapType.TIP && t2x.tag === IntMapType.TIP) {
      const ma = f(t1x.key, t1x.value, t2x.value);
      if (P.isJust(ma)) return TipIM(t1x.key, ma.value);
      return empty;
    }
    return empty;
  }
  return mergeWithKey_(BinNE, combine, g1, g2, t1, t2);
}

export function mergeWithKey_<A, B, C>(
  br: (p: I.Prefix, m: I.Mask, l: IntMap<C>, r: IntMap<C>) => IntMap<C>,
  f: (t1: IntMap<A>, t2: IntMap<B>) => IntMap<C>,
  g1: (ta: IntMap<A>) => IntMap<C>,
  g2: (tb: IntMap<B>) => IntMap<C>,
  t1: IntMap<A>,
  t2: IntMap<B>
): IntMap<C> {
  const op = new MergeWithKeyOp(br, f, g1, g2);
  return op.run(t1, t2);
}

/**
 * Transform all of the values in the map, the transformation function get
 * access both key and value.
 */
export function mapWithKey<A, B>(fn: (i: number, v: A) => B, im: IntMap<A>): IntMap<B> {
  function go(t: IntMap<A>): IntMap<B> {
    switch (t.tag) {
      case IntMapType.NIL: return empty;
      case IntMapType.TIP: return TipIM(t.key, fn(t.key, t.value));
      case IntMapType.BIN: return BinIM(t.prefix, t.mask, go(t.left), go(t.right));
    }
  }
  return go(im);
}

/**
 * A version of `foldl` which provides key values during the mapping.
 */
export function foldlWithKey<A, B>(
  f: (k: number, b: B, a: A) => B,
  b: B,
  t: IntMap<A>
): B {
  function go(z: B, t2: IntMap<A>): B {
    return t2.tag === IntMapType.NIL ? z
      : t2.tag === IntMapType.TIP ? f(t2.key, z, t2.value)
        : go(go(z, t2.left), t2.right);
  }
  return go(b, t);
}

/**
 * A version of `foldr` which provides key values during the mapping.
 */
export function foldrWithKey<A, B>(
  f: (k: number, a: A, b: B) => B,
  b: B,
  t: IntMap<A>
): B {
  function go(z: B, t2: IntMap<A>): B {
    return t2.tag === IntMapType.NIL ? z
      : t2.tag === IntMapType.TIP ? f(t2.key, t2.value, z)
        : go(go(z, t2.right), t2.left);
  }
  return go(b, t);
}

/**
 * Gather all of the indicies stored in an `IntMap`
 */
export function indices(t: IntMap<any>): number[] {
  return foldrWithKey(accumulateIndices, [] as number[], t);
}

/**
 * Filter all values satisfying the predicate.
 */
export function filter<A>(p: (a: A) => boolean, t: IntMap<A>): IntMap<A> {
  return filterWithKey((_, a) => p(a), t);
}

/**
 * Filter all keys-values satysfying the predicate.
 */
export function filterWithKey<A>(p: (k: number, a: A) => boolean, t: IntMap<A>): IntMap<A> {
  return filterMapWithKey((k, a) => p(k, a) ? P.just(a) : P.nothing, t);
}

/**
 * Allow you to transform a value inside IntMap<A> or remove them with a function from
 * `A` to `Maybe<B>`. If the function return `Just<B>` the value inside just will replace
 * the existing value, it it return `Nothing` then that item will be removed.
 */
export function filterMap<A, B>(f: (a: A) => P.Maybe<B>, t: IntMap<A>): IntMap<B> {
  return filterMapWithKey((_, a) => f(a), t);
}

/**
 * like `filterMap` but the function passing here have access to the key as well
 */
export function filterMapWithKey<A, B>(p: (k: number, a: A) => P.Maybe<B>, t: IntMap<A>): IntMap<B> {
  let ret: P.Maybe<B>;
  switch (t.tag) {
    case IntMapType.BIN:
      return BinNE(t.prefix, t.mask, filterMapWithKey(p, t.left), filterMapWithKey(p, t.right));

    case IntMapType.TIP:
      ret = p(t.key, t.value);
      return P.isJust(ret) ? TipIM(t.key, ret.value) : empty;

    case IntMapType.NIL:
      return empty;
  }
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
    return BinIM(I.mask(m, k1), m, t1, t2);
  }
  return BinIM(I.mask(m, k1), m, t2, t1);
}

function BinIM<A>(prefix: I.Prefix, mask: I.Mask, left: IntMap<A>, right: IntMap<A>): IntMap<A> {
  return new StdIntMap(
    IntMapType.BIN, undefined, undefined, prefix | 0, mask | 0, left, right
  ) as IntMap<A>;
}

function TipIM<A>(key: number, value: A): IntMap<A> {
  return new StdIntMap(
    IntMapType.TIP, key | 0, value, undefined, undefined, undefined, undefined
  ) as IntMap<A>;
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

function combineDiff(): P.Nothing {
  return P.nothing;
}

function id<A>(a: A) {
  return a;
}

function alwaysEmpty(t2: IntMap<any>): IntMap<any> {
  return empty;
}

function accumulateIndices(k: number, a: any, xs: number[]): number[] {
  return [k].concat(xs);
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
          return TipIM(t1.key, splat(k, t1.value, a));
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

class UnionWithKeyOp<A> {
  constructor(private f: (k: number, v1: A, v2: A) => A) {
  }

  run(left: IntMap<A>, right: IntMap<A>): IntMap<A> {
    const { f } = this;
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
      return BinIM(left.prefix, left.mask, this.run(left.left, right.left), this.run(left.right, right.right));
    }
    if (I.maskLonger(left.mask, right.mask) && I.matchPrefix(left.prefix, left.mask, right.prefix)) {
      // the left mask is longer and the right prefix is a subsequence of the left
      // thus, the right tree is more specific and should be union with some
      // subtree of the left tree
      if (I.branchLeft(left.mask, right.prefix)) {
        return BinIM(left.prefix, left.mask, this.run(left.left, right), left.right);
      }
      return BinIM(left.prefix, left.mask, left.left, this.run(left.right, right));
    }
    if (I.maskLonger(right.mask, left.mask) && I.matchPrefix(right.prefix, right.mask, left.prefix)) {
      // opposite of last case
      if (I.branchLeft(right.mask, left.prefix)) {
        return BinIM(right.prefix, right.mask, this.run(left, right.left), right.right);
      }
      return BinIM(right.prefix, right.mask, right.left, this.run(left, right.left));
    }
    // the prefixes disagree entirely, we'll make a new branch point
    return join(left.prefix, left.mask, left, right.prefix, right.mask, right);
  }
}

class MergeWithKeyOp<A, B, C> {
  constructor(
    private br: (p: I.Prefix, m: I.Mask, l: IntMap<C>, r: IntMap<C>) => IntMap<C>,
    private f: (t1: IntMap<A>, t2: IntMap<B>) => IntMap<C>,
    private g1: (ta: IntMap<A>) => IntMap<C>,
    private g2: (tb: IntMap<B>) => IntMap<C>
  ) {
  }

  run(t1: IntMap<A>, t2: IntMap<B>): IntMap<C> {
    const { br, g1, g2 } = this;
    if (t1.tag === IntMapType.BIN && t2.tag === IntMapType.BIN) {
      if (I.maskLonger(t1.mask, t2.mask)) {
        if (!I.matchPrefix(t1.prefix, t2.prefix, t2.mask)) {
          return this.maybeLink(t1.prefix, g1(t1), t2.prefix, g2(t2));
        }
        if (I.branchLeft(t2.mask, t1.prefix)) {
          return br(t2.prefix, t2.mask, this.run(t1, t2.left), g2(t2.right));
        }
        return br(t2.prefix, t2.mask, g2(t2.left), this.run(t1, t2.right));
      }
      if (I.maskLonger(t2.mask, t2.mask)) {
        if (!I.matchPrefix(t2.prefix, t1.prefix, t1.mask)) {
          return this.maybeLink(t1.prefix, g1(t1), t2.prefix, g2(t2));
        }
        if (I.branchLeft(t1.mask, t2.prefix)) {
          return br(t1.prefix, t1.mask, this.run(t1.left, t2), g1(t1.right));
        }
        return br(t1.prefix, t1.mask, g1(t1.left), this.run(t1.right, t2));
      }
      if (t1.prefix === t2.prefix) {
        return br(t1.prefix, t2.mask, this.run(t1.left, t2.left), this.run(t1.left, t2.left));
      }
      return this.maybeLink(t1.prefix, g1(t1), t2.prefix, g2(t2));
    }
    if (t1.tag === IntMapType.BIN && t2.tag === IntMapType.TIP) {
      return this.mergeBrLf(t2, t2.key, t1);
    }
    if (t1.tag === IntMapType.BIN && t2.tag === IntMapType.NIL) {
      return g1(t1);
    }
    if (t1.tag === IntMapType.TIP) {
      return this.mergeLf(t1, t1.key, t2);
    }
    if (t1.tag === IntMapType.NIL) {
      return g2(t2);
    }
    throw new TypeError('invalid IntMap invariant detected in merge');
  }

  mergeLf(t1: IntMap<A>, k1: number, t2: IntMap<B>): IntMap<C> {
    const { br, f, g1, g2 } = this;
    switch (t2.tag) {
      case IntMapType.BIN:
        if (!I.matchPrefix(t2.prefix, t2.mask, k1)) {
          return this.maybeLink(k1, g1(t1), t2.prefix, g2(t2));
        }
        if (I.branchLeft(t2.mask, k1)) {
          return br(t2.prefix, t2.mask, this.mergeLf(t1, k1, t2.left), g2(t2.right));
        }
        return br(t2.prefix, t2.mask, g2(t2.left), this.mergeLf(t1, k1, t2.right));

      case IntMapType.TIP:
        if (t2.key === k1) {
          return f(t1, t2);
        }
        return this.maybeLink(k1, g1(t1), t2.key, g2(t2));

      case IntMapType.NIL:
        return g1(t1);

      default:
        throw new TypeError('invalid IntMap invariant detected in mergeLf');
    }
  }

  mergeBrLf(t2: IntMap<B>, k2: number, t1: IntMap<A>): IntMap<C> {
    const { br, f, g1, g2 } = this;
    if (t1.tag === IntMapType.BIN) {
      if (!I.matchPrefix(t1.prefix, t1.mask, k2)) {
        return this.maybeLink(t1.prefix, g1(t1), k2, g2(t2));
      }
      if (I.branchLeft(t1.mask, k2)) {
        return br(t1.prefix, t1.mask, this.mergeBrLf(t2, k2, t1.left), g1(t1.right));
      }
      return br(t1.prefix, t1.mask, g1(t1.left), this.mergeBrLf(t2, k2, t1.right));
    }
    if (t1.tag === IntMapType.TIP) {
      if (t1.key === k2) {
        return f(t1, t2);
      }
      return this.maybeLink(t1.key, g1(t1), k2, g2(t2));
    }
    if (t1.tag === IntMapType.NIL) {
      return g2(t2);
    }
    throw new TypeError('invalid invariant IntMap detected in mergeBrLf');
  }

  maybeLink<D>(p1: I.Prefix, t1: IntMap<D>, p2: I.Prefix, t2: IntMap<D>) {
    if (t1.tag === IntMapType.NIL) return t2;
    if (t2.tag === IntMapType.NIL) return t1;
    return link(p1, t1, p2, t2);
  }
}
