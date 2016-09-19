import { asap } from './_asap'

export type Handler<T> = {
  (v: T): void
}

export type Computation<E, A> = {
  (error: Handler<E>, success: Handler<A>, cancel?: () => void): any
}

export interface Listener<E, A> {
  resolved?: Handler<A>
  rejected?: Handler<E>
  cancelled?: () => void
}

export interface StatePattern<E, A> extends Listener<E, A> {
  pending?: () => void
}

interface ExecutionState<E, A> {
  matchWith: (pattern: StatePattern<E, A>) => any
}

class Pending implements ExecutionState<any, any> {
  matchWith(pattern: StatePattern<any, any>): void {
    if (typeof pattern.pending === 'function') {
      pattern.pending()
    }
  }
}

class Cancelled implements ExecutionState<any, any> {
  matchWith(pattern: StatePattern<any, any>) {
    if (typeof pattern.cancelled === 'function') {
      pattern.cancelled()
    }
  }
}

class Resolved<S> implements ExecutionState<any, S> {
  private value: S

  constructor(value: S) {
    this.value = value
  }

  matchWith(pattern: StatePattern<any, S>) {
    if (typeof pattern.resolved === 'function') {
      pattern.resolved(this.value)
    }
  }
}

class Rejected<E> implements ExecutionState<E, any> {
  private reason: E

  constructor(reason: E) {
    this.reason = reason
  }

  matchWith(pattern: StatePattern<E, any>) {
    if (typeof pattern.rejected === 'function') {
      pattern.rejected(this.reason)
    }
  }
}

function noop() {}

export class CoreTask<E, A> {
  private _computation: Computation<E, A>
  private _cleanup: (resource: any) => void
  private _onCancel: (resource: any) => void

  constructor(computation: Computation<E, A>, onCancel?: (resource: any) => void, onCleanup?: (resource: any) => void) {
    this._computation = computation
    this._cleanup = onCleanup || noop
    this._onCancel = onCancel || noop
  }

  /**
   * Put a value to a Task as it successful computation
   */
  static of<A>(value: A): CoreTask<never, A> {
    return new CoreTask((_: Handler<never>, resolve: Handler<A>) => {
      return resolve(value)
    })
  }

  of<A>(value: A): CoreTask<never, A> {
    return CoreTask.of(value)
  }

  map<T>(fn: (a: A) => T): CoreTask<E, T> {
    return new CoreTask((reject: Handler<E>, resolve: Handler<T>, cancel:() => void) => {
      this.run().listen({
        resolved: v => resolve(fn(v)),
        rejected: reject,
        cancelled: cancel
      })
    })
  }

  chain<Er, T>(transform: (a: A) => CoreTask<E, T>): CoreTask<Er | E, T> {
    return new CoreTask((reject: Handler<E | Er>, resolve: Handler<T>, cancel: () => void) => {
      this.run().listen({
        rejected: reject,
        cancelled: cancel,
        resolved: v => {
          return transform(v).run().listen({
            rejected: reject,
            cancelled: cancel,
            resolved: resolve
          })
        }
      })
    })
  }

  ap<Er, T>(other: CoreTask<Er, (v: A) => T>): CoreTask<Er | E, T> {
    return new CoreTask((reject: Handler<E | Er>, resolve: Handler<T>, cancel: () => void) => {
      let f: (v: A) => T
      let x: A
      let otherOk: number
      let thisOk: number
      let ko: number

      const guardReject = (x: E | Er) => ko || (ko = 1, reject(x))
      const guardFn = (fun: (v: A) => T) => {
        if (!thisOk) return (otherOk = 1, f = fun)
        return resolve(fun(x))
      }
      const guardValue = (v: A) => {
        if (!otherOk) return (thisOk = 1, x = v)
        return resolve(f(v))
      }

      let thisExec = this.run()
      let thatExec = other.run()

      thisExec.listen({
        rejected: guardReject,
        resolved: guardValue,
        cancelled: cancel
      })
      thatExec.listen({
        rejected: guardReject,
        resolved: guardFn,
        cancelled: cancel
      })

      return [thisExec, thatExec]
    }, cancelExecutions)
  }

