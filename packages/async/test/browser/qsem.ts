import * as assert from 'assert';

import * as AV from '@jonggrang/avar';
import * as T from '@jonggrang/task';

import * as Q from '../../src/qsem';


type Forked<A> = [T.Fiber<A>, AV.AVar<void>];

function fork<A>(t: T.Task<A>): T.Task<Forked<A>> {
  return AV.newEmptyAVar.chain(avar =>
    T.forkTask(T.ensure(t, AV.putAVar(avar, void 0))).chain(fib =>
      T.delay(10).map(() => [fib, avar] as [T.Fiber<A>, AV.AVar<void>])
    )
  );
}

function stop<A>(fib: T.Fiber<A>, av: AV.AVar<void>): T.Task<void> {
  return T.killFiber(new Error('stop'), fib)
    .chain(() => T.delay(10).chain(() => AV.takeAVar(av)));
}

describe('QSem', function () {
  it('FIFO semantics for the waiters', function () {
    return T.toPromise(T.co(function * () {
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
    }));
  });
});
