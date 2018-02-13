import * as FS from 'fs';

import * as T from '@jonggrang/task';


export function stat(path: string): T.Task<FS.Stats> {
  return T.makeTask(cb => {
    FS.stat(path, cb);
    return T.nonCanceler;
  });
}

export type FileFlags = 'r' | 'r+' | 'rs' | 'rs+' | 'w' | 'wx' | 'w+' | 'wx+' | 'a' | 'ax' | 'a+' | 'ax+';

export type Fd = number;

export function fdOpen(
  path: FS.PathLike,
  flags: FileFlags,
  mode: number | null
): T.Task<Fd> {
  return T.makeTask(cb => {
    FS.open(path, flags, mode, cb);
    return T.nonCanceler;
  });
}

export function fdClose(fd: number): T.Task<void> {
  return T.makeTask(cb => {
    FS.close(fd, cb);
    return T.nonCanceler;
  })
}

export function chmod(path: FS.PathLike, mode: number | string): T.Task<void> {
  return T.makeTask(cb => {
    FS.chmod(path, mode, cb);
    return T.nonCanceler;
  })
}

export function unlink(path: FS.PathLike): T.Task<void> {
  return T.makeTask(cb => {
    FS.unlink(path, cb);
    return T.nonCanceler;
  })
}
