import * as os from 'os';

import { HttpContext } from '@jonggrang/wai';

import { DiskStorage, DiskStorageOptions } from './disk';
import { MemoryStorage } from './memory';
import { Storage } from '../types';


export function defaultGetStorage(ctx: HttpContext): Storage {
  const len: number = parseInt(ctx.request.headers['content-length'] || '', 10);
  return !isNaN(len) && len < 50000 ? new MemoryStorage()
    : new DiskStorage({ dir: os.tmpdir() });
}

export { DiskStorage, DiskStorageOptions, MemoryStorage };
