import * as P from '@jonggrang/prelude';
import * as T from '@jonggrang/task';

import { newQSem, withQSem } from './qsem';


/**
 * This behave like `forInPar` but throttle the task, so it only
 * run with the provided `n` aat a time.
 *
 * @param n The limit of task to run at a time.
 * @param xs An array to iterate
 * @param f function that create task from item in xs
 */
export function eachOfLim<A, B>(n: number, xs: A[], f: (_: A) => T.Task<B>): T.Task<B[]> {
  return n <= 0 ? T.raise(new Error(`argument 1 passed to eachOfLim must be greater than zero`))
    : newQSem(n).chain(qsem => T.forInPar(xs, x => withQSem(qsem, f(x))));
}

/**
 * Compete 2 task and get the fastest one.
 */
export function compete<A, B>(a: T.Task<A>, b: T.Task<B>): T.Task<P.Either<A, B>> {
  return T.sequential(
    (a.map(P.left).parallel() as T.Parallel<P.Either<A, B>>).alt(b.map(P.right).parallel())
  );
}
