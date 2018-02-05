import * as T from '@jonggrang/task';
import * as FS from 'fs';

export function stat(path: string): T.Task<FS.Stats> {
  return T.makeTask(cb => {
    FS.stat(path, cb);
    return T.nonCanceler;
  });
}

export type FileFlags = 'r' | 'r+' | 'rs' | 'rs+' | 'w' | 'wx' | 'w+' | 'wx+' | 'a' | 'ax' | 'a+' | 'ax+';

export type Fd = number;

export function fdOpen(
  path: string,
  flags: FileFlags,
  mode: number | null
): T.Task<Fd> {
  return T.makeTask(cb => {
    FS.open(path, flags, mode, cb);
    return T.nonCanceler;
  });
}
