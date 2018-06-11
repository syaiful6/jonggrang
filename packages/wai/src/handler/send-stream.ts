import * as FS from 'fs';
import { ServerResponse } from 'http';
import { Readable } from 'stream';
import onFinished from 'on-finished';
import destroyStream from 'destroy';

import * as T from '@jonggrang/task';
import * as P from '@jonggrang/prelude';
import { pipeStream } from '@jonggrang/stream';

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
  onFinished(ws, destroyStream.bind(null, stream));
  return pipeStream(ws, stream as any, { end: false }).then(hook);
}

export function sendFilePath(ws: ServerResponse, path: string, range: FileRange, hook: T.Task<void>): T.Task<void> {
  const stream = pathCreateReadStream(path, range);
  onFinished(ws, destroyStream.bind(null, stream));
  return pipeStream(ws, stream as any, { end: false }).then(hook);
}

export function sendStream(ws: ServerResponse, read: Readable): T.Task<void> {
  onFinished(ws, destroyStream.bind(null, read));
  return pipeStream(ws, read as any, { end: false });
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

export function fileRange(tag: FileRangeType.ENTIREFILE): FileRange;
export function fileRange(tag: FileRangeType.PARTOFFILE, start: number, end: number): FileRange;
export function fileRange(tag: FileRangeType, start?: number, end?: number): FileRange {
  return { tag, start, end } as FileRange;
}
