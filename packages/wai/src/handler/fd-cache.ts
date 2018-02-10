import * as T from '@jonggrang/task';
import * as P from '@jonggrang/prelude';
import * as RV from '@jonggrang/ref';
import * as SM from '@jonggrang/object';

import * as FS from './fs-task';
import { Reaper } from './reaper';

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
    .map(fc => validateEntry(SM.lookup(path, fc), path))
}

function validateEntry(fd: P.Maybe<FdEntry>, path: string): P.Maybe<FdEntry> {
  return P.chainMaybe(fd, fdE => {
    return fdE.path === path ? P.just(fdE) : P.nothing;
  })
}
