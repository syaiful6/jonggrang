import * as AV from '@jonggrang/avar';
import * as T from '@jonggrang/task';
import * as P from '@jonggrang/prelude';


/**
 * 'QSem' is a quantity semaphore in which the resource is aqcuired
 * and released in units of one. It provides guaranteed FIFO ordering
 * for satisfying blocked `waitQSem` calls. If 'with' is used to guard
 * a critical section then no quantity of the semaphore will be lost if
 * the activity throws an exception or if this thread is killed by the
 * rest of the program.
 */
export interface QSem {
  quantityStore: AV.AVar<number>;
  queueWait: AV.AVar<void>;
  headWait: AV.AVar<void>;
}

/**
 * 'newQSem' allows positive, zero, and negative initial values.
 * The only way to achieve a negative value with QSem is to start negative
 * with `newQSem`. Once a negative quantity becomes non-negative
 * by use of 'signal' it will never later be negative.
 * @param initial The initial value of QSem
 */
export function newQSem(initial: number): T.Task<QSem> {
  return AV.newAVar(initial)
    .chain(qty =>
      AV.newAVar(void 0)
        .chain(queue =>
          AV.newEmptyAVar.map(head => createQSem(qty, queue, head))
        )
    );
}

/**
 * 'waitQSem' will take one unit of value from the sempahore, but will block
 * if the quantity available is not positive.
 * If 'waitQSem' returns normally (not interrupted) then it left the 'QSem'
 * with a remaining quantity that was greater than or equal to zero.
 * If 'waitQSem' is interrupted (killed with killFiber) then no quantity is lost.
 * If 'waitQSem' returns without interruption then it is known that each earlier
 * waiter has definitely either been interrupted or has retured without interruption
 * (the FIFO guarantee).
 * @param qsem QSem to wait until it available
 */
export function waitQSem(qsem: QSem): T.Task<void> {
  return AV.withAVar(qsem.queueWait, () =>
    AV.modifyAVar_(qsem.quantityStore, quantity =>
      AV.tryTakeAVar(qsem.headWait).chain(mayGrab =>
        P.isJust(mayGrab) ? T.pure([quantity, T.pure(void 0)] as [number, T.Task<void>])
          : 0 < quantity ? T.pure([quantity - 1, T.pure(void 0)] as [number, T.Task<void>])
            : /* otherwise */ T.pure([quantity, AV.takeAVar(qsem.headWait)] as [number, T.Task<void>])
      )
    ).chain(P.identity)
  );
}

/**
 * 'signalQSem' adds one unit to the sempahore. Overflow is not checked.
 * 'signalQSem' may block, but it cannot be killed, which allows it to
 * dependably restore value to the 'QSem'. All 'signalQSem', 'peekAvailQSem',
 * and the head waiter may momentarily block in a fair FIFO manner.
 * @param qsem The target QSem to send signal
 */
export function signalQSem(qsem: QSem): T.Task<void> {
  return T.invincible(AV.modifyAVar(qsem.quantityStore, quantity =>
    quantity < 0
      ? T.pure(quantity + 1)
      : AV.tryPutAVar(qsem.headWait, void 0)
          .chain(didPlace =>
            T.pure(didPlace ? quantity : quantity + 1))));
}

/**
 * 'withQSem' takes a unit of value from the semaphore to hold while performing
 * the provided `Task<A>`. 'withQSem' ensures the quantity of the sempahore cannot
 * be lost if there are exceptions or if `killFiber` is used.
 * @param qsem QSem
 * @param task The operation to execute
 */
export function withQSem<A>(qsem: QSem, task: T.Task<A>): T.Task<A> {
  return T.bracket_(waitQSem(qsem), signalQSem(qsem), task);
}

/**
 * 'peekAvailQSem' skips the queue of any blocked 'waitQSem' threads,
 * but may momentarily block on `signalQSem`, other 'peekAvailQSem', and the head waiter.
 * This returns the amount of value available to be taken.
 * @param msem QSem
 */
export function peekAvailQSem(msem: QSem): T.Task<number> {
  return AV.withAVar(msem.quantityStore, quantity =>
    AV.tryTakeAVar(msem.headWait).chain(extraFlags =>
      P.isNothing(extraFlags) ? T.pure(quantity)
        : /* otherwise */ AV.putAVar(msem.headWait, void 0).map(() => quantity + 1)
    )
  );
}

/**
 * Internal function for create MSeM
 * @param qty
 * @param wait
 * @param head
 */
function createQSem(qty: AV.AVar<number>, wait: AV.AVar<void>, head: AV.AVar<void>): QSem {
  return { quantityStore: qty, queueWait: wait, headWait: head };
}

