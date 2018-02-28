import { Either, left, right, isRight } from '@jonggrang/prelude';

import {
  Canceler, Fn1, NodeCallback, Computation, Fiber, Supervisor, nonCanceler,
  AsyncTask, SyncTask, Task, ForkTask, BracketTask, GeneralBracket, Parallel
} from './internal/types';
import { TaskFiber } from './internal/interpreter';
import { SimpleSupervisor } from './internal/scheduler';
import { id, withAppend } from './internal/utils';


// re-export
export {
  nonCanceler, Canceler, Fiber, Task, Parallel, Supervisor,
  Computation, NodeCallback
} from './internal/types';
export { scheduler } from './internal/scheduler';


/**
 * Invokes pending cancelers in a fiber and runs cleanup effects. Blocks
 * until the fiber has fully exited.
 * @param e
 * @param fiber
 */
export function killFiber<A>(e: Error, fiber: Fiber<A>): Task<void> {
  if (fiber.isSuspended()) {
    return liftEff(() => fiber.kill(e, doNothing) as any);
  } else {
    return makeTask(k => thunkCanceller(fiber.kill(e, k)));
  }
}

/**
 * Blocks until the fiber completes, yielding the result. If the fiber
 * throws an exception, it is rethrown in the current fiber.
 * @param fiber
 */
export function joinFiber<A>(fiber: Fiber<A>): Task<A> {
  return makeTask(k => thunkCanceller(fiber.join(k)));
}

/**
 * Kill all pending Fiber
 */
export function killAll(err: Error, sup: Supervisor): Task<void> {
  return makeTask(cb => sup.killAll(err, cb));
}

/**
 * Smart constructor for creating Task, it take a function that accept a Node.js callback
 * and return a `canceler`, or an object with shape look like Computation interface.
 */
export function makeTask<A>(f: Fn1<NodeCallback<A, void>, Canceler> | Computation<A>): Task<A> {
  return new AsyncTask(f);
}

/**
 * create supervisor
 */
export function makeSupervisor(): Supervisor {
  return new SimpleSupervisor();
}

/**
 * Tracks a Fiber using provided supervisor
 */
export function forkWith<A>(sup: Supervisor, t: Task<A>): Task<Fiber<A>> {
  return new ForkTask(true, t, sup);
}

/**
 * fork a task from within a parent `Task` context, returning `Fiber`
 * @param t Task<A>
 * @return Task<Fiber<A>
 */
export function forkTask<A>(t: Task<A>): Task<Fiber<A>> {
  return new ForkTask(true, t);
}

/**
 * Suspends a `Task` from within a the provided supervisor, returning the `Fiber`.
 * A suspended `Task` is not executed until a consumer observes the result
 * with `joinFiber`.
 * @param t
 */
export function suspendTaskWith<A>(sup: Supervisor, t: Task<A>): Task<Fiber<A>> {
  return new ForkTask(false, t, sup);
}

/**
 * Suspends a `Task` from within a parent context.
 * @param t
 */
export function suspendTask<A>(t: Task<A>): Task<Fiber<A>> {
  return new ForkTask(false, t, undefined);
}

/**
 * An async computation which does not resolve.
 */
export const never: Task<any> = makeTask(_ => nonCanceler);

/**
 * Forks a `Task`, returning `Fiber`. This is an effectful function.
 * The task passed here will run after calling this function.
 * @param t Task
 */
export function launchTask<A>(t: Task<A>): Fiber<A> {
  const fiber = makeFiber(t);
  fiber.run();
  return fiber;
}

/**
 * Lift an effectfull function to Task.
 * @param f An effectful function
 */
export function liftEff<A>(f: (...args: any[]) => A, args?: any[], ctx?: any): Task<A> {
  return new SyncTask(f, args || [], ctx || null);
}

/**
 * Promote an Error if occured to value level. The new Task
 * created will not raise an Error.
 * @param task
 */
export function attempt<A>(task: Task<A>): Task<Either<Error, A>> {
  return rescue(task.map(right) as Task<Either<Error, A>>, e => pure(left(e)));
}

/**
 * Ignore any errors.
 * @param t
 */
export function apathize<A>(t: Task<A>): Task<void> {
  return attempt(t).map(_ => void 0);
}

