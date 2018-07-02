import * as AV from '@jonggrang/avar';
import * as T from '@jonggrang/task';
import * as P from '@jonggrang/prelude';


/**
 * A quantity semaphore in which operations may 'wait' for or 'signal' single units
 * of value.
 */
export interface MSem {
  quantityStore: AV.AVar<number>;
  queueWait: AV.AVar<void>;
  headWait: AV.AVar<void>;
}

/**
 * 'newMSem' allows positive, zero, and negative initial values.
 * @param initial
 */
export function newMSem(initial: number): T.Task<MSem> {
  return AV.newAVar(initial)
    .chain(qty =>
      AV.newAVar(void 0)
        .chain(queue =>
          AV.newEmptyAVar.map(head => createMSem(qty, queue, head))
        )
    );
}

export function waitMSem(msem: MSem): T.Task<void> {
  return AV.withAVar(msem.queueWait, () =>
    AV.modifyAVar_(msem.quantityStore, quantity =>
      AV.tryTakeAVar(msem.headWait).chain(mayGrab =>
        P.isJust(mayGrab) ? T.pure([quantity, T.pure(void 0)] as [number, T.Task<void>])
          : 0 < quantity ? T.pure([quantity - 1, T.pure(void 0)] as [number, T.Task<void>])
            : /* otherwise */ T.pure([quantity, AV.takeAVar(msem.headWait)] as [number, T.Task<void>])
      )
    ).chain(P.identity)
  );
}

export function signalMSem(msem: MSem): T.Task<void> {
  return AV.modifyAVar(msem.quantityStore, quantity =>
    quantity < 0
      ? T.pure(quantity + 1)
      : AV.tryPutAVar(msem.headWait, void 0)
          .chain(didPlace => T.pure(didPlace ? quantity : quantity + 1))
  );
}

export function withMSem<A>(msem: MSem, task: T.Task<A>): T.Task<A> {
  return T.bracket_(waitMSem(msem), signalMSem(msem), task);
}

export function peekAvail(msem: MSem) {
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
function createMSem(qty: AV.AVar<number>, wait: AV.AVar<void>, head: AV.AVar<void>): MSem {
  return { quantityStore: qty, queueWait: wait, headWait: head };
}

