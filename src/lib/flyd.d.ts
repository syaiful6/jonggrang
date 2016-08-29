// A non complete flyd's type declaration, only define type that used on this project
declare module 'flyd' {

  export interface Stream<A> {
    (): A
    (a: A): void
  }

  export function stream<A>(a: A): Stream<A>
  function stream(): Stream<undefined>

  export function map<A, B>(fn: (a: A) => B, stream: Stream<A>): Stream<B>

  export function scan<A, B>(accum: (a: A, b: B) => A, acc: A, stream: Stream<B>): Stream<A>
}

declare module 'flyd/module/droprepeats' {
  import {Stream} from 'flyd';

  export function dropRepeats<A>(stream: Stream<A>): Stream<A>
  // dropRepeatsWith accept callback to determine equality, the callback signature
  // of course accept 2 arguments with same type and return boolean
  export function dropRepeatsWith<A>(fn: (a: A, b: A) => boolean, stream: Stream<A>): Stream<A>
}
