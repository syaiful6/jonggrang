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

type ExecutionState = 'Pending' | 'Resolved' | 'Rejected' | 'Cancelled'

type Listener<E, A> = {
  Resolved: Handler<A>
  Rejected: Handler<E>
  Cancelled: Handler<any>
}

type Signal<T> = {
  (): T
  (t: T): void
  subscribe: (subscriber: (r: T) => any) => void
}

function makeFutureSignal<T>(init?: T): Signal<T> {
  let v: T
  let listeners: Array<(v: T) => any>
  if (init != null) {
    v = init
  }
  function subscribe(v: (v: T) => any) {
    listeners.push(v)
  }
  let sig = <Signal<T>>function (t?: any) {
    if (t == null) {
      return v
    }
    v = t
    listeners.forEach(sub => sub(v))
  }
  sig.subscribe = subscribe
  return sig
}

class Future<A> {
  value: A
  state: Signal<ExecutionState>

  construct() {
    this.state = makeFutureSignal<ExecutionState>('Pending')
  }
}

export class Task<E, A> {
  computation: Computation<E, A>
  cleanup: Cleanup

  constructor(computation: Computation<E, A>, cleanup?: Cleanup) {
    this.computation = computation
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
      return this.computation(reject, b => resolve(fun(b)))
    }, this.cleanup)
  }

  chain<T>(fun: (a: A) => Task<E, T>): Task<E, T> {
    return new Task((reject: Handler<E>, resolve: Handler<T>) => {
      return this.computation(reject, b => {
        return fun(b).computation(reject, resolve)
      })
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
}
