import { Future, fulfil, cancel, reject, cancelFuture, fulfilFuture, rejectFuture } from './future'

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

function noop(_: any) {}

function createTaskExecution<E, A>(task: Task<E, A>): TaskExecution<E, A> {
  let future = new Future<E, A>()
  let resource: any = task._fork((error) => {
    rejectFuture(future, error)
  }, (success) => {
    fulfilFuture(future, success)
  })
  if (task._cleanup !== noop) {
     // listen for resource Cleanup
    let context = {
      cleanup: task._cleanup,
      resource: resource
    }
    future.listen({
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

function boundCleanUp(this: { cleanup: Cleanup, resource: any }) {
  let { cleanup } = this
  cleanup(this.resource)
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
    this.future.listen({
      success: resolve,
      failure: reject
    })
  })
}

export function runTask<T, A>(reject: Handler<T>, resolve: Handler<A>, task: Task<T, A>) {
  let { future } = task.run()
  future.listen({
    success: resolve,
    failure: reject
  })
}

export class Task<E, A> {
  _fork: Computation<E, A>
  _cleanup: Cleanup

  constructor(computation: Computation<E, A>, cleanup?: Cleanup) {
    this._fork = computation
    this._cleanup = cleanup || noop
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
      let { future } = this.run()
      future.listen({
        success: b => resolve(fun(b)),
        failure: reject
      })
      return future
    }, cancelIfFuture)
  }

  chain<T>(fun: (a: A) => Task<any, T>): Task<E, T> {
    return new Task((reject: Handler<E>, resolve: Handler<T>) => {
      let { future } = this.run()
      future.listen({
        success: b => runTask(reject, resolve, fun(b)),
        failure: reject
      })
      return future
    }, cancelIfFuture)
  }

  ap<S>(other: Task<any, (input: A) => S>): Task<E, S> {
    return new Task((reject: Handler<E>, resolve: Handler<S>) => {
      let contextExecution = new ApExecution(resolve, reject)
      let futureThis = this.run().future
      let futureThat = other.run().future
      futureThis.listen({
        success: contextExecution.valReceiver,
        failure: contextExecution.rejectReceiver
      }, contextExecution)
      futureThat.listen({
        success: contextExecution.funcReceiver,
        failure: contextExecution.rejectReceiver
      }, contextExecution)
      return [futureThat, futureThis]
    }, cancelAllFuture)
  }

  /**
   * select this Task or other Task result, whichever task complete first
   */
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
      let futures = tasks.map(internalRunTask)
      futures.forEach(internalFutureListen, result)
      result.listen({
        success: onResolve,
        failure: onReject,
        cancelled: () => futures.forEach(cancelFuture)
      })
      return [result]
    }, cancelIfFuture)
  }

  static parallel<A, T>(tasks: Array<Task<A, T>>): Task<A, Array<T>> {
    return new Task((onReject: Handler<A>, onResolve: Handler<Array<T>>) => {
      let length = tasks.length
      let results: Array<T> = Array(length)
      let open = true
      function failureReceiver(e: A) {
        if (open) {
          open = false
          onReject(e)
        }
      }
      function successReceiver(s: T) {
        if (open) {
          results[this.index] = s
          length = length - 1
          if (length === 0) {
            open = false
            onResolve(results)
          }
        }
      }
      function handleTask(task: Task<A, T>, i: number) {
        let { future } = task.run()
        future.listen({
          failure: failureReceiver,
          success: successReceiver
        }, {index: i})
        return future
      }
      if (tasks.length === 0) {
        onResolve([])
        return []
      } else {
        return tasks.map(handleTask)
      }
    }, cancelAllFuture)
  }

  static empty(): Task<never, never> {
    return new Task<never, never>(noop)
  }

  empty(): Task<never, never> {
    return Task.empty()
  }

  orElse<E1, T1>(transform: (t: E) => Task<E1, T1>): Task<E1, A | T1> {
    return new Task((reject: Handler<E1>, resolve: Handler<A | T1>) => {
      let { future } = this.run()
      future.listen({
        success: resolve,
        failure: e => runTask(reject, resolve, transform(e))
      })
      return future
    }, cancelIfFuture)
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

function internalRunTask<T, A>(task: Task<T, A>): Future<T, A> {
  let { future } = task.run()
  return future
}

function internalFutureListen<T, A>(this: Future<T, A>, future: Future<T, A>) {
  future.listen({
    success: fulfil,
    failure: reject
  }, this)
}

function cancelIfFuture(f: any) {
  if (f instanceof Future) {
    cancelFuture(f)
  }
}

function cancelAllFuture(a: any) {
  if (Array.isArray(a)) {
    a.map(cancelIfFuture)
  }
}

class ApExecution<T, U> {
  private fun: (t: T) => U
  private val: T
  private funcLoaded: boolean
  private valLoaded: boolean
  private resolve: (u: U) => void
  private reject: (e: any) => void
  constructor(resolve: (u: U) => void, reject: (e: any) => void) {
    this.funcLoaded = false
    this.valLoaded = false
    this.resolve = resolve
    this.reject = reject
  }
  funcReceiver(fun: (t: T) => U) {
    if (!this.valLoaded) {
      this.funcLoaded = true
      this.fun = fun
      return
    }
    this.resolve(fun(this.val))
  }
  valReceiver(val: T) {
    if (!this.funcLoaded) {
      this.valLoaded = true
      this.val = val
      return
    }
    let fun = this.fun
    this.resolve(fun(val))
  }
  rejectReceiver(x: any) {
    this.reject(x)
  }
}
