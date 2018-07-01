import * as FS from 'fs';

import * as T from '@jonggrang/task';
import * as P from '@jonggrang/prelude';
import * as RV from '@jonggrang/ref';
import { Reaper, mkReaper } from '@jonggrang/auto-update';

import * as MM from './multi-map';


/**
 * An action to activate a Fd cache entry.
 */
export type Refresh = T.Task<void>;

/**
 * this is interface for function that take filepath and return a tuple of Maybe Fd and Refresh
 * action
 */
export interface GetFd {
  (hash: number): (path: string) => T.Task<[P.Maybe<number>, Refresh]>;
}

/**
 * Creating 'MutableFdCache' and executing the action in the second
 * argument. The first argument is a cache duration in second.
 * @param duration number
 * @param action
 */
export function withFdCache<A>(duration: number, action: (_: GetFd) => T.Task<A>): T.Task<A> {
  return duration === 0
    ? action(P.constant(getFdNothing))
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

type FdCache = MM.MMap<FdEntry>;

type MutableFdCache = Reaper<FdCache, [number, FdEntry]>;

function fdCache(reaper: MutableFdCache): T.Task<FdCache> {
  return reaper.read;
}

function look(mfc: MutableFdCache, path: string, key: number): T.Task<P.Maybe<FdEntry>> {
  return fdCache(mfc)
    .map(fc => MM.searchWith(key, entry => entry.path === path, fc));
}

function initialize(delay: number): T.Task<MutableFdCache> {
  return mkReaper({
    delay,
    isNull: MM.isEmpty,
    empty: MM.empty,
    action: clean,
    cons: ([k, v], m) => MM.insert(k, v, m)
  });
}

function clean(old: FdCache): T.Task<(cache: FdCache) => FdCache> {
  return MM.pruneWith(old, prune).map((newCache: FdCache) => (extra: FdCache) => MM.merge(newCache, extra));
}

function terminate(md: MutableFdCache): T.Task<void> {
  return md.stop.chain(t => listForInPar_(MM.toList(t), entry => closeFile(entry.fd)));
}

function prune(fd: FdEntry): T.Task<boolean> {
  return status(fd.status)
    .chain(st =>
      st === Status.ACTIVE
        ? T.apSecond(inactive(fd.status), T.pure(true))
        : T.apSecond(closeFile(fd.fd), T.pure(false))
    );
}

function getFd(mfc: MutableFdCache): (hash: number) => (path: string) => T.Task<[P.Maybe<number>, Refresh]> {
  return hash => path => look(mfc, path, hash).chain(m => maybeGetFd(mfc, path, hash, m));
}

function getFdNothing(): T.Task<[P.Maybe<number>, Refresh]> {
  return T.pure([P.nothing, T.pure(void 0)] as [P.Maybe<number>, Refresh]);
}

function maybeGetFd(mfd: MutableFdCache, path: string, hash: number, mentry: P.Maybe<FdEntry>): T.Task<[P.Maybe<number>, Refresh]> {
  if (P.isNothing(mentry)) {
    return newFdEntry(path)
      .chain(entry => mfd.add([hash, entry])
        .then(T.pure([P.just(entry.fd), refresh(entry.status)] as [P.Maybe<number>, Refresh])));
  }
  let fdEntry = mentry.value;
  return refresh(fdEntry.status).then(T.pure([P.just(fdEntry.fd), refresh(fdEntry.status)] as [P.Maybe<number>, Refresh]));
}

function listForInPar_<A, B>(xs: P.list.List<A>, fn: (_: A) => T.Task<B>): T.Task<void> {
  return P.list.foldr((a, b) => T.apSecond(fn(a).parallel(), b), T.Parallel.of(void 0), xs).sequential();
}
