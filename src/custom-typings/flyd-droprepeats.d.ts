import { Stream } from 'flyd'

export function dropRepeats<A>(stream: Stream<A>): Stream<A>
export function dropRepeatsWith<A>(fn: (a: A, b: A) => boolean, stream: Stream<A>): Stream<A>
