import { asap } from './_asap'
import { Future, fulfilFuture, cancelFuture, rejectFuture } from './future'

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
  resolved: (e: A) => AT
  rejected: (e: E) => ET
}

export interface TaskExecution<E, A> {
  cancel: () => void
  future: Future<E, A>
}

function emptyCleanup(_: any) { }

function createTaskExecution<E, A>(computation: Computation<E, A>, cleanup: Cleanup): TaskExecution<E, A> {
  let future = new Future<E, A>()
  let open = true
  let resource: any
  
  function cancel() {
    if (open) {
      open = false
      cancelFuture(future)
    }
  }
  function cleanupTask() {
    cleanup(resource)
    resource = undefined
  }
  resource = computation((error: E) => {
    if (open) {
      open = false
      rejectFuture(future, error)
    }
  }, (success: A) => {
    if (open) {
      open = false
      fulfilFuture(future, success)
    }
  })
   // listen for resource Cleanup
  asap(() => {
    future.case({
      resolved: cleanupTask
      , rejected: cleanupTask
      , cancelled: cleanupTask
    })  
  })
  return {
    cancel,
    future
  }
}

class TwoResourceContainer {
  resourceA: any
  resourceB: any
  constructor(resourceA: any, resourceB: any) {
    this.resourceA = resourceA
    this.resourceB = resourceB
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
        return fun(b)._fork(reject, resolve)
      })
    }, this._cleanup)
  }

  ap<S>(other: Task<any, S>): Task<E, any> {
    let cleanBoth = (resouces: any) => {
      this._cleanup(resouces.resourceA)
      other._cleanup(resouces.resourceB)
    }
    return new Task((reject: Handler<E>, resolve: Handler<any>) => {
      let fun: any
      let funcLoaded: boolean = false
      let val: S
      let valLoaded: boolean = false
      let rejected: boolean = false
      // guard the resolved task
      function guardResolve<T>(setter: (v: T) => void) {
        return function (x: T): any {
          if (rejected) return
          setter(x)
          if (funcLoaded && valLoaded) {
            return resolve(fun(val))
          } else {
            return x
          }
        }
      }
      function guardReject(x: E) {
        if (!rejected) {
          rejected = true
          return reject(x)
        }
      }

      let resourceThis = this._fork(guardReject, guardResolve<A>(function (x: A) {
        funcLoaded = true
        fun = x
      }))
      let resourceThat = other._fork(guardReject, guardResolve<S>(function (x: S) {
        valLoaded = true
        val = x
      }))
      return new TwoResourceContainer(resourceThis, resourceThat)
    }, cleanBoth)
  }

  concat<E1, A1>(other: Task<E1, A1>): Task<E | E1, A | A1> {
    let cleanBoth = (resouces: any) => {
      this._cleanup(resouces.resourceA)
      other._cleanup(resouces.resourceB)
    }
    return new Task((reject: Handler<E | E1>, resolve: Handler<A | A1>) => {
      let done: boolean = false
      function guard<T>(fun: (x: T) => void) {
        return function (x: T): any {
          if (!done) {
            done = true
            return fun(x)
          }
        }
      }
      return new TwoResourceContainer(
        this._fork(guard(reject), guard(resolve)),
        other._fork(guard(reject), guard(resolve))
      )
    }, cleanBoth)
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
      return this._fork((a) => {
        return transform(a)._fork(reject, resolve)
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
    return this.fold(pattern.rejected, pattern.resolved)
  }

  // run this task
  run(): TaskExecution<E, A> {
    return createTaskExecution<E, A>(this._fork, this._cleanup)
  }
}