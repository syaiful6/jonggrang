import * as T from '@jonggrang/task';
import * as P from '@jonggrang/prelude';
import * as RV from '@jonggrang/ref';
import * as SM from '@jonggrang/object';

import * as FS from './fs-task';
import { Reaper, mkReaper } from './reaper';
import { smInsertTuple } from './utils';

export const enum Status {
  ACTIVE,
  INACTIVE
}

export type MutableStatus = RV.Ref<Status>;

export function status(ms: MutableStatus): T.Task<Status> {
  return RV.readRef(ms);
}

export const newActiveStatus: T.Task<MutableStatus> = RV.newRef(Status.ACTIVE);

export function refresh(ms: MutableStatus): T.Task<void> {
  return RV.writeRef(ms, Status.ACTIVE);
}

export function inactive(ms: MutableStatus): T.Task<void> {
  return RV.writeRef(ms, Status.INACTIVE);
}

export interface FdEntry {
  readonly path: string;
  readonly fd: number;
  readonly status: MutableStatus;
}

export function fdEntry(path: string, fd: number, status: MutableStatus): FdEntry {
  return { path, fd, status };
}

export function openFile(path: string): T.Task<FS.Fd> {
  return FS.fdOpen(path, 'r', null);
}

export function closeFile(fd: FS.Fd) {
  return FS.fdClose(fd);
}

export function newFdEntry(path: string): T.Task<FdEntry> {
  return openFile(path).chain(fd =>
    newActiveStatus.map(status =>
      fdEntry(path, fd, status)));
}

type FdCache = SM.StrMap<string, FdEntry>;

type MutableFdCache = Reaper<FdCache, [string, FdEntry]>;

function fdCache(reaper: MutableFdCache): T.Task<FdCache> {
  return reaper.read;
}

function look(mfc: MutableFdCache, path: string): T.Task<P.Maybe<FdEntry>> {
  return fdCache(mfc)
    .map(fc =>
      P.chainMaybe(SM.lookup(path, fc), fd => validateEntry(fd, path)))
}

function validateEntry(fd: FdEntry, path: string): P.Maybe<FdEntry> {
  return fd.path === path ? P.just(fd) : P.nothing;
}

function initialize(delay: number): T.Task<MutableFdCache> {
  return mkReaper({
    delay,
    isNull: SM.isEmpty,
    empty: {},
    action: clean,
    cons: smInsertTuple
  })
}

function clean(old: FdCache): T.Task<(cache: FdCache) => FdCache> {
  return traverseStrMap(old, prune).map(x => filterMap(y => y, x))
    .chain(newMap => T.pure((xs: FdCache) => SM.union(newMap, xs)))
}

function terminate(md: MutableFdCache): T.Task<void> {
  return md.stop.chain(t => {
    return T.forInPar(SM.toPairs(t), ps => FS.fdClose(ps[1].fd))
  }).map(() => {});
}

function prune(fd: FdEntry): T.Task<P.Maybe<FdEntry>> {
  return status(fd.status)
    .chain(st =>
      st === Status.ACTIVE
        ? inactive(fd.status).then(T.pure(P.just(fd)))
        : FS.fdClose(fd.fd).then(T.pure(P.nothing))
    )
}

function filterMap<K extends string, V, W>(
  f: (_: V) => P.Maybe<W>,
  ms: SM.StrMap<K, V>
): SM.StrMap<K, W> {
  return SM.toPairs(ms).reduceRight((acc, pair) => {
    return SM.alter(_ => f(pair[1]), pair[0], acc);
  }, {} as SM.StrMap<K, W>);
}

function traverseStrMap<K extends string, A, B>(
  ms: SM.StrMap<K, A>,
  f: (_: A) => T.Task<B>
): T.Task<SM.StrMap<K, B>> {
  return SM.keys(ms).reduce((ta: T.Task<SM.StrMap<K, B>>, k) => {
    function set(o: SM.StrMap<K, B>) {
      return (v: B) => {
        let o2 = SM.singleton(k, v);
        return SM.union(o2, o)
      }
    }
    return ta.map(set).apply(f(ms[k]));
  }, T.pure({} as SM.StrMap<K, B>))
}

function foldStrMap<K extends string, A, B>(
  f: (b: B, a: A) => B,
  i: B,
  ta: SM.StrMap<K, A>
): B {
  let acc = i;
  function g(k: string, z: B) {
    return f(z, ta[k]);
  }
  for (let kx in ta) {
    if (Object.prototype.hasOwnProperty.call(ta, kx)) {
      acc = g(kx, acc);
    }
  }
  return acc;
}
