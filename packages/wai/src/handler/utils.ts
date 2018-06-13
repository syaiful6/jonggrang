import { Writable } from 'stream';
import * as T from '@jonggrang/task';


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

function handleWriteSock<W extends Writable>(this: { writable: W, buffer: Buffer }, cb: T.NodeCallback<void>) {
  if (!this.writable.write(this.buffer)) {
    return this.writable.once('drain', cb);
  }
  return process.nextTick(cb);
}

export function hashStr(str: string): number {
  let hash = 5381;
  let i    = str.length;

  while (i) {
    hash = (hash * 33) ^ str.charCodeAt(--i);
  }

  return hash >>> 0;
}
