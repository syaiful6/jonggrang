import * as FS from 'fs';
import { ServerResponse } from 'http';
import { Writable, Readable, Stream } from 'stream';
import * as onFinished from 'on-finished';

import * as T from '@jonggrang/task';
import * as P from '@jonggrang/prelude';

import { FileId } from './types';


export const enum FileRangeType {
  ENTIREFILE,
  PARTOFFILE
}

export type FileRange
  = { tag: FileRangeType.ENTIREFILE }
  | { tag: FileRangeType.PARTOFFILE; start: number; end: number };


export function sendFile(
  ws: ServerResponse,
  fid: FileId,
  start: number,
  end: number,
  hook: T.Task<void>
) {
  if (P.isNothing(fid.fd)) {
    return sendFilePath(ws, fid.path, fileRange(FileRangeType.PARTOFFILE, start, end), hook);
  }
  return sendFileFd(ws, fid.fd.value, fileRange(FileRangeType.PARTOFFILE, start, end), hook);
}

export function sendFileFd(ws: ServerResponse, fd: number, range: FileRange, hook: T.Task<void>): T.Task<void> {
  const stream = fdcreateReadStream(fd, range);
  return pipeStream(ws, stream).then(hook);
}

export function sendFilePath(ws: ServerResponse, path: string, range: FileRange, hook: T.Task<void>): T.Task<void> {
  const stream = pathCreateReadStream(path, range);
  onFinished(ws, destroyStream.bind(null, stream));
  return pipeStream(ws, stream).then(hook);
}

export function sendStream(ws: ServerResponse, read: Readable): T.Task<void> {
  onFinished(ws, destroyStream.bind(null, read));
  return pipeStream(ws, read);
}

export function destroyStream<T extends Readable>(stream: T) {
  if (stream instanceof FS.ReadStream) {
    return destroyReadStream(stream);
  }
  if (typeof stream.destroy === 'function') {
    stream.destroy();
  }
}

function destroyReadStream(stream: FS.ReadStream) {
  stream.destroy();
  if (typeof stream.close === 'function') {
    stream.on('open', onOpenClose);
  }
}

function onOpenClose(this: any) {
  if (typeof this.fd === 'number') {
    // actually close down the fd
    this.close();
  }
}

function pathCreateReadStream(path: string, range: FileRange) {
  if (range.tag === FileRangeType.PARTOFFILE) {
    return FS.createReadStream(path, {
      start: range.start,
      end: range.end,
      flags: 'r',
      autoClose: true
    });
  }
  return FS.createReadStream(path, {
    flags: 'r',
    autoClose: true
  });
}

function fdcreateReadStream(fd: number, range: FileRange) {
  if (range.tag === FileRangeType.PARTOFFILE) {
    return FS.createReadStream('', {
      fd,
      start: range.start,
      end: range.end,
      flags: 'r',
      autoClose: false
    });
  }
  return FS.createReadStream('', {
    fd,
    flags: 'r',
    autoClose: false
  });
}

type PipeState = {
  onError: ((e: Error) => void) | null;
  onSucces: (() => void) | null;
  resolved: boolean;
};

export function pipeStream<W extends Writable, T extends Readable>(ws: W, rs: T): T.Task<void> {
  return T.makeTask(cb => {
    rs.pipe(ws, { end: false });
    const state: PipeState = {
      onError: null,
      onSucces: null,
      resolved: false
    };
    state.onError = onError.bind(null, state, rs, cb);
    state.onSucces = onSucces.bind(null, state, rs, cb);
    rs.once('error', state.onError as any);
    rs.once('end', state.onSucces as any);
    return T.thunkCanceller(() => cleanUpListener(state, rs));
  });
}

function onError<T extends Stream>(s: PipeState, st: T, cb: T.NodeCallback<void, void>, e: Error) {
  cb(e);
  if (!s.resolved) {
    cleanUpListener(s, st);
  }
}

function onSucces<T extends Stream>(s: PipeState, st: T, cb: T.NodeCallback<void, void>) {
  cb(null, void 0);
  if (!s.resolved) {
    cleanUpListener(s, st);
  }
}

function cleanUpListener<T extends Stream>(s: PipeState, st: T) {
  if (s.resolved) return;
  st.removeListener('error', s.onError as any);
  st.removeListener('end', s.onSucces as any);

  s.onError = null;
  s.onSucces = null;
  s.resolved = true;
}

export function fileRange(tag: FileRangeType.ENTIREFILE): FileRange;
export function fileRange(tag: FileRangeType.PARTOFFILE, start: number, end: number): FileRange;
export function fileRange(tag: FileRangeType, start?: number, end?: number): FileRange {
  return { tag, start, end } as FileRange;
}
