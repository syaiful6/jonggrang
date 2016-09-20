import { asap } from './_asap'
import {
  Computation, Handler, Listener, ExecutionState, ChainRecResult,
  TaskExecution as ITaskExecution, Resolved, Rejected, Cancelled
} from './interfaces'

function noop() { }

function nextRec<T>(value: T): ChainRecResult<T> {
  return {
    done: false,
    value: value
  }
}

function doneRec<T>(value: T): ChainRecResult<T> {
  return {
    done: true,
    value: value
  }
}

export type ChainRecFn<L, R> = {
  (next: (value: R) => ChainRecResult<R>, done: (value: R) => ChainRecResult<R>, v: R): Task<L, ChainRecResult<R>>
}

function generatorStep(n: any, d: any, last: any) {
  let { next } = last
  let { done, value } = next(last.value)
  return done
    ? value.map(d)
    : value.map((x: any) => n({ value: x, next: next }))
}

export class Task<E, A> {
  private _computation: Computation<E, A>
  private _cleanup: (resource: any) => void
  private _onCancel: (resource: any) => void

  constructor(
    computation: Computation<E, A>,
    onCancel?: (resource: any) => void,
    onCleanup?: (resource: any) => void
  ) {
    this._computation = computation
    this._cleanup = onCleanup || noop
    this._onCancel = onCancel || noop
  }

  /**
   * Put a value to a Task as it successful computation
   */
  static of<A>(value: A): Task<never, A> {
    return new Task((_: Handler<never>, resolve: Handler<A>) => {
      return resolve(value)
    })
  }

  of<A>(value: A): Task<never, A> {
    return Task.of(value)
  }

  map<T>(fn: (a: A) => T): Task<E, T> {
    return new Task((reject: Handler<E>, resolve: Handler<T>, cancel:() => void) => {
      this.run().listen({
        resolved: v => resolve(fn(v)),
        rejected: reject,
        cancelled: cancel
      })
    })
  }

  chain<Er, T>(transform: (a: A) => Task<E, T>): Task<Er | E, T> {
    return new Task((reject: Handler<E | Er>, resolve: Handler<T>, cancel: () => void) => {
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

  static chainRec<L, R>(func: ChainRecFn<L, R>, initial: R): Task<L, R> {
    return new Task((reject: Handler<L>, resolve: Handler<R>, cancel: () => void) => {
      function step(result: ChainRecResult<R>) {
        if (result.done) {
          resolve(result.value)
          return
        }
        let item = func(nextRec, doneRec, result.value)
        if (item) {
          item.run().listen({
            resolved: latern,
            cancelled: cancel,
            rejected: reject
          })
        }
      }
      function latern(v: ChainRecResult<R>) {
        asap(step, v)
      }
      step(nextRec(initial))
    })
  }

  static do(func: GeneratorFunction): Task<any, any> {
    let gen = func()
    const next = (x: any) => gen.next(x)
    return Task.chainRec(generatorStep, {value: undefined, next: next})
  }

  ap<Er, T>(other: Task<Er, (v: A) => T>): Task<Er | E, T> {
    return new Task((reject: Handler<E | Er>, resolve: Handler<T>, cancel: () => void) => {
      let f: (v: A) => T
      let x: A
      let otherOk: number
      let thisOk: number
      let ko: number

      const guardReject = (x: E | Er) => ko || (ko = 1, reject(x))
      const guardFn = (fun: (v: A) => T) => {
        if (!thisOk) return void (otherOk = 1, f = fun)
        return resolve(fun(x))
      }
      const guardValue = (v: A) => {
        if (!otherOk) return void (thisOk = 1, x = v)
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

  and<E1, A1>(other: Task<E1, A1>): Task<E | E1, [A, A1]> {
    return new Task((reject: Handler<E | E1>, resolve: Handler<[A, A1]>, cancel: () => void) => {
      let thisExec = this.run()
      let otherExec = other.run()
      let valueLeft: A
      let valueRight: A1
      let doneLeft: number
      let doneRight: number
      let cancelled: number

      const guardReject = (x: E | E1) => cancelled || (cancelled = 1, reject(x))
      const guardRight = (v: A1) => {
        if (!doneLeft) return void (doneRight = 1, valueRight = v)
        return resolve([valueLeft, v])
      }
      const guardLeft = (v: A) => {
        if (!doneRight) return void (doneLeft = 1, valueLeft = v)
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

  run(): ITaskExecution<E, A> {
    let deferred = new Deferred<E, A>()
    let resource = this._computation(
      (error: E) => deferred.reject(error),
      (value: A) => deferred.resolve(value),
      ()         => deferred.cancel()
    )
    // clean up resource
    deferred.listen({
      cancelled: () => (asap(this._onCancel, resource), asap(this._cleanup, resource)),
      resolved:  () => asap(this._cleanup, resource),
      rejected:  () => asap(this._cleanup, resource)
    })
    return new TaskExecution(deferred)
  }
}

class TaskExecution<E, A> {

  constructor(private _deferred: Deferred<E, A>) {
  }

  /**
   * Cancel the Task if possible.
   *
   * Returns True if the Task was cancelled, False otherwise. A Task can't be cancelled
   * when it already settled their result.
   */
  cancel(): boolean {
    return this._deferred.cancel()
  }

  listen(pattern: Listener<E, A>): void {
    this._deferred.listen({
      cancelled: pattern.cancelled || noop,
      resolved : pattern.resolved  || noop,
      rejected : pattern.rejected  || noop
    })
  }

  promise() {
    return this._deferred.promise()
  }
}

class Deferred<E, A> {
  private _state: ExecutionState<E, A> | undefined
  private _length: number
  [key: number]: any
  constructor() {
    this._state = undefined
    this._length = 0
  }

  resolve(value: A) {
    return this._state instanceof Resolved ? true : this._moveState(new Resolved(value))
  }

  reject(reason: E) {
    return this._state instanceof Rejected ? true: this._moveState(new Rejected(reason))
  }

  cancel() {
    return this._state instanceof Cancelled ? true : this._moveState(new Cancelled())
  }

  listen(pattern: Listener<E, A>) {
    if (typeof this._state === 'undefined') {
      this._addListener(pattern)
      return
    }
    this._state.matchWith({
      Cancelled: pattern.cancelled,
      Resolved : pattern.resolved,
      Rejected : pattern.rejected
    })
  }

  promise(): Promise<A> {
    return new Promise((resolve, reject) => {
      this.listen({
        resolved:  resolve,
        cancelled: reject,
        rejected:  reject
      })
    })
  }

  private _moveState(newState: ExecutionState<E, A>) {
    if (typeof this._state !== 'undefined') return false
    this._state = newState
    if (this._length > 0) this._notifyListener()
    return true
  }

  private _addListener(pattern: Listener<E, A>) {
    let index = this._length
    this._length++
    this[index] = pattern
  }

  private _notifyListener() {
    let length = this._length
    this._length = 0
    let item: any
    for (let i = 0; i < length; i++) {
      item = this[i]
      this.listen(item)
      this[i] = undefined
    }
  }
}

function cancelExecutions(executions: Array<TaskExecution<any, any>>) {
  for (let i = 0; i < executions.length; i++) {
    executions[i].cancel()
  }
}

