export function arrReplicate<A>(n: number, a: A): A[] {
  let result = new Array(n);
  for (let i = 0; i < n; i++) {
    result[i] = a;
  }
  return result;
}

/**
 * Returns the keys of an object.
 */
export function keys<A>(v: A): Array<keyof A> {
  return Object.keys(v) as Array<keyof A>;
}

/**
 * Insert or replace a key/value pair in a map
 */
export function insert<V>(k: string, v: V, m: Readonly<Record<string, V>>): Readonly<Record<string, V>> {
  let rec = thawStrMap(m);
  rec[k] = v;
  return rec;
}

function thawStrMap<K extends string, V>(
  m: Readonly<Record<K, V>>
): Record<K, V> {
  let rec = {} as any;
  for (let key in m) {
    if (Object.prototype.hasOwnProperty.call(m, key)) {
      rec[key] = m[key];
    }
  }
  return rec;
}
