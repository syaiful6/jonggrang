import * as assert from 'assert';

import { createHttpContext } from '@jonggrang/wai';
import { defaultGetStorage, DiskStorage, MemoryStorage } from '../src/storage';


describe('Mutter: get storage', function () {
  it('return disk if content length missing', function () {
    const req = { headers: {} };
    const storage = defaultGetStorage(createHttpContext(req as any));
    assert.ok(storage instanceof DiskStorage);
  });

  it('return memory storage if content-length less than 50000', function () {
    const req = {
      headers: {
        'content-length': '40000'
      }
    };
    const storage = defaultGetStorage(createHttpContext(req as any));
    assert.ok(storage instanceof MemoryStorage);
  });

  it('return disl storage if content-length greater than 50000', () => {
    const req = {
      headers: {
        'content-length': 80000
      }
    };
    const storage = defaultGetStorage(createHttpContext(req as any));
    assert.ok(storage instanceof DiskStorage);
  });
});
