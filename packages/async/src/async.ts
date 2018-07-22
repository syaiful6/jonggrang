import * as P from '@jonggrang/prelude';
import * as T from '@jonggrang/task';
import { insert, keys } from '@jonggrang/object';


import { newQSem, withQSem } from './qsem';
import { arrReplicate } from './utils';


/**
 * This behave like `forInPar` but throttle the task, so it only
 * run with the provided `n` at a time.
 *
 * @param n The limit of task to run at a time.
 * @param xs An array to iterate
 * @param f function that create task from item in xs
 */
export function eachOfLim<A, B>(n: number, xs: A[], f: (_: A, i: number) => T.Task<B>): T.Task<B[]> {
  return n <= 0 ? T.raise(new Error('argument 1 passed to eachOfLim must be greater than zero'))
    : newQSem(n).chain(qsem => T.forInPar(xs, (x, i) => withQSem(qsem, f(x, i))));
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
export function wither<A, B>(xs: A[], fn: (_: A, i: number) => T.Task<P.Maybe<B>>): T.Task<B[]> {
  return T.forIn(xs, fn).map(P.catMaybes);
}

/**
 * like `wither` but the effects run in parallel
 */
export function witherPar<A, B>(xs: A[], fn: (_: A, i: number) => T.Task<P.Maybe<B>>): T.Task<B[]> {
  return T.forInPar(xs, fn).map(P.catMaybes);
}

/**
 * Like `witherPar`, but only allow `n` Task to run at time.
 */
export function witherLim<A, B>(n: number, xs: A[], fn: (_: A, i: number) => T.Task<P.Maybe<B>>): T.Task<B[]> {
  return n <= 0 ? T.raise(new Error('argument 1 passed to witherLim must be greater than zero'))
    : newQSem(n).chain(qsem => witherPar(xs, (x, i) => withQSem(qsem, fn(x, i))));
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

/**
 * This like `forIn` but for object
 *
 * @param m object
 * @param fn function to be called on each entries
 * @returns Task
 */
export function eachObj<A, B>(
  m: Record<string, A>,
  fn: (v: A, k: string) => T.Task<B>
): T.Task<Record<string, B>> {
  return keys(m).reduce((acc, k) => {
    function set(o: Record<string, B>) {
      return (v: B) => insert(k, v, o);
    }
    return acc.map(set).ap(fn(m[k], k));
  }, T.pure({} as Record<string, B>));
}

/**
 * like `eachObj` but the `function` executed in parallel
 */
export function eachObjPar<A, B>(
  m: Record<string, A>,
  fn: (v: A, k: string) => T.Task<B>
): T.Task<Record<string, B>> {
  return T.sequential(keys(m).reduce((acc, k) => {
    function set(o: Record<string, B>) {
      return (v: B) => insert(k, v, o);
    }
    return acc.map(set).ap(fn(m[k], k).parallel());
  }, T.Parallel.of({} as Record<string, B>)));
}

/**
 *
 */
export function eachObjLim<A, B>(
  n: number,
  ms: Record<string, A>,
  fn: (a: A, i: string) => T.Task<B>
): T.Task<Record<string, B>> {
  return n <= 0 ? T.raise(new Error('1 arguments to eachObjLim must be greater than zero'))
    : newQSem(n).chain(qsem => eachObjPar(ms, (v, i) => withQSem(qsem, fn(v, i))));
}

/**
 * Sequence object
 */
export function sequenceObj<A>(ms: Record<string, T.Task<A>>): T.Task<Record<string, A>> {
  return eachObj(ms, P.identity);
}
