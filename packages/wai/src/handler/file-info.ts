import * as FS from 'fs';

import { constant, isJust } from '@jonggrang/prelude';
import { Reaper, mkReaper } from '@jonggrang/auto-update';
import * as T from '@jonggrang/task';
import * as H from '@jonggrang/http-types';

import * as HM from './hash-map';

/**
 * File information
 */
export class FileInfo {
  constructor(
    readonly name: string,
    readonly size: number,
    readonly time: H.HttpDate,
    readonly date: string
  ) {
  }

  compare(other: FileInfo): -1 | 0 | 1 {
    return this.name < other.name ? -1 : this.name === other.name ? 0 : 1;
  }

  equals(other: FileInfo) {
    return this.name === other.name;
  }
}

const enum EntryType {
  NEGATIVE,
  POSITIVE
}

type Entry
  = { tag: EntryType.NEGATIVE }
  | { tag: EntryType.POSITIVE, finfo: FileInfo };

type Cache = HM.HashMap<Entry>;

type FileInfoCache = Reaper<Cache, [number, string, Entry]>;

export function withFileInfoCache<A>(
  delay: number,
  action: (getInfo: (hash: number) => (path: string) => T.Task<FileInfo>) => T.Task<A>
): T.Task<A> {
  return delay === 0
    ? action(constant(getFileInfo))
    : T.bracket(initialize(delay), terminate, s => action(getAndRegisterInfo(s)));
}

/**
 * Getting the file information corresponding to the file.
 * @param path The path to file
 */
export function getFileInfo(path: string): T.Task<FileInfo> {
  return T.node(null, path, FS.stat)
    .chain(stat => {
      if (stat.isFile()) {
        let time = H.fromDate(stat.mtime);
        let date = H.formatHttpDate(time);
        return T.pure(new FileInfo(path, stat.size, time, date));
      }
      return T.raise(new Error(`getInfo: ${path}  isn't a file`));
    });
}

function getAndRegisterInfo(fcache: FileInfoCache): (hash: number) => (path: string) => T.Task<FileInfo> {
  return (hash: number) => (path: string) => {
    return fcache.read.chain(cache => {
      const there = HM.lookup(hash, path, cache);
      if (isJust(there)) {
        const entry = there.value;
        return entry.tag === EntryType.NEGATIVE ? T.raise(new Error('FileInfoCache:getAndRegisterInfo'))
          : T.pure(entry.finfo);
      }
      return T.rescue(positive(fcache, hash, path), () => negative(fcache, hash, path));
    });
  };
}

function positive(fic: FileInfoCache, h: number, path: string): T.Task<FileInfo> {
  return getFileInfo(path)
    .chain(finfo =>
      fic.add([h, path, createEntry(EntryType.POSITIVE, finfo)]).then(T.pure(finfo)));
}

function negative(fic: FileInfoCache, h: number, path: string): T.Task<FileInfo> {
  return fic.add([h, path, createEntry(EntryType.NEGATIVE)])
    .then(T.raise(new Error('FileInfoCache:negative')));
}

function initialize(delay: number): T.Task<FileInfoCache> {
  return mkReaper({
    delay,
    isNull: HM.isEmpty,
    empty: HM.empty,
    action: override,
    cons: ([h, k, v], m) => HM.insert(h, k, v, m),
  });
}

function createEntry(tag: EntryType.NEGATIVE): Entry;
function createEntry(tag: EntryType.POSITIVE, finfo: FileInfo): Entry;
function createEntry(tag: EntryType, finfo?: FileInfo): Entry {
  return { tag, finfo } as any;
}

function override(): T.Task<(c: Cache) => Cache> {
  return T.pure(constant(HM.empty));
}

function terminate(fcache: FileInfoCache): T.Task<void> {
  return fcache.stop.then(T.pure(void 0));
}
