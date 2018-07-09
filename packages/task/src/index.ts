import { Either, left, right, isRight, Maybe, isJust, identity, constant } from '@jonggrang/prelude';

import {
  Canceler, Fn1, NodeCallback, Computation, Fiber, Supervisor, nonCanceler,
  Task, GeneralBracket, Parallel
} from './internal/types';
import { TaskFiber } from './internal/interpreter';
import { SimpleSupervisor } from './internal/scheduler';
import { withAppend, foldrArr } from './internal/utils';


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
    return liftEff(fiber, e, doNothing, fiber.kill) as Task<any>;
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
export function makeTask<A>(f: Fn1<NodeCallback<A>, Canceler> | Computation<A>): Task<A> {
  return new Task('ASYNC', f);
}

/**
 * like `makeTask` but only accept `function` based NodeCallback. used for create task
 * that can't be cancelled
 */
export function makeTask_<A>(f: Fn1<NodeCallback<A>, void>): Task<A> {
  return makeTask(cb => {
    f(cb);
    return nonCanceler;
  });
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
  return new Task('FORK', true, t, sup);
}

/**
 * fork a task from within a parent `Task` context, returning `Fiber`
 * @param t Task<A>
 * @return Task<Fiber<A>
 */
export function forkTask<A>(t: Task<A>): Task<Fiber<A>> {
  return new Task('FORK', true, t);
}

/**
 * Suspends a `Task` from within a the provided supervisor, returning the `Fiber`.
 * A suspended `Task` is not executed until a consumer observes the result
 * with `joinFiber`.
 * @param t
 */
export function suspendTaskWith<A>(sup: Supervisor, t: Task<A>): Task<Fiber<A>> {
  return new Task('FORK', false, t, sup);
}

/**
 * Suspends a `Task` from within a parent context.
 * @param t
 */
