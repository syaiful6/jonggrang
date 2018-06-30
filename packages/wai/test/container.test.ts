import * as assert from 'assert';

import * as P from '@jonggrang/prelude';

import * as HM from '../src/handler/hash-map';
import * as MM from '../src/handler/multi-map';


describe('Container', function () {
  describe('HashMap', function () {
    it('#isEmpty return true if passed empty structure', function () {
      assert.equal(HM.isEmpty(HM.empty), true);
    });

    it('#isEmpty return false if passed non-empty structure', function () {
      assert.equal(HM.isEmpty(HM.insert(1, 'path', 'hii', HM.empty)), false);
    });

    it('#insert can insert item correctly', function () {
      const m = HM.insert(10, 'hello', 'world', HM.empty);
      assert.deepEqual(HM.lookup(10, 'hello', m), P.just('world'));
    });

    it('#lookup return Nothing if the hash & key not in hash map', function () {
      const ret = HM.lookup(10, 'path', HM.empty);
      assert.ok(P.isNothing(ret));
    });
  });

  describe('Multimap', function () {
    it('#isEmpty return true if passed empty structure', function () {
      assert.ok(MM.isEmpty(MM.empty));
    });

    it('#isEmpty return false if passed non-empty structure', function () {
      assert.equal(
        MM.isEmpty(MM.singleton(10, 'ten')),
        false
      );
    });

    it('#search return Nothing if the key is not present', function () {
      const mmap = MM.singleton(10, 'ten');
      assert.ok(P.isNothing(MM.search(9, mmap)));
    });

    it('#search return Just if the key is present', function () {
      const mmap = MM.singleton(10, 'ten');
      assert.deepEqual(MM.search(10, mmap), P.just('ten'));
    });

    it('#searchWith return Nothing if the key is not present', function () {
      const mmap = MM.singleton(10, 'ten');
      assert.ok(P.isNothing(MM.searchWith(9, P.identity, mmap)));
    });

    it('#searchWith return Just if the key present and satisfy pred', function () {
      const mmap = MM.singleton(10, 'ten');
      assert.ok(P.isJust(MM.searchWith(10, P.constant(true), mmap)));
    });
  });
});
