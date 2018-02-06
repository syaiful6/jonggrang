/**
 * This like Object.assign. Copy the values of all of the enumerable own properties from one
 * or more source objects to a target object. Returns the target object.
 * @param target
 * @param source1
 */
export function assign<T, S1>(t: T, s: S1): T & S1;
export function assign<T, S1, S2>(t: T, s1: S1, s2: S2): T & S1 & S2;
export function assign<T, S1, S2, S3>(t: T, s1: S1, s2: S2, s3: S3): T & S1 & S2 & S3;
export function assign<T, S1, S2, S3, S4>(t: T, s1: S1, s2: S2, s3: S3, s4: S4): T & S1 & S2 & S3 & S4;
export function assign<T>(target: T, ...sources: any[]): any {
  if (!target) {
    throw new Error("assign's target must be an object")
  }
  for (let source of sources) {
    if (source) {
      for (let key of Object.keys(source)) {
        (target as any)[key] = (source as any)[key];
      }
    }
  }
  return target;
}

/**
 * Sets the property on an object.
 */
export function set<K extends string, V, O extends { readonly [P in K]: V}>(k: K, v: V, m: O): O {
  let cl = assign({}, m);
  (cl as any)[k] = v;
  return cl;
}

/**
 * Returns a new map with all the key-value pairs in map where the key is in keys.
 */
export function take<T, K extends keyof T>(m: T, ks: K[]): Pick<T, K> {
  let ret: any = {};
  for (let i = 0, len = ks.length; i < len; i++) {
    ret[ks[i]] = m[ks[i]];
  }
  return ret;
}

export function mergeWith<M1, K1 extends keyof M1, M2, K2 extends keyof M2>(
  m1: M1,
  m2: M2,
  fn: (k: K1 | K2, v1: M1[K1], v2: M2[K2]) => M1[K1] | M2[K2]
): M1 & M2 {
  let result: any = assign({}, m1);
  for (let key in m2) {
    if (Object.prototype.hasOwnProperty.call(m2, key)) {
      if (key in result) {
        result[key] = fn(key as any, (m1 as any)[key], (m2 as any)[key]);
      } else {
        result[key] = m2[key];
      }
    }
  }
  return result;
}

/**
 * Returns the keys of an object.zz
 */
export function keys<A>(v: A): Array<keyof A> {
  return Object.keys(v) as Array<keyof A>;
}
