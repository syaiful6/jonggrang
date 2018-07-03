import * as AV from '@jonggrang/avar';
import * as T from '@jonggrang/task';
import * as P from '@jonggrang/prelude';


/**
 * A quantity semaphore in which operations may 'wait' for or 'signal' single units
 * of value.
 */
export interface QSem {
  quantityStore: AV.AVar<number>;
  queueWait: AV.AVar<void>;
  headWait: AV.AVar<void>;
}

/**
 * 'newQSem' allows positive, zero, and negative initial values.
 * @param initial
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

export function signalQSem(qsem: QSem): T.Task<void> {
  return T.invincible(AV.modifyAVar(qsem.quantityStore, quantity =>
    quantity < 0
      ? T.pure(quantity + 1)
      : AV.tryPutAVar(qsem.headWait, void 0)
          .chain(didPlace =>
            T.pure(didPlace ? quantity : quantity + 1))));
}

export function withQSem<A>(qsem: QSem, task: T.Task<A>): T.Task<A> {
  return T.bracket_(waitQSem(qsem), signalQSem(qsem), task);
}

export function peekAvailQSem(msem: QSem) {
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

