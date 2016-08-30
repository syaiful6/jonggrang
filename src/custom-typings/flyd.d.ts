export interface Stream<A> {
  (a: A): void // setter
  (): A // getter
  hasVal: boolean //flag
  end: Stream<boolean> // end stream
  val: A // value
}

export function stream<A>(a: A): Stream<A>
export function stream<A>(): Stream<A>
export function map<A, B>(fn: (a: A) => B, stream: Stream<A>): Stream<B>
export function on<A>(fn: (a: A) => any, stream: Stream<A>): Stream<undefined>
export function scan<A, B>(accum: (a: A, b: B) => A, acc: A, stream: Stream<B>): Stream<A>
export function merge<A, B>(a: Stream<A>, b: Stream<B>): Stream<A | B>
// this is the best type i can give for combine function, if it Array<Stream<U>> then expect it to be
// the changed streams (it, on the last arguments), Stream<T> is self stream
// and stream<U> is dependent streams.
export function combine<U, T>(combinator: (...args: Array<Stream<U | T> | Array<Stream<U>>>) => T, deps: Array<Stream<U>>): Stream<T>
export function isStream(a: any): boolean
export function immediate<T>(s: Stream<T>): Stream<T>
export function endsOn<A, B>(end: Stream<A>, s: Stream<B>): Stream<B>
