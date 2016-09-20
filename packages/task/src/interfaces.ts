/**
 * -- Utility
*/
export type Handler<T> = {
  (input: T): void
}

/**
 * Interface for computation of Task. It's a function that take 3 functions. The
 * first/left one is for error case, the second arguments is for success case. Third
 * arguments is for cancelled the task.
 */
export interface Computation<L, R> {
  (error: Handler<L>, success: Handler<R>, cancel: () => void): any
}

/**
 * Basically this is same shape as IteratorResult interface. We use this for ChainRec
 * implementation. This same shape as iterator make our chainRec compatible with any
 * iterator, in other word you can pass iterator next method on our chainRec function.
 */
export interface ChainRecResult<T> {
  done: boolean
  value: T
}

/**
 * Interface for listener that want to observer the results of task.
 */
export interface Listener<L, R> {
  resolved:  (value: R) => void
  rejected:  (reason: L) => void
  cancelled: () => void
}

/**
 * This object returned when you call method run on Task, it let you to cancel it,
 * transform them to promise, and of course observe the result using listen method.
 *
 * The cancel method return boolean indicate it able to cancel it or not. The Task
 * can't be cancelled when it already fulfilled or settled it result, meaning the
 * task already complete.
 *
 * Listen method take LooseListener interface, so if you only interested on resolved
 * case you can give it an object with `resolved property` value to your handler.
 */
export interface TaskExecution<L, R> {
  cancel(): boolean
  promise(): Promise<R>
  listen(pattern: Listener<L, R>): void
}

/**
 * -- internal, this one to simulate ADT | union
 */
export interface StatePattern<L, R> {
  Resolved : (value: R) => void
  Rejected : (reason: L) => void
  Pending  : () => void
  Cancelled: () => void
}

export interface ExecutionState<L, R> {
  matchWith(pattern: StatePattern<L, R>): void
}

export class Pending<E, A> implements ExecutionState<any, any> {
  matchWith(pattern: StatePattern<E, A>) {
    pattern.Pending()
  }
}

export class Cancelled implements ExecutionState<any, any> {
  matchWith(pattern: StatePattern<any, any>) {
    pattern.Cancelled()
  }
}

export class Resolved<R> implements ExecutionState<any, R> {
  constructor(private value: R) {
  }
  matchWith(pattern: StatePattern<any, R>) {
    pattern.Resolved(this.value)
  }
}

export class Rejected<L> implements ExecutionState<L, any> {
  constructor(private value: L) {
  }
  matchWith(pattern: StatePattern<L, any>) {
    pattern.Rejected(this.value)
  }
}