/**
 * Ensure the first task run after the second task, regardless
 * of whether it completed successfully or the fiber was cancelled.
 */
export function ensure<A>(t: Task<void>, v: Task<A>): Task<A> {
  return bracket(pure(void 0), () => t, () => v);
}

/**
 * Raise an Error
 * @param error Error
 */
export function raise(error: Error): Task<any> {
  return Task.throwError(error);
}

/**
 * rescue a possible error raised in `t`.
 */
export function rescue<A>(t: Task<A>, f: Fn1<Error, Task<A>>) {
  return t.catchError(f);
}

/**
 * Put a value as it an result of Task
 */
export function pure<A>(a: A): Task<A> {
  return Task.of(a);
}

/**
 * Attaches a custom `Canceler` to an action. If the computation is canceled,
 * then the custom `Canceler` will be run afterwards.
 */
export function cancelWith<A>(t: Task<A>, canceller: (err: Error) => Task<void>): Task<A> {
  return generalBracket(
    pure(void 0),
    { killed: (error) => canceller(error)
    , completed: () => pure(void 0)
    , failed: () => pure(void 0)
    },
    () => t
  );
}


/**
 * convert task to parallel task applicative
 */
export function parallel<A>(t: Task<A>): Parallel<A> {
  return t.parallel();
}

/**
 * convert parallel task to monadic Task
 */
export function sequential<A>(p: Parallel<A>): Task<A> {
  return p.sequential();
}

/**
 * Race tasks.
 */
export function race<A>(xs: Task<A>[]): Task<A> {
  return xs.reduce((result, t) => {
    return result.alt(t.parallel());
  }, never.parallel()).sequential();
}

/**
 * Creates a new supervision context for some `Aff`, guaranteeing fiber
 * cleanup when the parent completes. Any pending fibers forked within
 * the context will be killed and have their cancelers run.
 * @param t
 */
export function supervise<A>(t: Task<A>): Task<A> {
  const sup = makeSupervisor();
  return ensure(
    killAll(new Error('Child fiber outlived parent'), sup),
    runWith(sup, t));
}

export function runWith<A>(sup: Supervisor, t: Task<A>): Task<A> {
  return liftEff(() => {
    let fib = new TaskFiber(t, sup);
    fib.run();
    return fib;
  }).chain(joinFiber);
}

/**
 * Take a node.js style callback and Task, then run `Task` computation,
 * the result will be passed to `callback` when it available.
 *
 * @param cb
 * @param t
 */
export function runTask<A>(cb: NodeCallback<A, void>, t: Task<A>) {
  return launchTask(
    attempt(t).chain(e =>
      liftEff(runListener, [e, cb])
    )
  );
}

/**
 * A task that will be resolved after a given miliseconds
 * @param ms
 */
export function delay(ms: number): Task<void> {
  return makeTask(new TimerComputation(ms));
}

/**
 * Guarantees resource acquisition and cleanup. The first effect may acquire
 * some resource, while the second will dispose of it. The third effect makes
 * use of the resource. Disposal is always run last, regardless. Neither
 * acquisition nor disposal may be cancelled and are guaranteed to run until
 * they complete.
 *
 * @param acquire
 * @param release
 * @param act
 */
export function bracket<A, B>(
  acquire: Task<A>,
  release: Fn1<A, Task<void>>,
  act: Fn1<A, Task<B>>
): Task<B> {
  return generalBracket(acquire, {
    killed: (_, a) => release(a),
    failed: (_, a) => release(a),
    completed: (_, a) => release(a)
  }, act);
}

/**
 * A more general version of `bracket`. Allow you to set up action to be performed
 * when it `killed`, 'failed` and `completed`.
 * @param a
 * @param r
 * @param g
 */
export function generalBracket<A, B>(
  a: Task<A>,
  r: GeneralBracket<A, B>,
  g: Fn1<A, Task<B>>
): Task<B> {
  return new BracketTask(a, r, g);
}

/**
 * Construct a `Task` using a function that return `Iterator`, usually this
 * function will be Generator function.
 * @param fn
 */
