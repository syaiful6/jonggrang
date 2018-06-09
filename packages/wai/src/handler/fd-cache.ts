import * as FS from 'fs';

import * as T from '@jonggrang/task';
import * as P from '@jonggrang/prelude';
import * as RV from '@jonggrang/ref';
import * as SM from '@jonggrang/object';

import { Reaper, mkReaper } from '@jonggrang/auto-update';
import { smInsertTuple, identity } from './utils';


/**
 * An action to activate a Fd cache entry.
 */
export type Refresh = T.Task<void>;

/**
 * this is interface for function that take filepath and return a tuple of Maybe Fd and Refresh
 * action
 */
export interface GetFd {
  (path: string): T.Task<[P.Maybe<number>, Refresh]>;
}

/**
 * Creating 'MutableFdCache' and executing the action in the second
 * argument. The first argument is a cache duration in second.
 * @param duration number
 * @param action
 */
export function withFdCache<A>(duration: number, action: (_: GetFd) => T.Task<A>): T.Task<A> {
  return duration === 0
    ? action(getFdNothing)
    : T.bracket(initialize(duration), terminate, mfc => action(getFd(mfc)));
}

const enum Status {
  ACTIVE,
  INACTIVE
}

type MutableStatus = RV.Ref<Status>;

function status(ms: MutableStatus): T.Task<Status> {
  return RV.readRef(ms);
}

const newActiveStatus: T.Task<MutableStatus> = RV.newRef(Status.ACTIVE);

function refresh(ms: MutableStatus): T.Task<void> {
  return RV.writeRef(ms, Status.ACTIVE);
}

function inactive(ms: MutableStatus): T.Task<void> {
  return RV.writeRef(ms, Status.INACTIVE);
}

interface FdEntry {
  readonly path: string;
  readonly fd: number;
  readonly status: MutableStatus;
}

function fdEntry(path: string, fd: number, status: MutableStatus): FdEntry {
  return { path, fd, status };
}

function openFile(path: string): T.Task<number> {
  return T.node(null, path, 'r', null, FS.open);
}

function closeFile(fd: number): T.Task<void> {
  return T.node(null, fd, FS.close);
}

function newFdEntry(path: string): T.Task<FdEntry> {
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
      P.chainMaybe(SM.lookup(path, fc), fd => validateEntry(fd, path)));
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
  });
}

function clean(old: FdCache): T.Task<(cache: FdCache) => FdCache> {
  return traverseStrMap(old, prune).map(x => filterMap(x, identity))
    .chain(newMap => T.pure((xs: FdCache) => SM.union(xs, newMap)));
}

function terminate(md: MutableFdCache): T.Task<void> {
  return md.stop.chain(t => {
    return T.forInPar(SM.toPairs(t), ps => closeFile(ps[1].fd));
  }) as any;
}

function prune(fd: FdEntry): T.Task<P.Maybe<FdEntry>> {
  return status(fd.status)
    .chain(st =>
      st === Status.ACTIVE
        ? inactive(fd.status).then(T.pure(P.just(fd)))
        : closeFile(fd.fd).then(T.pure(P.nothing))
    );
}

function filterMap<K extends string, V, W>(
  ms: SM.StrMap<K, V>,
  f: (_: V) => P.Maybe<W>
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
        return SM.union(o2, o);
      };
    }
    return ta.map(set).apply(f(ms[k]));
  }, T.pure({} as SM.StrMap<K, B>));
}

function getFd(mfc: MutableFdCache): (path: string) => T.Task<[P.Maybe<number>, Refresh]> {
  return path => look(mfc, path).chain(m => maybeGetFd(mfc, path, m));
}

function getFdNothing(): T.Task<[P.Maybe<number>, Refresh]> {
  return T.pure([P.nothing, T.pure(void 0)] as [P.Maybe<number>, Refresh]);
}

function maybeGetFd(mfd: MutableFdCache, path: string, mentry: P.Maybe<FdEntry>): T.Task<[P.Maybe<number>, Refresh]> {
  if (P.isNothing(mentry)) {
    return newFdEntry(path)
      .chain(entry => mfd.add([path, entry])
        .then(T.pure([P.just(entry.fd), refresh(entry.status)] as [P.Maybe<number>, Refresh])));
  }
  let fdEntry = mentry.value;
  return refresh(fdEntry.status).then(T.pure([P.just(fdEntry.fd), refresh(fdEntry.status)] as [P.Maybe<number>, Refresh]));
}
