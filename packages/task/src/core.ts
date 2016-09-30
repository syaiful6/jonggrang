/**
 * A function that computation accept. It just take one argument, the return value
 * isn't matter, because it used as receiver.
 */
export interface Handler<T> {
  (input: T): void
}

/**
 * A canceller is a function with no arguments, when it called it return void.
 */
export interface Canceller {
  (): void
}

/**
 * A Computation is a function that accept 2 arguments. Both arguments are Handler (function),
 * the left one is for error case and the last one is for success case, and it should
 * call it with appropriate handler.
 */
export interface Computation<L, R> {
  (error: Handler<L>, success: Handler<R>): Canceller
}

/**
 * Implementation details for chainRec: it returned by nextRec and doneRec functions
 * below. The shape is same as IteratorResult.
 */
export interface ChainRecResult<T> {
  done: boolean
  value: T
}

/**
 * ChainRecFn is a function signature (type) that Task.chainRec expect, it a function
 * that takes three arguments next, done, value. Next is a function which takes one argument,
 * and it can be called if the recursion/computation still not complete. Done is similiar to next,
 * but it for the case you want to stop the recursion, value is previous value/result.
 * @example
 *
 *     const step = (next, done, v) => v < 0 ? Task.of(done(v)) : Task.of(next(v - 1))
 */
export interface ChainRecFn<L, R> {
  (next: (value: R) => ChainRecResult<R>, done: (value: R) => ChainRecResult<R>, value: R): Task<L, ChainRecResult<R>>
}

/**
 *  A function that passed to first parameter of ChainRecFn
 */
function nextRec<T>(value: T): ChainRecResult<T> {
  return {
    done: false,
    value: value
  }
}

/**
 * A function that passed to second parameter of ChainRecFn
 */
function doneRec<T>(value: T): ChainRecResult<T> {
  return {
    done: true,
    value: value
  }
}

/**
 * A ChainRecFn that used to implements Task.do.
 *
 */
function generatorStep(
  n: (value: any) => ChainRecResult<any>,
  d: (value: any) => ChainRecResult<any>,
  last: { next: (v?: any) => IteratorResult<Task<any, any>>, value: any }
) {
  let { next } = last
  let { done, value } = next(last.value)
  return done
    ? value.map(d)
    : value.map((x: any) => n({ value: x, next: next }))
}

const noop = () => { }
const call = (f: Function) => f()

/**
 * Task represent values that depend on time similar to Promise. But Task are lazy
 * and monadic by design, the value will not there until you ask it, by calling .fork method.
 */
export class Task<L, R> {
  private _computation: Computation<L, R>

  constructor(computation: Computation<L, R>) {
    this._computation = computation
  }

  /**
  * Map a successfull value of task using an unary function.
  */
  map<T>(func: (v: R) => T): Task<L, T> {
    return new Task((error: Handler<L>, success: Handler<T>) => {
      return this.fork(error, (v) => success(func(v)))
    })
  }

  /**
   * Put a value as successful computation.
   */
  static of<R>(value: R): Task<never, R> {
    return new Task((_: Handler<any>, success: Handler<R>) => {
      success(value)
      return noop
    })
  }

  /**
   * Put a value as successful computation.
   */
  of<R>(value: R): Task<never, R> {
    return Task.of(value)
  }

  /**
   * Apply a success value inside this task on other Task that have function as it
   * success value.
   * ap :: Task<a, b> -> Task<a, b -> s> -> Task<a, s>
   */
  ap<E, S>(other: Task<E, (v: R) => S>): Task<L | E, S> {
    return new Task((error: Handler<L | E>, success: Handler<S>) => {
      let func: (v: R) => S
      let val: R
      let otherOk: number
      let thisOk: number
      let ko: number
      const guardReject = (x: L | E) => ko || (ko = 1, error(x))
      const cancel = this.fork(guardReject, (v) => {
        if (!otherOk) return void (thisOk = 1, val = v)
        return success(func(v))
      })
      const cancel1 = other.fork(guardReject, (f) => {
        if (!thisOk) return void (otherOk = 1, func = f)
        return success(f(val))
      })
      return () => {
        cancel()
        cancel1()
      }
    })
  }

