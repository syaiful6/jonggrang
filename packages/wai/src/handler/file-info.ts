import * as T from '@jonggrang/task';
import { Reaper, mkReaper } from './reaper';
import * as FS from './fs-task';

export class FileInfo {
  constructor(
    readonly name: string,
    readonly size: number,
    readonly time: Date,
    readonly date: string
  ) {
  }

  compare(other: FileInfo) {
    return this.name < other.name ? -1 : this.name === other.name ? 0 : 1;
  }

  equals(other: FileInfo) {
    return this.name === other.name;
  }
}

export const enum EntryType {
  NEGATIVE,
  POSITIVE
}

export type Entry
  = { tag: EntryType.NEGATIVE }
  | { tag: EntryType.POSITIVE, finfo: FileInfo };

export type Cache = Record<string, Entry>;

export type FileInfoCache = Reaper<Cache, [string, Entry]>;

export function withFileInfoCache<A>(
  delay: number,
  action: (getInfo: (path: string) => T.Task<FileInfo>) => T.Task<A>
): T.Task<A> {
  return delay === 0 ? action(getFileInfo) : T.bracket(initialize(delay), terminate, s => action(getAndRegisterInfo(s)))
}

export function getFileInfo(path: string): T.Task<FileInfo> {
  return FS.stat(path)
    .chain(stat => {
      if (stat.isFile()) {
        let time = stat.mtime;
        let date = time.toUTCString();
        return T.pure(new FileInfo(path, stat.size, time, date))
      }
      return T.raise(new Error(`getInfo: ${path}  isn't a file`));
    });
}

function getAndRegisterInfo(fcache: FileInfoCache): (path: string) => T.Task<FileInfo> {
  return (path: string) => {
    return fcache.read.chain(cache => {
      let there = path in cache,
        item = cache[path];
      if (there && item.tag === EntryType.NEGATIVE) {
        return T.raise(new Error('FileInfoCache:getAndRegisterInfo'));
      }
      if (there && item.tag === EntryType.POSITIVE) {
        return T.pure(item.finfo);
      }
      return T.rescue(positive(fcache, path), () => negative(fcache, path))
    });
  }
}

function positive(fic: FileInfoCache, path: string): T.Task<FileInfo> {
  return getFileInfo(path)
    .chain(finfo =>
      fic.add([path, createEntry(EntryType.POSITIVE, finfo)]).then(T.pure(finfo)))
}

function negative(fic: FileInfoCache, path: string): T.Task<FileInfo> {
  return fic.add([path, createEntry(EntryType.NEGATIVE)])
    .then(T.raise(new Error('FileInfoCache:negative')))
}

function initialize(delay: number): T.Task<FileInfoCache> {
  return mkReaper({
    delay,
    isNull,
    empty: {},
    action: override,
    cons: insert,
  })
}

function createEntry(tag: EntryType.NEGATIVE): Entry;
function createEntry(tag: EntryType.POSITIVE, finfo: FileInfo): Entry;
function createEntry(tag: EntryType, finfo?: FileInfo): Entry {
  return { tag, finfo } as any;
}

function isNull<K extends string, A>(s: Record<K, A>): boolean {
  for (let k in s) {
    if (Object.prototype.hasOwnProperty.call(s, k)) {
      return false;
    }
  }
  return true;
}

function insert<K extends string, A>(item: [K, A], s: Record<K, A>): Record<K, A> {
  let copy: Record<K, A> = {} as Record<K, A>;
  for (let k in s) {
    if (Object.prototype.hasOwnProperty.call(s, k)) {
      copy[k] = s[k];
    }
  }
  copy[item[0]] = item[1];
  return copy;
}

function override(): T.Task<(c: Cache) => Cache> {
  return T.pure(() => ({}))
}

function terminate(fcache: FileInfoCache): T.Task<void> {
  return fcache.stop.then(T.pure(void 0));
}
