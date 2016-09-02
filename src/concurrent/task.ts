import { Future, fulfil, cancel, reject, cancelFuture } from './future'

export type Handler<T> = {
  (v: T): void
}

export type Computation<E, A> = {
  (error: Handler<E>, success: Handler<A>): any
}

export type Cleanup = {
  (resource: any): void
}

export interface Match<E, ET, A, AT> {
  success: (e: A) => AT
  failure: (e: E) => ET
}

export interface TaskExecution<E, A> {
  cancel: () => void
  promise: () => Promise<A>
  future: Future<E, A>
}

function emptyCleanup(_: any) { }

function createTaskExecution<E, A>(task: Task<E, A>): TaskExecution<E, A> {
  let future = new Future<E, A>()
  let open = true
  let resource: any = task._fork((error: E) => {
    if (open) {
      open = false
      reject.call(future, error)
    }
  }, (success: A) => {
    if (open) {
      open = false
      fulfil.call(future, success)
    }
  })
  if (task._cleanup !== emptyCleanup) {
     // listen for resource Cleanup
    let context = {
      cleanup: task._cleanup,
      resouces: resource
    }
    future.case({
      success: boundCleanUp
      , failure: boundCleanUp
      , cancelled: boundCleanUp
    }, context)
  }
  return {
    cancel: cancelExecution,
    promise: boundFutureToPromise,
    future
  }
}

function boundCleanUp(this: {cleanup: Cleanup, resource: any}) {
  this.cleanup(this.resource)
}

//
function cancelExecution(this: TaskExecution<any, any>) {
  cancel.call(this.future)
}

// used to create promise method on TaskExecution, we move here to avoid
// the creation of it every createTaskExecution called. the this keyword
// here should point to target Future object.
function boundFutureToPromise<E, A>(this: TaskExecution<E, A>): Promise<A> {
  return new Promise<A>((resolve, reject) => {
    this.future.case({
      success: resolve,
      failure: reject
    })
  })
}

export function runTask<T, A>(reject: Handler<T>, resolve: Handler<A>, task: Task<T, A>) {
  let { future } = task.run()
  future.case({
    success: resolve,
    failure: reject
  })
}

class Tuple<X, Y> {
  x: X
  y: Y
  constructor(x: X, y: Y) {
    this.x = x
    this.y = y
  }
}

export class Task<E, A> {
  _fork: Computation<E, A>
  _cleanup: Cleanup

  constructor(computation: Computation<E, A>, cleanup?: Cleanup) {
    this._fork = computation
    this._cleanup = cleanup || emptyCleanup
  }

  // put a value to Task as it successfull computation
  static of<A>(value: A): Task<any, A> {
    return new Task((_: Handler<any>, resolve: Handler<A>) => {
      return resolve(value)
    })
  }

  of<A>(value: A): Task<any, A> {
    return Task.of(value)
  }

  map<T>(fun: (a: A) => T): Task<E, T> {
    return new Task((reject: Handler<E>, resolve: Handler<T>) => {
      return this._fork(reject, b => resolve(fun(b)))
    }, this._cleanup)
  }

  chain<T>(fun: (a: A) => Task<any, T>): Task<E, T> {
    return new Task((reject: Handler<E>, resolve: Handler<T>) => {
      return this._fork(reject, b => {
        runTask(reject, resolve, fun(b))
      })
    }, this._cleanup)
  }

  ap<S>(other: Task<any, S>): Task<E, any> {
    let cleanBoth = (resouces: any) => {
      this._cleanup(resouces.x)
      other._cleanup(resouces.y)
    }
    return new Task((reject: Handler<E>, resolve: Handler<any>) => {
      let fun: any
      let funcLoaded: boolean = false
      let val: S
      let valLoaded: boolean = false
      let rejected: boolean = false
      function guardReject(x: E) {
        if (!rejected) {
          rejected = true
          return reject(x)
        }
      }
      let resourceThis = this._fork(guardReject, function taskApThis(f: any) {
        if (!valLoaded) return void (funcLoaded = true, fun = f)
        return resolve(f(val))
      })
      let resourceThat = other._fork(guardReject, function taskApThat(x: S) {
        if (!funcLoaded) return void (valLoaded = true, val = x)
        return resolve(fun(x))
      })
      return new Tuple(resourceThis, resourceThat)
    }, cleanBoth)
  }

  // select this task or other task, whichever completed first
  concat<E1, A1>(other: Task<E1, A1>): Task<E | E1, A | A1> {
    return Task.race<E | E1, A | A1>([this, other])
  }

  /**
   * Race the given array of tasks and select the first task that settled it result.
   * This API is deterministic in that only the result of first task is matter. in
   * other words, even if other tasks given to this method are settled it result,
   * but when the first settled task has become rejected, then the returned Task
   * it rejected.
   */
  static race<A, T>(tasks: Array<Task<A, T>>): Task<A, T> {
    return new Task((onReject: Handler<A>, onResolve: Handler<T>) => {
      let result = new Future() as Future<A, T>
      let futures = tasks.map(task => {
        let { future } = task.run()
        return future
      })
      futures.forEach(future => {
        future.case({
          success: fulfil,
          failure: reject
        }, result)
      })
      result.case({
        success: onResolve,
        failure: onReject,
        cancelled: () => futures.forEach(cancelFuture)
      })
      return result
    }, (v: any) => {
      return v instanceof Future ? cancel.call(v) : void 0
    })
  }

  static empty(): Task<never, never> {
    return new Task<never, never>(function () {
    })
  }

  empty(): Task<never, never> {
    return Task.empty()
  }

  orElse<T>(transform: (t: E) => Task<T, A>): Task<E | T, A> {
    return new Task((reject: Handler<E | T>, resolve: Handler<A>) => {
      return this._fork(a => {
        runTask(reject, resolve, transform(a))
      }, resolve)
    }, this._cleanup)
  }

  static rejected<F>(err: F): Task<F, any> {
    return new Task((reject: Handler<F>, _: Handler<any>) => {
      return reject(err)
    })
  }

  rejected<F>(err: F): Task<F, any> {
    return Task.rejected(err)
  }

  swap(): Task<A, E> {
    return new Task((reject: Handler<A>, resolve: Handler<E>) => {
      return this._fork(resolve, reject)
    }, this._cleanup)
  }

  fold<Rej, Res>(left: (e: E) => Rej, right: (a: A) => Res): Task<Rej, Res> {
    return new Task((reject: Handler<Rej>, resolve: Handler<Res>) => {
      return this._fork((a) => reject(left(a)), (b) => resolve(right(b)))
    }, this._cleanup)
  }

  rejectedMap<T>(left: (e: E) => T): Task<T, A> {
    return new Task((reject: Handler<T>, resolve: Handler<A>) => {
      return this._fork((a) => reject(left(a)), resolve)
    }, this._cleanup)
  }

  case<ET, AT>(pattern: Match<E, ET, A, AT>): Task<ET, AT> {
    return this.fold(pattern.failure, pattern.success)
  }

  fork(reject: Handler<E>, resolve: Handler<A>) {
    runTask(reject, resolve, this)
  }

  run(): TaskExecution<E, A> {
    return createTaskExecution<E, A>(this)
  }
}