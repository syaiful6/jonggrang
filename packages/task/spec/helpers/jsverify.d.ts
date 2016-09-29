interface Either<A,B> {
  either<T>(l: (a: A) => T, r: (b: B) => T): T;
  isEqual(other: Either<A,B>): boolean;
  bimap<C,D>(f: (a: A) => C, g: (b: B) => D): Either<C,D>;
  first<C>(f: (a: A) => C): Either<C,B>;
  second<D>(g: (b: B) => D): Either<A,D>;
}

export var veither: {
  left<A>(value: A): Either<A,any>;
  right<B>(value: B): Either<any,B>;
}

// Random

export var random: {
  (min: number, max: number): number;
  integer(min: number, max: number): number;
  number(min: number, max: number): number;
}

// Generator

interface Generator<T> {
  (size: number): T;
  map<U>(f: (x: T) => U): Generator<U>;
  flatmap<U>(f: (x: T) => Generator<U>): Generator<U>;
}

export var generator: {
  bless<T>(f: (n: number) => T): Generator<T>;
  constant<T>(x: T): Generator<T>;
  combine<T,U>(a: Generator<T>, f: (x: T) => U): Generator<U>;
  oneof<T>(gens: Generator<T>[]): Generator<T>;
  recursive<T>(genZ: Generator<T>, genS: (gen: Generator<T>) => Generator<T>): Generator<T>;
  pair<A,B>(genA: Generator<A>, genB: Generator<B>): Generator<[A,B]>;
  either<A,B>(genA: Generator<A>, genB: Generator<B>): Generator<Either<A,B>>;
  unit: Generator<any>;
  tuple<A,B,C,D,E>(gens: [Generator<A>, Generator<B>, Generator<C>, Generator<D>, Generator<E>]): Generator<[A,B,C,D,E]>;
  sum<A,B,C,D,E>(gens: [Generator<A>, Generator<B>, Generator<C>, Generator<D>, Generator<E>]): Generator<A|B|C|D|E>;
  array<T>(gen: Generator<T>): Generator<T[]>;
  nearray<T>(gen: Generator<T>): Generator<T[]>;
  dict<T>(gen: Generator<T>): Generator<{[k: string]: T}>;
  small<T>(gen: Generator<T>): Generator<T>;
}

// Show

interface Show<T> {
  (x: T): string;
}

// Shrink

interface Shrink<T> {
  (x: T): T[];
  smap<U>(f: (x: T) => U, g: (x: U) => T): Shrink<U>;
}

export var shrink: {
  bless<T>(f: (x: T) => T[]): Shrink<T>;
  noop: Shrink<any>;
  pair<A,B>(a: Shrink<A>, b: Shrink<B>): Shrink<[A,B]>;
  either<A,B>(a: Shrink<A>, b: Shrink<B>): Shrink<Either<A,B>>;
  tuple<A,B,C,D,E>(ss: [Shrink<A>, Shrink<B>, Shrink<C>, Shrink<D>, Shrink<E>]): Shrink<[A,B,C,D,E]>;
  sum<A,B,C,D,E>(ss: [Shrink<A>, Shrink<B>, Shrink<C>, Shrink<D>, Shrink<E>]): Shrink<A|B|C|D|E>;
  array<T>(s: Shrink<T>): Shrink<T[]>;
  nearray<T>(s: Shrink<T>): Shrink<T[]>;
}

// Arbitrary

interface Arbitrary<T> {
  generator: Generator<T>;
  shrink: Shrink<T>;
  show: Show<T>;
  smap<U>(f: (x: T) => U, g: (x: U) => T, newShow?: Show<U>): Arbitrary<U>;
}

// Functions

export function fn<T>(arb: Arbitrary<T>): Arbitrary<() => T>;
export function fun<T>(arb: Arbitrary<T>): Arbitrary<() => T>;

// Conditional

export function suchthat<T>(
  arb: Arbitrary<T>,
  pred: (x: T) => boolean
): Arbitrary<T>;

// Properties

type Property<T> = {
  (size: number): CheckResult<T>;
}

type CheckOptions = {
  size?: number,
  tests?: number,
  quiet?: boolean,
  rngState?: string
}

type CheckResult<T> = true | {
  counterexample: T,
  counterexamplestr: string,
  tests: number,
  shrinks: number,
  exc?: Error,
  rngState: string
}

// TODO forall has a vararg signature, but representing such a
// type in Flow is difficult. Pass a single tuple instead.
export function forall<T>(
  arb: Arbitrary<T>,
  f: (x: T) => boolean
): Property<T>;

export function check<T>(prop: Property<T>, opts?: CheckOptions): CheckResult<T>;

export function assert<T>(prop: Property<T>, opts?: CheckOptions): void;

export function property<T>(def: string, gen: string, f: (x: T) => boolean | PromiseLike<any>): Property<T>
export function property<T1, T2>(def: string, gen1: string, gen2: string, f: (x: T1, y: T2) => boolean | PromiseLike<any>): Property<T1 | T2>
export function property<T1, T2, T3>(
  def: string,
  gen1: string,
  gen2: string,
  gen3: string,
  f: (x: T1, y: T2, z: T3) => boolean | PromiseLike<any>
): Property<T1 | T2>
export function property<T1, T2, T3, T4>(
  def: string,
  gen1: string,
  gen2: string,
  gen3: string,
  gen4: string,
  f: (x: T1, y: T2, z: T3, r: T4) => boolean | PromiseLike<any>
): Property<T1 | T2>