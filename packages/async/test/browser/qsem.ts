import * as assert from 'assert';

import * as AV from '@jonggrang/avar';
import * as T from '@jonggrang/task';

import * as Q from '../../src/qsem';
import { Forked, test, fork, stop } from './utils';

describe('QSem', function () {
  it('FIFO semantics for the waiters', async function() {
    const qsem: Q.QSem = await Q.newQSem(0);
    const [t1, m1]: Forked<void> = await fork(Q.waitQSem(qsem));

    await stop(t1, m1);
    await Q.signalQSem(qsem);
    await T.delay(10);
    const [t2, m2]: Forked<void> = await fork(Q.waitQSem(qsem));
    await T.delay(10);

    const result: AV.AVar<boolean> = await AV.newEmptyAVar;
    const [t3, m3]: Forked<void> = await fork(
      T.onException(
        Q.waitQSem(qsem),
        AV.putAVar(result, false)
      ).chain(() => AV.putAVar(result, true))
    );
    await Q.signalQSem(qsem);
    await T.delay(10);

    await stop(t2, m2);
    await stop(t3, m3);

    const r: boolean = await AV.takeAVar(result);
    assert.ok(r);
    await T.pure(void 0);
  });
  test('FIFO semantics for the waiters', function* () {
    const qsem: Q.QSem = yield Q.newQSem(0);
    const [t1, m1]: Forked<void> = yield fork(Q.waitQSem(qsem));

    yield stop(t1, m1);
    yield Q.signalQSem(qsem);
    yield T.delay(10);
    const [t2, m2]: Forked<void> = yield fork(Q.waitQSem(qsem));
    yield T.delay(10);

    const result: AV.AVar<boolean> = yield AV.newEmptyAVar;
    const [t3, m3]: Forked<void> = yield fork(
      T.onException(
        Q.waitQSem(qsem),
        AV.putAVar(result, false)
      ).chain(() => AV.putAVar(result, true))
    );
    yield Q.signalQSem(qsem);
    yield T.delay(10);

    yield stop(t2, m2);
    yield stop(t3, m3);

    const r: boolean = yield AV.takeAVar(result);
    assert.ok(r);
    return T.pure(void 0);
  });

  test('signalQSem add 1 when quantity is less than zero', function* () {
    const qsem: Q.QSem = yield Q.newQSem(-1);
    yield Q.signalQSem(qsem);

    const qty: number = yield AV.readAVar(qsem.quantityStore);
    assert.equal(qty, 0);
    return T.pure(void 0);
  });
});