  /**
   * Combine this task with the given task, the result task when run, will fork
   * these task in parallel. If one of these task fail, the result task will fail.
   * The result is always an array, the first item is successfull value for own,
   * and the second one is from the given task.
   */
  and<E, S>(other: Task<E, S>): Task<L | E, [R, S]> {
    return new Task((error: Handler<L | E>, success: Handler<[R, S]>) => {
      let thisVal: R
      let otherVal: S
      let thisOk: number
      let otherOk: number
      let ko: number
      const guardReject = (x: L | E) => ko || (ko = 1, error(x))
      const canceller = this.fork(guardReject, (v) => {
        if (!otherOk) return void (thisOk = 1, thisVal = v)
        return success([v, otherVal])
      })
      const canceller1 = other.fork(guardReject, (v1) => {
        if (!thisOk) return void (otherOk = 1, otherVal = v1)
        return success([thisVal, v1])
      })
      return () => {
        canceller()
        canceller1()
      }
    })
  }

  /**
   * Similiar to map. But it accept a function that take one argument and return a Task,
   * the function will be called with successful value of this task then the returned
   * Task will be forked for successful value of the returned Task.
   */
  chain<E, S>(func: (input: R) => Task<E, S>): Task<L | E, S> {
    return new Task((error: Handler<L | E>, success: Handler<S>) => {
      let cancel: Canceller | undefined = undefined
      const selfCancel = this.fork(error, (v) => {
        const task = func(v)
        cancel = task.fork(error, success)
      })
      return cancel ? cancel : (cancel = selfCancel, () => (cancel as Canceller)())
    })
  }

  /**
   * like chain but the function passed here take 3 arguments: next, done, value
   * next and done is function and value is the previous results of task
   * examples: Task.chainRec((next, done, v) => v < 0 ? Task.of(done(v)) : Task.of(next(v - 1)), 5)
   */
  static chainRec<E, S>(func: ChainRecFn<E, S>, initial: S): Task<E, S> {
    return new Task((error: Handler<E>, success: Handler<S>) => {
      return (function step(acc: S) {
        let status: number
        let elem = nextRec(acc)
        let canceller: Canceller = noop
        function onSuccess(v: ChainRecResult<S>) {
          if (status === 0) {
            status = 1
            elem = v
          } else {
            let handler = v.done ? success : step
            handler(v.value)
          }
        }
        while (!elem.done) {
          status = 0
          canceller = func(nextRec, doneRec, elem.value).fork(error, onSuccess)
          if (status === 1) {
            if (elem.done) {
              success(elem.value)
            } else {
              continue
            }
          } else {
            status = 2
            return canceller
          }
        }
        return canceller
      })(initial)
    })
  }

  static do(func: () => Iterator<Task<any, any>>): Task<any, any> {
    return new Task((error: Handler<any>, success: Handler<any>) => {
      const gen = func()
      const next = (x: any) => gen.next(x)
      const task = Task.chainRec(generatorStep, { value: undefined, next: next })
      return task.fork(error, success)
    })
  }

  /**
   * Run the given array of Task on parallel. If one of task fail, the result task
   * will also fail. The success value is an array of the successful value of each task
   * on then array, they appear on the same order as you passed here.
   */
  static parallel<L, R>(arr: Array<Task<L, R>>): Task<L, Array<R>> {
    return arr.length < 1
      ? Task.of([])
      : new Task((error: Handler<L>, success: Handler<Array<R>>) => {
        let len = arr.length
        let results: Array<R> = new Array(len)
        let resolved = false
        const onError = (e: L) => resolved || (resolved = true, error(e))
        function fork(item: Task<L, R>, i: number) {
          return item.fork(onError, (v) => {
            if (resolved) return
            results[i] = v
            len = len - 1
            if (len === 0) {
              success(results)
              resolved = true
            }
          })
        }
        let cancellers = arr.map(fork)
        return () => {
          cancellers.forEach(call)
        }
      })
  }

