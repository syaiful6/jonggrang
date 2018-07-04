import * as AV from '@jonggrang/avar';
import * as T from '@jonggrang/task';


/**
 * An unbounded FIFO data structure for concurrent access.
 */
export interface Chan<A> {
  read: AV.AVar<ChanStream<A>>;
  write: AV.AVar<ChanStream<A>>;
}

export type ChanStream<A> = AV.AVar<ChanItem<A>>;

export interface ChanItem<A> {
  head: A;
  tail: ChanStream<A>;
}

class Channel<A> implements Chan<A> {
  constructor(
    readonly read: AV.AVar<ChanStream<A>>,
    readonly write: AV.AVar<ChanStream<A>>
  ) {
  }
}

class ChannelItem<A> {
  constructor(readonly head: A, readonly tail: ChanStream<A>) {
  }
}

/**
 * Creates a new `Chan`nel
 */
export const newChan: T.Task<Chan<any>> = AV.newEmptyAVar
  .chain((hole: ChanStream<any>) =>
    T.both(AV.newAVar(hole), AV.newAVar(hole))
      .map(([read, write]) => new Channel(read, write))
  );

/**
 * Writes a new value into the `Chan`.
 * @param chan
 * @param val
 */
export function writeChan<A>(chan: Chan<A>, val: A): T.Task<void> {
  return AV.newEmptyAVar
    .chain(newHole =>
      AV.takeAVar(chan.write)
        .chain(oldHole =>
          T.apSecond(
            AV.putAVar(oldHole, new ChannelItem(val, newHole)),
            AV.putAVar(chan.write, newHole)
          )
        )
    );
}

/**
 * Reads a value from the queue. Blocks if the queue is empty, and resumes
 * when it has been written to.
 * @param chan
 */
export function readChan<A>(chan: Chan<A>): T.Task<A> {
  return AV.modifyAVar_(chan.read, readEnd =>
    AV.readAVar(readEnd)
      .map(item => [item.tail, item.head] as [ChanStream<A>, A])
  );
}