  and<E1, A1>(other: CoreTask<E1, A1>): CoreTask<E | E1, [A, A1]> {
    return new CoreTask((reject: Handler<E | E1>, resolve: Handler<[A, A1]>, cancel: () => void) => {
      let thisExec = this.run()
      let otherExec = other.run()
      let valueLeft: A
      let valueRight: A1
      let doneLeft: number
      let doneRight: number
      let cancelled: number

      const guardReject = (x: E | E1) => cancel || (cancelled = 1, reject(x))
      const guardRight = (v: A1) => {
        if (!doneLeft) return (doneRight = 1, valueRight = v)
        return resolve([valueLeft, v])
      }
      const guardLeft = (v: A) => {
        if (!doneRight) return (doneLeft = 1, valueLeft = v)
        return resolve([v, valueRight])
      }
      thisExec.listen({
        rejected: guardReject,
        resolved: guardLeft,
        cancelled: cancel
      })
      otherExec.listen({
        rejected: guardReject,
        resolved: guardRight,
        cancelled: cancel
      })
      return [thisExec, otherExec]
    }, cancelExecutions)
  }

  run() {
    let deferred = new Deferred<E, A>()
    let resource = this._computation(
      (error: E) => deferred.reject(error),
      (value: A) => deferred.resolve(value),
      () => deferred.cancel()
    )
    // clean up resource
    deferred.listen({
      cancelled: () => (asap(this._cleanup, resource), asap(this._cleanup, resource)),
      resolved: () => asap(this._cleanup, resource),
      rejected: () => asap(this._cleanup, resource)
    })
    return new TaskExecution(deferred)
  }
}

export class TaskExecution<E, A> {
  constructor(private _deferred: Deferred<E, A>) {
    this._deferred = _deferred
  }

  cancel() {
    this._deferred.cancel()
  }

  listen(pattern: StatePattern<E, A>) {
    this._deferred.listen(pattern)
  }

  promise() {
    return this._deferred.promise()
  }
}

export class Deferred<E, A> {
  private _state: ExecutionState<E, A>
  private _pending: Array<Listener<E, A>>

  constructor() {
    this._state = new Pending()
    this._pending = []
  }

  resolve(value: A) {
    this._moveState(new Resolved(value))
  }

  reject(reason: E) {
    this._moveState(new Rejected(reason))
  }

  cancel() {
    this._moveState(new Cancelled())
  }

  listen(pattern: StatePattern<E, A>) {
    this._state.matchWith({
      pending: () => this._pending.push(pattern),
      cancelled: pattern.cancelled,
      resolved: pattern.resolved,
      rejected: pattern.rejected
    })
  }

  promise(): Promise<A> {
    return new Promise((resolve, reject) => {
      this.listen({
        resolved: resolve,
        cancelled: reject,
        rejected: reject
      })
    })
  }

  private _moveState(newState: ExecutionState<E, A>) {
    // dont allow move the state, if current state !== Pending, so it can be resolved
    // rejected, cancelled only once
    if (!(this._state instanceof Pending)) return
    let len = this._pending.length
    let pending = this._pending
    for (let i = 0; i < len; i++) {
      this.listen(pending[i])
    }
    this._state = newState
    this._pending = []
  }
}

function cancelExecutions(executions: Array<TaskExecution<any, any>>) {
  executions.forEach(ex => ex.cancel())
}

export interface TaskConstructor<E, A> {
  (computation: Computation<E, A>, onCancel?: (resource: any) => void, onCleanup?: (resource: any) => void): CoreTask<E, A>
  new (computation: Computation<E, A>, onCancel?: (resource: any) => void, onCleanup?: (resource: any) => void): CoreTask<E, A>
  of<V>(v: V): CoreTask<never, V>
}

export let Task = <TaskConstructor<any, any>>function Task<E, A>(computation: Computation<E, A>, onCancel?: (resource: any) => void, onCleanup?: (resource: any) => void) {
  return new CoreTask(computation, onCancel, onCleanup)
}

Task.of = CoreTask.of
