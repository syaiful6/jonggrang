/**
 * Fantasy Land Ord
 */
export interface Ord<A> {
  compare(a: A): Ordering;
}

/**
 * Result of comparing two Ord. 1 if greater, 0 if equal and
 * -1 if less
 */
export type Ordering = 1 | 0 | -1;

/**
 * Compare two Ord, and return Ordering.
 * @param a Ord<A>
 * @param b Ord<A>
 */
export function compare<A extends Ord<A>>(a: A, b: A): Ordering {
  return a.compare(b);
}

export function lt<A extends Ord<A>>(a: A, b: A): boolean {
  return compare(a, b) === -1;
}

export function lte<A extends Ord<A>>(a: A, b: A): boolean {
  return compare(a, b) <= 0;
}

export function gt<A extends Ord<A>>(a: A, b: A): boolean {
  return compare(a, b) === 1;
}

export function gte<A extends Ord<A>>(a: A, b: A): boolean {
  return compare(a, b) >= 0;
}

export function min<A extends Ord<A>>(a: A, b: A): A {
  switch (compare(a, b)) {
    case 0:
    case -1:
      return a;
    case 1:
      return b;
  }
}

export function max<A extends Ord<A>>(a: A, b: A): A {
  switch (compare(a, b)) {
    case -1:
      return b;
    case 0:
    case 1:
      return a;
  }
}