  /**
   * Race a give array of Task, choose the earlier Task that settled it result.
   */
  static race<L, R>(arr: Array<Task<L, R>>): Task<L, R> {
    return new Task((error: Handler<L>, success: Handler<R>) => {
      let settled = false
      const guardReject = (v: L) => {
        if (settled) return
        error(v)
        settled = true
      }
      const guardResolve = (v: R) => {
        if (settled) return
        success(v)
        settled = true
      }
      let cancellers = arr.map(t => t.fork(guardReject, guardResolve))
      return () => {
        cancellers.forEach(call)
      }
    })
  }
  
  /**
   * Maps both sides of the disjunction.
   */
  bimap<TL, TR>(left: (rej: L) => TL, right: (res: R) => TR): Task<TL, TR> {
    return new Task((error: Handler<TL>, success: Handler<TR>) => {
      return this.fork((e) => {
        error(left(e))
      }, (s) => {
        success(right(s))
      })
    })
  }

  /**
   * Takes two functions, applies the leftmost one to the failure value, and the
   * rightmost one to the successful value, depending on which one is present.
   */
  fold<T>(f: (e: L) => T, g: (s: R) => T): Task<never, T> {
    return new Task((_: Handler<any>, success: Handler<T>) => {
      return this.fork((err) => {
        success(f(err))
      }, (value) => {
        success(g(value))
      })
    })
  }

  /**
   * Swaps the disjunction values.
   */
  swap(): Task<R, L> {
    return new Task((error: Handler<R>, success: Handler<L>) => {
      return this.fork(success, error)
    })
  }

  /**
   * Transforms a failure value into a new Task, Does nothing if the structure
   * already contains a successful value.
   */
  orElse<E, S>(func: (t: L) => Task<E, S>): Task<E, S | R> {
    return new Task((error: Handler<E>, success: Handler<S | R>) => {
      let canceller: Canceller | undefined = undefined
      let selfCancel = this.fork((e) => {
        canceller = func(e).fork(error, success)
      }, success)
      return canceller ? canceller : (canceller = selfCancel, () => (canceller as Canceller)())
    })
  }

  /**
   * Create new Task with results the provided value as it failure computation.
   */
  static rejected<T>(er: T): Task<T, never> {
    return new Task((error: Handler<T>) => {
      error(er)
      return noop
    })
  }

  /**
   * sinonim for static rejected.
   */
  rejected<T>(er: T): Task<T, never> {
    return Task.rejected(er)
  }

  /**
   * Like .map, but this method map the left side of the disjunction (failure).
   * @summary Task a b -> (a -> c) -> Task c b
   */
  rejectedMap<T>(func: (v: L) => T): Task<T, R> {
    return new Task((error: Handler<T>, success: Handler<R>) => {
      return this.fork((e) => error(func(e)), success)
    })
  }

  fork(error: Handler<L>, success: Handler<R>): Canceller {
    let open = true
    let canceller = this._computation((err) => {
      if (open) {
        open = false
        error(err)
      }
    }, (val) => {
      if (open) {
        open = false
        success(val)
      }
    })
    return () => {
      canceller()
      canceller = noop
    }
  }
}

/**
 * Ideally this should be on class declaration, but unfortunately i dont know how
 * to do that on TS. It look like it doesn't support. So, i choose to patch the
 * Fantasy Land method here.
 */
function patchFantasyLandMethod(constructor: any) {
  // Functor
  constructor.prototype['fantasy-land/map'] = constructor.prototype.map
  // Chain
  constructor.prototype['fantasy-land/chain'] = constructor.prototype.chain
  // applicative
  constructor.prototype['fantasy-land/of'] = constructor['fantasy-land/of'] = constructor.of
  constructor.prototype['fantasy-land/ap'] = constructor.prototype.ap
  // chainRec
  constructor.prototype['fantasy-land/chainRec'] = constructor['fantasy-land/chainRec'] = constructor.chainRec
  // bimap
  constructor.prototype['fantasy/bimap'] = constructor.prototype.bimap
}

patchFantasyLandMethod(Task)
