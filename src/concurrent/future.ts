import { asap } from './_asap'

export enum STATE {
  PENDING
  , REJECTED
  , RESOLVED
  , CANCELLED
}

export interface Listener<E, A> {
  resolved?: (v: A) => void
  rejected?: (e: E) => void
  cancelled?: () => void
}

export class Future<E, A> {
  _state: STATE
  _pending: Array<Listener<E, A>>
  _value: E | A | undefined
  
  constructor() {
    this._state = STATE.PENDING
    this._value = undefined
    this._pending = []
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
    this.case({
      cancelled: () => cancelFuture(result)
      , rejected: reason => rejectFuture(result, reason)
      , resolved: value => {
        transformation(value).case({
          cancelled: () => cancelFuture(result)
          , rejected: reason => rejectFuture(result, reason)
          , resolved: v => fulfilFuture(result, v)
        })
      }
    })
    return result
  }

  orElse<T>(handler: (e: E) => Future<T, A>): Future<T, A> {
    let result = new Future<T, A>()
    this.case({
      cancelled: () => cancelFuture(result)
      , resolved: value => fulfilFuture(result, value)
      , rejected: er => {
        handler(er).case({
          cancelled: () => cancelFuture(result)
          , rejected: reason => rejectFuture(result, reason)
          , resolved: value => fulfilFuture(result, value)
        })
      }
    })
    return result
  }

  map<T>(transformation: (v: A) => T): Future<E, T> {
    return this.chain<T>(function (v) {
      return Future.success(transformation(v))
    })
  }

  case(pattern: Listener<E, A>) {
    switch (this._state) {
      case STATE.PENDING:
        this._pending.push(pattern)
        break
      case STATE.REJECTED:
        if (typeof pattern.rejected === 'function') {
          pattern.rejected(this._value as E)
        }
        break
      case STATE.RESOLVED:
        if (typeof pattern.resolved === 'function') {
          pattern.resolved(this._value as A)
        }
        break
      case STATE.CANCELLED:
        if (typeof pattern.cancelled === 'function') {
          pattern.cancelled()
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
  // invoke all pending pattern
  future._pending.forEach(function (pattern) {
    future.case(pattern)
  })
  future._pending = []
}

export function cancelFuture(future: Future<any, any>) {
  if (future._state !== STATE.PENDING) return
  future._state = STATE.CANCELLED
  future._value = undefined
  if (future._pending.length !== 0) asap(publish, future)
}

export function fulfilFuture<E, A>(future: Future<E, A>, value: A) {
  if (future._state !== STATE.PENDING) return
  future._state = STATE.RESOLVED
  future._value = value
  if (future._pending.length !== 0) asap(publish, future)
}

export function rejectFuture<E, A>(future: Future<E, A>, value: E) {
  if (future._state !== STATE.PENDING) return
  future._state = STATE.REJECTED
  future._value = value
  if (future._pending.length !== 0) asap(publish, future)
}