export function suspendTask<A>(t: Task<A>): Task<Fiber<A>> {
  return new Task('FORK', false, t, undefined);
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
export function liftEff<A>(ctx: any, fn: () => A): Task<A>;
export function liftEff<A, B>(ctx: any, a: A, fn: (a: A) => B): Task<B>;
export function liftEff<A, B, C>(ctx: any, a: A, b: B, fn: (a: A, b: B) => C): Task<C>;
export function liftEff<A, B, C, D>(ctx: any, a: A, b: B, c: C, fn: (a: A, b: B, c: C) => D): Task<D>;
export function liftEff<A, B, C, D, E>(ctx: any, a: A, b: B, c: C, d: D, fn: (a: A, b: B, c: C, d: D) => E): Task<E>;
export function liftEff<A, B, C, D, E, F>(ctx: any, a: A, b: B, c: C, d: D, e: E, fn: (a: A, b: B, c: C, d: D, e: E) => F): Task<F>;
export function liftEff<A, B, C, D, E, F, G>(ctx: any, a: A, b: B, c: C, d: D, e: E, f: F, fn: (a: A, b: B, c: C, d: D, e: E, f: F) => G): Task<G>;
export function liftEff<A, B, C, D, E, F, G, H>(ctx: any, a: A, b: B, c: C, d: D, e: E, f: F,
                                                g: G, fn: (a: A, b: B, c: C, d: D, e: E, f: F, g: G) => H): Task<H>;
export function liftEff<A, B, C, D, E, F, G, H, I>(ctx: any, a: A, b: B, c: C, d: D, e: E, f: F, g: G,
                                                   h: H, fn: (a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H) => I): Task<I>;
export function liftEff<A, B, C, D, E, F, G, H, I, J>(ctx: any, a: A, b: B, c: C, d: D, e: E, f: F, g: G,
                                                      h: H, i: I, fn: (a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I) => J): Task<J>;
export function liftEff<A>(ctx: any, ...args: any[]): Task<A> {
  const params = args.slice(0, -1);
  const fn = args[args.length - 1];
  return new Task('SYNC', fn, params, ctx);
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
 * A variant of `attempt` that takes an exception predicate to select
 * which exceptions are caught. If the exception does not match the predicate,
 * it is re-thrown.
 */
export function attemptJust<A, B>(task: Task<A>, pred: Fn1<Error, Maybe<B>>): Task<Either<B, A>> {
  return attempt(task).chain(r => {
    if (isRight(r)) return pure(r);
    const ret = pred(r.value);
    return isJust(ret) ? pure(left(ret.value)) : raise(r.value);
  });
}

/**
 * Ignore any errors.
 * @param t
 */
export function apathize<A>(t: Task<A>): Task<void> {
  return attempt(t).map(_ => void 0);
}

/**
 * Ensure the second task run after the first task, regardless
 * of whether it completed successfully or the fiber was cancelled.
 */
export function ensure<A, B>(v: Task<A>, t: Task<B>): Task<A> {
  return bracket(pure(void 0), () => t, () => v);
}

/**
 * Like 'ensure', but only performs the final action if there was an
 * exception raised by the computation.
 */
export function onException<A, B>(t: Task<A>, what: Task<B>): Task<A> {
  return bracketOnError(pure(void 0), constant(what), constant(t));
}

/**
 * Runs an effect such that it cannot be killed.
 */
export function invincible<A>(t: Task<A>): Task<A> {
  return bracket(t, constant(pure(void 0)), pure);
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
 * This function allows you to provide a predicate for selecting the
 * exceptions that you're interested in, and handle only those exceptons / error.
 * If the inner computation throws an exception, and the predicate returns
 * Nothing, then the whole computation will still fail with that exception.
 */
export function rescueOnJust<A, B>(
  pred: Fn1<Error, Maybe<B>>,
  act: Task<A>,
  handler: Fn1<B, Task<A>>
): Task<A> {
  return rescue(act, error => {
    const ret = pred(error);
    return isJust(ret) ? handler(ret.value) : raise(error);
  });
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
  return foldrArr(altComb as any, never.parallel(), xs).sequential();
}

/**
 * Creates a new supervision context for some `Task`, guaranteeing fiber
 * cleanup when the parent completes. Any pending fibers forked within
 * the context will be killed and have their cancelers run.
 * @param t
 */
export function supervise<A>(t: Task<A>): Task<A> {
  const sup = makeSupervisor();
  return ensure(
    runWith(sup, t),
    killAll(new Error('Child fiber outlived parent'), sup)
  );
}

/**
 * Run task with the provided supervisor
 */
export function runWith<A>(sup: Supervisor, t: Task<A>): Task<A> {
  return liftEff(null, () => {
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
export function runTask<A>(t: Task<A>, cb: NodeCallback<A>) {
  const fib = launchTask(t);
  fib.onComplete({
    rethrow: false,
    handler: cb
  });
  return fib;
}

/**
 * convert a task to promise
 */
export function toPromise<A>(t: Task<A>): Promise<A> {
  return new Promise((resolve, reject) => {
    const fib = launchTask(t);
    fib.onComplete({
      rethrow: false,
      handler: (err, v) => {
        if (err) return reject(err);
        resolve(v);
      }
    });
  });
}

/**
 * `forever` runs an action indefinitely, the task not yet run
 */
export function forever<A>(ma: Task<A>): Task<A> {
  return ma.chain(() => forever(ma));
}

/**
 * A task that will be resolved after a given miliseconds
 * @param ms
 */
export function delay(ms: number): Task<void> {
  return makeTask(new TimerComputation(ms));
}

/**
 * Lazy task
 */
export function defer<B>(fn: () => Task<B>): Task<B> {
  return Task.defer(fn);
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
export function bracket<A, B, C>(
  acquire: Task<A>,
  release: Fn1<A, Task<B>>,
  act: Fn1<A, Task<C>>
): Task<C> {
  return generalBracket(acquire, {
    killed: (_, a) => release(a),
    failed: (_, a) => release(a),
    completed: (_, a) => release(a)
  }, act);
}

/**
 * A variant of `bracket` but only performs the final action
 * if there was an exception raised by the in-between computation.
 */
export function bracketOnError<A, B, C>(
  acquire: Task<A>,
  release: Fn1<A, Task<B>>,
  act: Fn1<A, Task<C>>
): Task<C> {
  return generalBracket(acquire, {
    killed: (_, a) => release(a),
    failed: (_, a) => release(a),
    completed: () => pure(void 0)
  }, act);
}

/**
 * A variant of `bracket` where the return value from the first computation is not required.
 */
export function bracket_<A, B, C>(acquire: Task<A>, release: Task<B>, act: Task<C>): Task<C> {
  return bracket(acquire, constant(release), constant(act));
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
  return new Task('BRACKET', a, r, g);
}

/**
 * Construct a `Task` using a function that return `Iterator`, usually this
 * function will be Generator function.
 * @param fn
 */
export function co(fn: () => Iterator<Task<any>>): Task<any> {
  return defer(() => {
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
  });
}

/**
 * Create a canceler based function with no arguments.
 * @param thunk
 */
export function thunkCanceller(thunk: () => void): Canceler {
  return () => liftEff(null, thunk);
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
 * Traverse an array, performing some effects at each value in parallel, ignoring the final result.
 */
export function forInPar_<A, B>(xs: A[], f: Fn1<A, Task<B>>): Task<void> {
  return foldrArr((a, b) => apSecond(f(a).parallel(), b), Parallel.of(void 0), xs).sequential();
}

/**
 * Like `forInPar` but take an array of Task.
 * @param xs
 */
export function sequencePar<A>(xs: Task<A>[]): Task<A[]> {
  return forInPar(xs, identity);
}

/**
 * Like `mergePar` but ignoring final result
 */
export function sequencePar_<A>(xs: Task<A>[]): Task<void> {
  return forInPar_(xs, identity);
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
 * Traverse an array, performing some effects at each value in sequential order,
 * ignoring the final result.
 */
export function forIn_<A, B>(xs: A[], f: Fn1<A, Task<B>>): Task<void> {
  return foldrArr((a, b) => apSecond(f(a), b), pure(void 0), xs);
}

/**
 * like `forIn` but take an array of Task instead.
 * @param xs Task<A>[]
 */
export function sequence<A>(xs: Task<A>[]): Task<A[]> {
  return forIn(xs, identity);
}

export function sequence_<A>(xs: Task<A>[]): Task<void> {
  return forIn_(xs, identity);
}

/**
 * Wait both task to complete, that tasks will be executed in parallel
 */
export function bothPar<A, B>(fa: Task<A>, fb: Task<B>): Task<[A, B]> {
  return fa.map(pair as (a: A) => (b: B) => [A, B]).parallel().ap(fb.parallel()).sequential();
}

/**
 * Wait both task to complete, the task will be executed in sequential
 */
export function both<A, B>(fa: Task<A>, fb: Task<B>): Task<[A, B]> {
  return fa.map(pair as (a: A) => (b: B) => [A, B]).ap(fb);
}

/**
 * Combine two effectful actions, keeping only the result of the first.
 */
export function apFirst<A, B>(fa: Parallel<A>, fb: Parallel<B>): Parallel<A>;
export function apFirst<A, B>(fa: Task<A>, fb: Task<B>): Task<A>;
export function apFirst<A, B>(fa: any, fb: any): any {
  return fa.map(constant).ap(fb);
}

/**
 * Combine two effectful actions, keeping only the result of the second.
 */
export function apSecond<A, B>(fa: Parallel<A>, fb: Parallel<B>): Parallel<B>;
export function apSecond<A, B>(fa: Task<A>, fb: Task<B>): Task<B>;
export function apSecond<A, B>(fa: any, fb: any): any {
  return fa.map(constant(identity)).ap(fb) as Task<B>;
}

/**
 * Turn a node js callback style to Task
 */
export function node<A>(ctx: any, fn: (cb: NodeCallback<A>) => void): Task<A>;
export function node<A, B>(ctx: any, a: A, fn: (a: A, cb: NodeCallback<B>) => void): Task<B>;
export function node<A, B, C>(ctx: any, a: A, b: B, fn: (a: A, b: B, cb: NodeCallback<C>) => void): Task<C>;
export function node<A, B, C, D>(ctx: any, a: A, b: B, c: C, fn: (a: A, b: B, c: C, cb: NodeCallback<D>) => void): Task<D>;
export function node<A, B, C, D, E>(ctx: any, a: A, b: B, c: C, d: D, fn: (a: A, b: B, c: C, d: D, cb: NodeCallback<E>) => void): Task<E>;
export function node<A, B, C, D, E, F>(
  ctx: any, a: A, b: B, c: C, d: D, e: E,
  fn: (a: A, b: B, c: C, d: D, e: E, cb: NodeCallback<F>) => void
): Task<F>;
export function node<A, B, C, D, E, F, G>(
  ctx: any, a: A, b: B, c: C, d: D, e: E, f: F,
  fn: (a: A, b: B, c: C, d: D, e: E, f: F, cb: NodeCallback<G>) => void
): Task<G>;
export function node<A, B, C, D, E, F, G, H>(
  ctx: any, a: A, b: B, c: C, d: D, e: E, f: F, g: G,
  fn: (a: A, b: B, c: C, d: D, e: E, f: F, g: G, cb: NodeCallback<H>) => void
): Task<H>;
export function node<A, B, C, D, E, F, G, H, I>(
  ctx: any, a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H,
  fn: (a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, cb: NodeCallback<I>) => void
): Task<I>;
export function node<A, B, C, D, E, F, G, H, I, J>(
  ctx: any, a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I,
  fn: (a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, cb: NodeCallback<J>) => void
): Task<J>;
export function node<A, B, C, D, E, F, G, H, I, J, K>(
  ctx: any, a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, j: J,
  fn: (a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, j: J, cb: NodeCallback<K>) => void
): Task<K>;
export function node<A, B, C, D, E, F, G, H, I, J, K, L>(
  ctx: any, a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, j: J, k: K,
  fn: (a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, j: J, k: K, cb: NodeCallback<L>) => void
): Task<L>;
export function node(ctx: any, ...args: any[]): Task<any> {
  let params = args.slice(0, -1);
  let fn = args[args.length - 1];
  return makeTask(new FromNodeBack(fn, params, ctx));
}

export function fromPromise<A>(ctx: any, fn: () => Promise<A>): Task<A>;
export function fromPromise<A, B>(ctx: any, a: A, fn: (_: A) => Promise<B>): Task<B>;
export function fromPromise<A, B, C>(ctx: any, a: A, b: B, fn: (a: A, b: B) => Promise<C>): Task<C>;
export function fromPromise<A, B, C, D>(ctx: any, a: A, b: B, c: C, fn: (a: A, b: B, c: C) => Promise<D>): Task<D>;
export function fromPromise<A, B, C, D, E>(
  ctx: any, a: A, b: B, c: C, d: D,
  fn: (a: A, b: B, c: C, d: D) => Promise<E>
): Task<E>;
export function fromPromise<A, B, C, D, E, F>(
  ctx: any, a: A, b: B, c: C, d: D, e: E,
  fn: (a: A, b: B, c: C, d: D, e: E) => Promise<F>
): Task<F>;
export function fromPromise<A, B, C, D, E, F, G>(
  ctx: any, a: A, b: B, c: C, d: D, e: E, f: F,
  fn: (a: A, b: B, c: C, d: D, e: E, f: F) => Promise<G>
): Task<G>;
export function fromPromise<A, B, C, D, E, F, G, H>(
  ctx: any, a: A, b: B, c: C, d: D, e: E, f: F, g: G,
  fn: (a: A, b: B, c: C, d: D, e: E, f: F, g: G) => Promise<H>
): Task<H>;
export function fromPromise(ctx: any, ...params: any[]): Task<any> {
  const param = params.slice(0, -1);
  const fn = params[params.length - 1];
  return makeTask(new FromPromiseFn(ctx, param, fn));
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

function altComb<A>(t: Task<A>, p: Parallel<A>): Parallel<A> {
  return t.parallel().alt(p);
}

class TimerComputation {
  private _timerId: NodeJS.Timer | null;
  constructor(private _delay: number) {
    this._timerId = null;
  }

  handle(cb: NodeCallback<void>): void {
    this._timerId = setTimeout(() => cb(null, void 0), this._delay);
  }

  _clearTimer() {
    if (this._timerId == null) return;
    clearTimeout(this._timerId);
    this._timerId = null;
  }

  cancel(err: Error): Task<void> {
    return liftEff(this, this._clearTimer);
  }
}

class FromNodeBack {
  constructor (private fn: Function, private args: any[], private ctx: any) {
  }

  handle(cb: NodeCallback<any>): void {
    let { fn, args, ctx } = this;
    fn.apply(ctx, withAppend(args, cb));
  }

  cancel() {
    return pure(void 0);
  }
}

class FromPromiseFn {
  constructor(readonly ctx: any, readonly params: any[], readonly fn: Function) {
  }

  handle(cb: NodeCallback<any>) {
    const { ctx, params, fn } = this;
    const prom: Promise<any> = fn.apply(ctx, params);
    prom.then(result => {
      cb(null, result);
    }, (error: Error) => {
      cb(error);
    });
  }

  cancel() {
    return pure(void 0);
  }
}
