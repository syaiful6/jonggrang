import * as assert from 'assert';

import * as P from '@jonggrang/prelude';
import * as T from '@jonggrang/task';

import * as Q from '../../src/chan';
import { compete } from '../../src/async';
import { test } from './utils';


describe('Chan', function () {
  describe('simple operations', function () {
    test('inserting and popping elements', function* () {
      const chan: Q.Chan<number> = yield Q.newChan;
      yield Q.writeChan(chan, 1);
      yield Q.writeChan(chan, 2);

      const r1: number = yield Q.readChan(chan);
      const r2: number = yield Q.readChan(chan);
      yield Q.writeChan(chan, 3);
      const r3: number = yield Q.readChan(chan);

      assert.deepEqual([r1, r2, r3], [1, 2, 3]);
      return T.pure(void 0);
    });
  });

  describe('Blocking and unblocking', function () {
    test('reading from an empty Chan blocks', function* () {
      const chan: Q.Chan<number> = yield Q.newChan;
      const r: P.Either<void, number> = yield compete(T.delay(50), Q.readChan(chan));
      assert.ok(P.isLeft(r));

      return T.pure(void 0);
    });

    test('writing unblocks reads', function* () {
      const chan: Q.Chan<number> = yield Q.newChan;
      yield T.forkTask(T.apSecond(T.delay(20), Q.writeChan(chan, 1)));
      const r: P.Either<void, number> = yield compete(T.delay(50), Q.readChan(chan));
      assert.ok(P.isRight(r));

      return T.pure(void 0);
    });
  });
});
