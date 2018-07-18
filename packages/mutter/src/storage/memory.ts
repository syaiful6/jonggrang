import * as fs from 'fs';
import { Readable } from 'stream';

import * as T from '@jonggrang/task';
import { assign } from '@jonggrang/object';
import { concatStream } from '@jonggrang/stream';

import { FileUpload, FileInfo } from '../types';


function writeFile(this: { buffer: Buffer }, dest: string): T.Task<void> {
  return T.node(null, dest, this.buffer, fs.writeFile);
}

function getBuffer(source: Readable): T.Task<Buffer> {
  return T.makeTask_(cb => {
    const stream = concatStream(cb);
    source.pipe(stream);
  });
}

export class MemoryStorage {
  constructor() {
  }

  handleFile(file: FileUpload, source: Readable): T.Task<FileInfo> {
    return getBuffer(source).map(buffer =>
      assign(file, {
        buffer,
        size: buffer.length,
        move: writeFile
      })
    );
  }

  removeFile(file: FileInfo): T.Task<void> {
    delete (file as any).buffer;
    return T.pure(void 0);
  }
}
