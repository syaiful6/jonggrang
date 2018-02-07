import * as T from '@jonggrang/task';
import * as RV from '@jonggrang/ref';
import * as FS from './fs-task';

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
