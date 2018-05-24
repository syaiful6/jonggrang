import { Writable } from 'stream';

import * as SM from '@jonggrang/object';
import * as T from '@jonggrang/task';


export function smInsertTuple<K extends string, A>(pair: [K, A], sm: SM.StrMap<K, A>): SM.StrMap<K, A> {
  return SM.insert(pair[0], pair[1], sm);
}

export function identity<A>(a: A): A {
  return a;
}

export function writeSock<W extends Writable>(writable: W, buffer: Buffer): T.Task<void> {
  return T.makeTask({
    writable,
    buffer,
    handle: handleWriteSock,
    cancel: doNothingTask
  } as T.Computation<void>);
}

export function endSock<W extends Writable>(writable: W): T.Task<void> {
  return T.liftEff(writable, writable.end);
}

function doNothingTask() {
  return T.pure(void 0);
}

function handleWriteSock<W extends Writable>(this: { writable: W, buffer: Buffer }, cb: T.NodeCallback<void, void>) {
  if (!this.writable.write(this.buffer)) {
    return this.writable.once('drain', cb);
  }
  return process.nextTick(cb);
}