export function co(fn: () => Iterator<Task<any>>): Task<any> {
  let gen: null | Iterator<Task<any>> = null;
  function go(i?: any): Task<any> {
    if (gen == null) {
      gen = fn();
    }
    let { done, value } = gen.next(i);
    if (done) {
      gen = null;
      return value;
    } else {
      return value.chain(go);
    }
  }
  return go();
}

/**
 * Create a canceler based function with no arguments.
 * @param thunk
 */
export function thunkCanceller(thunk: () => void): Canceler {
  return () => liftEff(thunk);
}

/**
 * This is a specialize `traverse`. Take an `A[]` and function from `A` to `Task<B>`,
 * and apply this function to the items in array, and collect the results. All task
 * running in parallel.
 * @param xs
 * @param f
 */
export function forInPar<A, B>(xs: A[], f: Fn1<A, Task<B>>): Task<B[]> {
  function go(idx: number, n: number): Parallel<B[]> {
    switch (n) {
      case 0: return Parallel.of([]);
      case 2: return f(xs[idx]).map(pair).parallel().ap(f(xs[idx + 1]).parallel());
      default:
        let m = Math.floor(n / 4) * 2;
        return go(idx, m).map(concatArr).ap(go(idx + m, n - m));
    }
  }
  return xs.length % 2 === 1
    ? f(xs[0]).parallel().map(singletonArr).map(concatArr).ap(go(1, xs.length - 1)).sequential()
    : go(0, xs.length).sequential();
}

/**
 * Like `forInPar` but take an array of Task.
 * @param xs
 */
export function mergePar<A>(xs: Task<A>[]): Task<A[]> {
  return forInPar(xs, id);
}

/**
 * Turn a node js callback style to Task
 */
export function fromNodeBack(f: Function, args?: any[], ctx?: any): Task<any> {
  return makeTask(new FromNodeBack(f, args || [], ctx || null))
}

/**
 * Traverse the `A[]` with function from `A` to `Task<B>`, collect the result
 * and run all `Task<B>` in sequence, meaning it wait previous `Task` before running
 * the next one.
 * @param xs
 * @param f
 */
export function forIn<A, B>(xs: A[], f: Fn1<A, Task<B>>): Task<B[]> {
  function go(idx: number, n: number): Task<B[]> {
    switch (n) {
      case 0: return Task.of([]);
      case 2: return f(xs[idx]).map(pair).ap(f(xs[idx + 1]));
      default:
        let m = Math.floor(n / 4) * 2;
        return go(idx, m).map(concatArr).ap(go(idx + m, n - m));
    }
  }
  return xs.length % 2 === 1
    ? f(xs[0]).map(singletonArr).map(concatArr).ap(go(1, xs.length - 1))
    : go(0, xs.length);
}

/**
 * like `forIn` but take an array of Task instead.
 * @param xs Task<A>[]
 */
export function merge<A>(xs: Task<A>[]): Task<A[]> {
  return forIn(xs, id);
}

function makeFiber<A>(t: Task<A>): Fiber<A> {
  return new TaskFiber(t);
}

function doNothing() {}

function concatArr<A>(xs: A[]) {
  return function(ys: A[]) {
    return xs.concat(ys);
  };
}

function singletonArr<A>(a: A): A[] {
  return [a];
}

function pair<A>(a: A): (b: A) => A[] {
  return (b: A) => [a, b];
}

function runListener<A>(e: Either<Error, A>, cb: NodeCallback<A, void>) {
  if (isRight(e)) {
    return cb(null, e.value);
  }
  return cb(e.value);
}

class TimerComputation {
  private _timerId: NodeJS.Timer | null;
  constructor(private _delay: number) {
    this._timerId = null;
  }

  handle(cb: NodeCallback<void, void>): void {
    this._timerId = setTimeout(() => cb(null, void 0), this._delay);
  }

  _clearTimer() {
    if (this._timerId == null) return;
    clearTimeout(this._timerId);
    this._timerId = null;
  }

  cancel(err: Error): Task<void> {
    return liftEff(() => this._clearTimer());
  }
}

class FromNodeBack {
  constructor (private fn: Function, private args: any[], private ctx: any) {
  }

  handle(cb: NodeCallback<any, void>): void {
    let { fn, args, ctx } = this;
    fn.apply(ctx, withAppend(args, cb));
  }

  cancel() {
    return pure(void 0);
  }
}
