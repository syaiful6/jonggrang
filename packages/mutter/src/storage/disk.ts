import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

import * as T from '@jonggrang/task';
import { randomString } from '@jonggrang/cryptic';
import { assign } from '@jonggrang/object';
import { pipeStream } from '@jonggrang/stream';

import { FileUpload, FileInfo } from '../types';


export interface DiskStorageOptions {
  dir: string;
}

function handleMove(this: { path: string }, dest: string): T.Task<void> {
  return T.node(null, this.path, dest, fs.rename);
}

export class DiskStorage {
  constructor(readonly opts: DiskStorageOptions) {
  }

  handleFile(file: FileUpload, source: Readable): T.Task<FileInfo> {
    return randomString(32).chain(filename => {
      const finalPath = path.join(this.opts.dir, filename);
      const outStream = fs.createWriteStream(finalPath);
      return pipeStream(outStream, source as any).map(() =>
        assign(file, {
          filename,
          size: outStream.bytesWritten,
          path: finalPath,
          move: handleMove
        })
      );
    });
  }

  removeFile(finfo: FileInfo): T.Task<void> {
    return T.node(null, finfo.path as string, fs.unlink);
  }
}
