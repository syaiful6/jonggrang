import { asap } from './_asap'

export enum STATE {
  PENDING
  , REJECTED
  , RESOLVED
  , CANCELLED
}

export interface Listener<E, A> {
  success?: (v: A) => void
  failure?: (e: E) => void
  cancelled?: () => void
  [key: string]: any
  [key: number]: any
}

export class Future<E, A> {
  _state: STATE
  _pending: any[]
  _length: number
  _value: E | A | undefined
  
  constructor() {
    this._state = STATE.PENDING
    this._value = undefined
    this._pending = []
    this._length = 0
  }

  static success<T>(val: T): Future<any, T> {
    let result = new Future() as Future<any, T>
    result._value = val
    result._state = STATE.RESOLVED
    return result
  }

  static failure<T>(err: T): Future<T, any> {
    let result = new Future() as Future<T, any>
    result._value = err
    result._state = STATE.REJECTED
    return result
  }

  chain<T>(transformation: (v: A) => Future<any, T>): Future<E, T> {
    let result = new Future<E, T>()
    this.listen({
      cancelled: cancel
      , failure: reject
      , success: value => {
        transformation(value).listen({
          cancelled: cancel
          , failure: reject
          , success: fulfil
        }, result)
      }
    }, result)
    return result
  }

  orElse<E1, A1>(handler: (e: E) => Future<E1, A1>): Future<E1, A | A1> {
    let result = new Future<E1, A | A1>()
    this.listen({
      cancelled: cancel
      , success: fulfil
      , failure: er => {
        handler(er).listen({
          cancelled: cancel
          , failure: reject
          , success: fulfil
        }, result)
      }
    }, result)
    return result
  }

  map<T>(transformation: (v: A) => T): Future<E, T> {
    return this.chain<T>(function (v) {
      return Future.success(transformation(v))
    })
  }

  listen(pattern: Listener<E, A>, thisArgs?: any) {
    switch (this._state) {
      case STATE.PENDING:
        let index = this._length
        this._pending[index] = pattern
        this._pending[index + 1] = thisArgs
        this._length += 2
        break
      case STATE.REJECTED:
        if (typeof pattern.failure === 'function') {
          pattern.failure.call(thisArgs || pattern, this._value as E)
        }
        break
      case STATE.RESOLVED:
        if (typeof pattern.success === 'function') {
          pattern.success.call(thisArgs || pattern, this._value as A)
        }
        break
      case STATE.CANCELLED:
        if (typeof pattern.cancelled === 'function') {
          pattern.cancelled.call(thisArgs || pattern)
        }
        break
      default:
        throw new Error('invalid future state detected')
    }
  }

  toString() {
    switch (this._state) {
      case STATE.PENDING:
        return '<Future (pending)>'
      case STATE.CANCELLED:
        return '<Future (cancelled)'
      case STATE.REJECTED:
        return `<Future failure: ${this._value}>`
      case STATE.RESOLVED:
        return `<Future success: ${this._value}>`
      default:
        throw new Error('invalid state detected on future')
    }
  }
}

function publish<E, A>(future: Future<E, A>) {
  // invoke all pending pattern matching, then clear it
  let length = future._length
  let pending = future._pending
  for (let i = 0; i < length; i += 2) {
    future.listen(pending[i], pending[i + 1])
  }
  future._pending = []
  future._length = 0
}

export function cancelFuture(future: Future<any, any>) {
  if (future._state !== STATE.PENDING) return
  future._state = STATE.CANCELLED
  future._value = undefined
  if (future._length !== 0) asap(publish, future)
}

export function fulfilFuture<E, A>(future: Future<E, A>, value: A) {
  if (future._state !== STATE.PENDING) return
  future._state = STATE.RESOLVED
  future._value = value
  if (future._length !== 0) asap(publish, future)
}

export function rejectFuture<E, A>(future: Future<E, A>, value: E) {
  if (future._state !== STATE.PENDING) return
  future._state = STATE.REJECTED
  future._value = value
  if (future._length !== 0) asap(publish, future)
}

export function cancel(this: Future<any, any>) {
  cancelFuture(this)
}

export function reject<E, A>(this: Future<E, A>, value: E) {
  rejectFuture(this, value)
}

export function fulfil<E, A>(this: Future<E, A>, value: A) {
  fulfilFuture(this, value)
}