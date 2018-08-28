/**
 * This module provides the ability to create reapers: dedicated cleanup `threads`. These
 * `threads` will automatically spawn and die based on the presence of a workload to process on.
 * Example uses:
 * - Killing long-running jobs
 * - Closing unused connections in a connection pool
 * - Pruning a cache of old items
 */

import { identity } from '@jonggrang/prelude';
import * as T from '@jonggrang/task';
import * as R from '@jonggrang/ref';


export interface ReaperSettings<W, I> {
  action: (workload: W) => T.Task<(workload: W) => W>;
  delay: number; // number in miliseconds
  cons: (item: I, workload: W) => W;
  isNull: (workload: W) => boolean;
  empty: W;
}

export interface Reaper<W, I> {
  add: (i: I) => T.Task<void>;
  read: T.Task<W>;
  stop: T.Task<W>;
  kill: T.Task<void>;
}

export const enum StateType {
  NOREAPER,
  WORKLOAD
}

export type State<W>
  = { tag: StateType.NOREAPER }
  | { tag: StateType.WORKLOAD, workload: W };

export function mkReaper<W, I>(
  settings: ReaperSettings<W, I>
): T.Task<Reaper<W, I>> {
  return R.newRef<State<W>>({ tag: StateType.NOREAPER })
    .chain(stateRef =>
      R.newRef<T.Fiber<void> | undefined>(void 0).map(tidRef =>
        ({ add: addItem(settings, stateRef, tidRef)
        , read: readState(stateRef, settings.empty)
        , stop: stopReaper(stateRef, settings.empty)
        , kill: killReaper(tidRef)
        })
      )
    );
}

function addItem<W, I>(
  settings: ReaperSettings<W, I>,
  stateRef: R.Ref<State<W>>,
  tidRef: R.Ref<T.Fiber<void> | undefined>
) {
  return (item: I) => {
    function cons(s: State<W>): [State<W>, T.Task<void>] {
      let wl: W;
      if (s.tag === StateType.NOREAPER) {
        wl = settings.cons(item, settings.empty);
        return [{ tag: StateType.WORKLOAD, workload: wl }, spawn(settings, stateRef, tidRef)];
      }
      wl = settings.cons(item, s.workload);
      return [{ tag: StateType.WORKLOAD, workload: wl }, T.pure(void 0)];
    }
    return R.modifyRef_(stateRef, cons)
      .chain(identity);
  };
}

function spawn<W, I>(
  settings: ReaperSettings<W, I>,
  stateRef: R.Ref<State<W>>,
  tidRef: R.Ref<T.Fiber<void> | undefined>
): T.Task<void> {
  return T.forkTask(reaper(settings, stateRef, tidRef))
    .chain(fib => R.writeRef(tidRef, fib));
}

function reaper<W, I>(
  settings: ReaperSettings<W, I>,
  stateRef: R.Ref<State<W>>,
  tidRef: R.Ref<T.Fiber<void> | undefined>
) {
  function swapWithEmpty(s: State<W>): [State<W>, W] {
    if (s.tag === StateType.NOREAPER) {
      throw new Error('unexpected NoReaper (1)');
    }
    return [{ tag: StateType.WORKLOAD, workload: settings.empty }, s.workload ];
  }
  function check(merge: (_: W) => W, s: State<W>): [State<W>, T.Task<void>] {
    if (s.tag === StateType.NOREAPER) {
      throw new Error('unexpected NoReaper (2)');
    }
    let wl = merge(s.workload);
    return settings.isNull(wl)
      ? [{ tag: StateType.NOREAPER }, R.writeRef(tidRef, void 0)]
      : [{ tag: StateType.WORKLOAD, workload: wl }, reaper(settings, stateRef, tidRef) ];
  }
  return T.delay(settings.delay).chain(() =>
      R.modifyRef_(stateRef, swapWithEmpty))
    .chain(wl =>
      settings.action(wl))
    .chain(merge => R.modifyRef_(stateRef, s => check(merge, s)))
    .chain(identity);
}

function readState<W>(s: R.Ref<State<W>>, empty: W) {
  return R.readRef(s).map(v =>
    v.tag === StateType.NOREAPER ? empty : v.workload
  );
}

function stopReaper<W>(
  s: R.Ref<State<W>>,
  empty: W
): T.Task<W> {
  return R.modifyRef_(s, mx =>
    mx.tag === StateType.NOREAPER
      ? [{ tag: StateType.NOREAPER } as State<W>, empty ]
      : [{ tag: StateType.WORKLOAD, workload: empty } as State<W>, mx.workload ]
  );
}

function killReaper(
  tidRef: R.Ref<T.Fiber<void> | undefined>
): T.Task<void> {
  return R.readRef(tidRef).chain(fib =>
    fib == null ? T.pure(void 0) : T.killFiber(new Error('kill reaper'), fib));
}
