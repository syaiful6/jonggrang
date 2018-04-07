import * as T from '@jonggrang/task';
import * as AV from '@jonggrang/avar';
import * as R from '@jonggrang/ref';

import { identity } from './utils';


export interface Settings<W, I> {
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
  settings: Settings<W, I>
): T.Task<Reaper<W, I>> {
  return R.newRef<State<W>>({ tag: StateType.NOREAPER })
    .chain(stateRef =>
      R.newRef<T.Fiber<void> | undefined>(void 0).chain(tidRef =>
        AV.newAVar<void>(void 0)
          .map(lock =>
            ({ add: addItem(lock, settings, stateRef, tidRef)
             , read: readState(stateRef, settings.empty)
             , stop: stopReaper(lock, stateRef, settings.empty)
             , kill: killReaper(lock, tidRef)
            })
          )
      )
    );
}

function addItem<W, I>(
  lock: AV.AVar<void>,
  settings: Settings<W, I>,
  stateRef: R.Ref<State<W>>,
  tidRef: R.Ref<T.Fiber<void> | undefined>
) {
  return (item: I) => {
    function cons(s: State<W>): [State<W>, T.Task<void>] {
      let wl: W;
      if (s.tag === StateType.NOREAPER) {
        wl = settings.cons(item, settings.empty);
        return [{ tag: StateType.WORKLOAD, workload: wl }, spawn(lock, settings, stateRef, tidRef)];
      }
      wl = settings.cons(item, s.workload);
      return [{ tag: StateType.WORKLOAD, workload: wl }, T.pure(void 0)];
    }
    return AV.withAVar(lock, () => R.modifyRef_(stateRef, cons))
      .chain(identity);
  };
}

function spawn<W, I>(
  lock: AV.AVar<void>,
  settings: Settings<W, I>,
  stateRef: R.Ref<State<W>>,
  tidRef: R.Ref<T.Fiber<void> | undefined>
): T.Task<void> {
  return T.forkTask(reaper(lock, settings, stateRef, tidRef))
    .chain(fib => R.writeRef(tidRef, fib));
}

function reaper<W, I>(
  lock: AV.AVar<void>,
  settings: Settings<W, I>,
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
      : [{ tag: StateType.WORKLOAD, workload: wl }, reaper(lock, settings, stateRef, tidRef) ];
  }
  return T.delay(settings.delay).then(
      AV.withAVar(lock, () => R.modifyRef_(stateRef, swapWithEmpty)))
    .chain(wl =>
      settings.action(wl))
    .chain(merge => AV.withAVar(lock, () => R.modifyRef_(stateRef, s => check(merge, s))))
    .chain(identity);
}

function readState<W>(s: R.Ref<State<W>>, empty: W) {
  return R.readRef(s).map(v =>
    v.tag === StateType.NOREAPER ? empty : v.workload
  );
}

function stopReaper<W>(
  lock: AV.AVar<void>,
  s: R.Ref<State<W>>,
  empty: W
): T.Task<W> {
  return AV.withAVar(lock, () =>
    R.modifyRef_(s, mx =>
      mx.tag === StateType.NOREAPER
        ? [{ tag: StateType.NOREAPER } as State<W>, empty ]
        : [{ tag: StateType.WORKLOAD, workload: empty } as State<W>, mx.workload ]
    )
  );
}

function killReaper(
  lock: AV.AVar<void>,
  tidRef: R.Ref<T.Fiber<void> | undefined>
): T.Task<void> {
  return AV.withAVar(lock, () =>
    R.readRef(tidRef).chain(fib =>
      fib == null ? T.pure(void 0) : T.killFiber(new Error('kill reaper'), fib))
  );
}
