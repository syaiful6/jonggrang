import { EvQueue, Loop, stepper } from './event-queue';
import * as E from '@jonggrang/prelude';
import * as T from '@jonggrang/task';

export function merge<F, G, I>(
  lhs: EvQueue<F, I>,
  rhs: EvQueue<G, I>
): EvQueue<E.Either<F, G>, I> {
  return function interpret(queue) {
    function tick(ls: Loop<F>, rs: Loop<G>): Loop<E.Either<F, G>> {
      return { loop: update(ls, rs), tick: commit(ls, rs) };
    }

    function update(ls: Loop<F>, rs: Loop<G>) {
      return function (e: E.Either<F, G>): T.Task<Loop<E.Either<F, G>>> {
        return E.either(
          (fi: F) => ls.loop(fi).map(v => tick(v, rs)),
          (gi: G) => rs.loop(gi).map(v => tick(ls, v)),
          e
        );
      };
    }

    function commit(ls: Loop<F>, rs: Loop<G>): () => T.Task<Loop<E.Either<F, G>>> {
      return () =>
        ls.tick()
          .chain(a =>
            rs.tick().map(b => tick(a, b)));
    }

    return lhs(queue)
      .chain(a =>
        rhs(queue).map(b => tick(a, b))
      );
  };
}

export function never<A>(): EvQueue<never, A> {
  return stepper(i => T.raise(new Error('never interpreter received input')));
}

export function liftNat<F, I>(int: (_: F) => T.Task<I>): EvQueue<F, I> {
  return stepper(int);
}
