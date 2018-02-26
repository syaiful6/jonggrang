import { Writable } from 'stream';

import * as SM from '@jonggrang/object';
import * as T from '@jonggrang/task';

export function smInsertTuple<K extends string, A>(pair: [K, A], sm: SM.StrMap<K, A>): SM.StrMap<K, A> {
  return SM.insert(pair[0], pair[1], sm);
}

export function identity<A>(a: A): A {
  return a;
}

export function writeSock<W extends Writable>(writable: W, buf: Buffer): T.Task<void> {
  return T.makeTask(cb => {
    if (!writable.write(buf)) {
      writable.once('drain', cb);
    } else {
      process.nextTick(cb);
    }
    return T.nonCanceler;
  });
}

export function endSock<W extends Writable>(writable: W): T.Task<void> {
  return T.liftEff(() => {
    writable.end();
  });
}
