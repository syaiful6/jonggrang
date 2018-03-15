export interface Setoid<A> {
  equals(a: A): boolean;
}

export function eq<A extends Setoid<A>>(a: A, b: A): boolean {
  return a.equals(b);
}

export function deepEq(a: any, b: any): boolean {
  if (a === b) return true;
  let isArrA = Array.isArray(a);
  let isArrB = Array.isArray(b);
  if (isArrA && isArrB) {
    if (a.length !== b.length) return false;
    for (let i = 0, len = a.length; i < len; i++) {
      if (!deepEq(a[i], b[i])) return false;
    }
    return true;
  }

  if (isArrA != isArrB) return false;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) return false;

    let dateA = a instanceof Date;
    let dateB = b instanceof Date;
    if (dateA && dateB) return a.getTime() == b.getTime();
    if (dateA != dateB) return false;

    let regexpA = a instanceof RegExp;
    let regexpB = b instanceof RegExp;
    if (regexpA && regexpB) return a.toString() == b.toString();
    if (regexpA != regexpB) return false;

    for (let i = 0, len = keys.length; i < len; i++) {
      if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;
    }

    for (let i = 0, len = keys.length; i < len; i++) {
      if (!deepEq(a[keys[i]], b[keys[i]])) return false;
    }

    return true;
  }

  return false;
}
