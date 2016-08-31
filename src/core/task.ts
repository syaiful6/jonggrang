export type Handler<T> = {
  (v: T): void
}

export type Computation<E, A> = {
  (error: Handler<E>, success: Handler<A>): any
}

export type Cleanup = {
  (resource: any): void
}

function emptyCleanup(_: any) { }

export type Listener<E, A> = {
  resolved?: Handler<A>
  rejected?: Handler<E>
  cancelled?: () => void
}

const delayed = typeof setImmediate !== 'undefined' ? setImmediate : setTimeout  

export type ExecutionState = 'pending' | 'resolved' | 'rejected' | 'cancelled'

export type ListenerCallState<E, A> = ['pending' | 'called', Listener<E, A>]

export class Future<E, A> {
  _state: ExecutionState
  _pending: Array<ListenerCallState<E, A>>
  _value: E | A | undefined
  constructor() {
    this._state = 'pending'
    this._pending = []
    this._value = undefined
  }

  success(value: A): Future<any, A> {
    return Future.success(value)
  }

  static success<T>(value: T) {
    let result = new Future<any, T>()
    result._state = 'resolved'
    result._value = value
    return result
  }

  static failure<Er>(value: Er) {
    let result = new Future<Er, any>()
    result._state = 'rejected'
    result._value = value
    return result
  }

  failure(value: E) {
    return Future.failure(value)
  }

  case(pattern: Listener<E, A>) {
    switch (this._state) {
      case 'pending':
        this._pending.push(['pending', pattern])
        break
      case 'cancelled':
        if (typeof pattern.cancelled === 'function') pattern.cancelled()
        break
      case 'resolved':
        if (typeof pattern.resolved === 'function') pattern.resolved(this._value as A)
        break
      case 'rejected':
        if (typeof pattern.rejected === 'function') pattern.rejected(this._value as E)
        break
      default:
        throw new Error('invalid state detected on future')
    }
  }
}

function invokePending<E, A>(future: Future<E, A>, block: (v: Listener<E, A>) => void): void {
  let item: ListenerCallState<E, A>
  for (let i = 0; i < future._pending.length; ++i) {
    item = future._pending[i]
    if (item[0] === 'pending') {
      future._pending[i][0] = 'called'
      block(item[1])
    }
  }
}

function cancelFuture(future: Future<any, any>) {
  future._state = 'cancelled'
  future._value = undefined
  invokePending(future, (pattern) => {
    return typeof pattern.cancelled === 'function' ? pattern.cancelled() : void 0
  })
}

function fulfilFuture<E, A>(future: Future<E, A>, value: A) {
  future._state = 'resolved'
  future._value = value
  invokePending<E, A>(future, (pattern) => {
    return typeof pattern.resolved === 'function' ? pattern.resolved(value) : void 0
  })
}

function rejectFuture<E, A>(future: Future<E, A>, value: E) {
  future._state = 'rejected'
  future._value = value
  invokePending<E, A>(future, (pattern) => {
    return typeof pattern.rejected === 'function' ? pattern.rejected(value) : void 0
  })
}

export interface TaskExecution<E, A> {
  cancel: () => void
  future: Future<E, A>
}

function createTaskExecution<E, A>(task: Task<E, A>): TaskExecution<E, A> {
  let future = new Future<E, A>()
  let state: ExecutionState = 'pending'
  let resource: any
  
  function cleanup() {
    task.cleanup(resource)
  }
  function cancel() {
    if (state === 'pending') {
      state = 'cancelled'
      cleanup()
      cancelFuture(future)
    }
  }
  resource = task.fork((error: E) => {
    if (state === 'pending') {
      state = 'rejected'
      rejectFuture(future, error)
      cleanup()
    }
  }, (success: A) => {
    if (state === 'pending') {
      state = 'resolved'
      fulfilFuture(future, success)
      cleanup()
    }
  })
  
  return {
    cancel,
    future
  }
}

export class Task<E, A> {
  fork: Computation<E, A>
  cleanup: Cleanup

  constructor(computation: Computation<E, A>, cleanup?: Cleanup) {
    this.fork = computation
    this.cleanup = cleanup || emptyCleanup
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
      return this.fork(reject, b => resolve(fun(b)))
    }, this.cleanup)
  }

  chain<T>(fun: (a: A) => Task<any, T>): Task<E, T> {
    return new Task((reject: Handler<E>, resolve: Handler<T>) => {
      return this.fork(reject, b => {
        return fun(b).fork(reject, resolve)
      })
    }, this.cleanup)
  }

  ap<S>(other: Task<any, S>): Task<E, any> {
    let cleanBoth = (states: any[]) => {
      this.cleanup(states[0])
      other.cleanup(states[1])
    }
    return new Task((reject: Handler<E>, resolve: Handler<any>) => {
      let fun: any
      let funcLoaded: boolean = false
      let val: S
      let valLoaded: boolean = false
      let rejected: boolean = false
      let allState: any

      let thisState = this.fork(guardReject, guardResolve<A>(function (x: A) {
        funcLoaded = true
        fun = x
      }))

      let otherState = other.fork(guardReject, guardResolve<S>(function (x: S) {
        valLoaded = true
        val = x
      }))

      function guardResolve<T>(setter: (v: T) => void) {
        return function (x: T): any {
          if (rejected) return
          setter(x)
          if (funcLoaded && valLoaded) {
            delayed(() => cleanBoth(allState))
            return resolve(fun(valLoaded))
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

      return allState = [thisState, otherState]
    }, cleanBoth)
  }

  concat<E1, A1>(other: Task<E1, A1>): Task<E | E1, A | A1> {
    let cleanBoth = (states: any[]) => {
      this.cleanup(states[0])
      other.cleanup(states[1])
    }
    return new Task((reject: Handler<E | E1>, resolve: Handler<A | A1>) => {
      let done: boolean = false
      let allState: any[]

      let thisState = this.fork(guard(reject), guard(resolve))
      let thatState = other.fork(guard(reject), guard(resolve))

      function guard<T>(fun: (x: T) => void) {
        return function (x: T): any {
          if (!done) {
            done = true
            delayed(() => cleanBoth(allState))
            return fun(x)
          }
        }
      }
      return [thisState, thatState]
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
      return this.fork((a) => {
        return transform(a).fork(reject, resolve)
      }, resolve)
    }, this.cleanup)
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
      return this.fork(resolve, reject)
    }, this.cleanup)
  }

  fold<Rej, Res>(left: (e: E) => Rej, right: (a: A) => Res): Task<Rej, Res> {
    return new Task((reject: Handler<Rej>, resolve: Handler<Res>) => {
      return this.fork((a) => reject(left(a)), (b) => resolve(right(b)))
    }, this.cleanup)
  }

  rejectedMap<T>(left: (e: E) => T): Task<T, A> {
    return new Task((reject: Handler<T>, resolve: Handler<A>) => {
      return this.fork((a) => reject(left(a)), resolve)
    })
  }

  // run this task
  run(): TaskExecution<E, A> {
    return createTaskExecution<E, A>(this)
  }
}