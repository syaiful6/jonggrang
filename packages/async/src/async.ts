import * as P from '@jonggrang/prelude';
import * as T from '@jonggrang/task';

import { newQSem, withQSem } from './qsem';
import { arrCatMaybe, arrReplicate } from './utils';


/**
 * This behave like `forInPar` but throttle the task, so it only
 * run with the provided `n` at a time.
 *
 * @param n The limit of task to run at a time.
 * @param xs An array to iterate
 * @param f function that create task from item in xs
 */
export function eachOfLim<A, B>(n: number, xs: A[], f: (_: A) => T.Task<B>): T.Task<B[]> {
  return n <= 0 ? T.raise(new Error('argument 1 passed to eachOfLim must be greater than zero'))
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

/**
 * filter a structure with effects
 */
export function wither<A, B>(xs: A[], fn: (_: A) => T.Task<P.Maybe<B>>): T.Task<B[]> {
  return T.forIn(xs, fn).map(arrCatMaybe);
}

/**
 * like `wither` but the effects run in parallel
 */
export function witherPar<A, B>(xs: A[], fn: (_: A) => T.Task<P.Maybe<B>>): T.Task<B[]> {
  return T.forInPar(xs, fn).map(arrCatMaybe);
}

/**
 * Like `witherPar`, but only allow `n` Task to run at time.
 */
export function witherLim<A, B>(n: number, xs: A[], fn: (_: A) => T.Task<P.Maybe<B>>): T.Task<B[]> {
  return n <= 0 ? T.raise(new Error('argument 1 passed to witherLim must be greater than zero'))
    : newQSem(n).chain(qsem => witherPar(xs, x => withQSem(qsem, fn(x))));
}

/**
 * Execute task `n` times and collect the result
 *
 * @param n The number of times to run the function.
 * @param t The task to execute
 * @returns Task
 */
export function replicate<A>(n: number, t: T.Task<A>): T.Task<A[]> {
  return T.sequence(arrReplicate(n, t));
}

/**
 * Execute task `n` times and collect the result
 */
export function replicatePar<A>(n: number, t: T.Task<A>): T.Task<A[]> {
  return T.sequencePar(arrReplicate(n, t));
}

/**
 * Execute task `n` times but runs a maximum of running Task at a time.
 *
 * @param n The number to execute task
 * @param limit The maximum task running at a time
 * @param t Task to execute
 */
export function replicateLim<A>(n: number, limit: number, t: T.Task<A>): T.Task<A[]> {
  return eachOfLim(limit, arrReplicate(n, t), P.identity);
}
