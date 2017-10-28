import 'mocha';
import * as T from '../../src'
import * as Q from './utils';

const testTry = Q.assertTask(T.attempt(T.Task.of(42)).chain(x => {
  if (x.tag === "RIGHT" && x.value === 42) {
    return T.Task.of(true);
  }
  return T.Task.of(false);
}));

const tsGen = T.co(function* () {
  let ref = yield Q.newRef("");
  yield T.forkTask(T.co(function* () {
    yield T.delay(10);
    return Q.modifyRef(ref, x => x + 'child')
  }));
  yield Q.modifyRef(ref, x => x + 'go');
  yield T.delay(20);
  yield Q.modifyRef(ref, (x) => x + 'parent');
  let b = yield Q.readRef(ref);
  return T.Task.of(b === 'gochildparent')
})

const tsChaiRecAsync = T.Task.chainRec(function (f, g, x) {
  if (x > 10) {
    return T.Task.of(g(x));
  } else {
    return T.delay(0).chain(_ => T.Task.of(f(x + 1)))
  }
}, 0);

const taskMultiJoin = T.co(function* () {
  let ref: Q.Ref<number> = yield Q.newRef(1);
  let f1 = yield T.forkTask(T.co(function* () {
    yield T.delay(10);
    yield Q.modifyRef(ref, x => x + 1);
    return T.Task.of(10);
  }));
  let f2 = yield T.forkTask(T.co(function* () {
    yield T.delay(20);
    yield Q.modifyRef(ref, x => x + 1);
    return T.Task.of(20);
  }));
  let n1 = yield T.forIn([f1, f1, f1, f2], T.joinFiber);
  let n2 = yield Q.readRef(ref);
  return T.Task.of(n1.reduce((a: number, b: number) => a + b, 0) === 50 && n2 === 3)
});

const testSupervise: T.Task<boolean> = T.co(function* () {
  let ref: Q.Ref<string> = yield Q.newRef('');
  let r1 = yield T.supervise(T.co(function* () {
    yield T.forkTask(
      T.bracket(
        Q.modifyRef(ref, v => v + 'acquire'),
        () => Q.modifyRef(ref, v => v + 'release'),
        () => T.delay(10)
      ));
    yield T.forkTask(T.delay(11).then(Q.modifyRef(ref, v => v + 'delay')));
    yield T.delay(5);
    yield Q.modifyRef(ref, v => v + 'done');
    return T.pure('done');
  }));
  yield T.delay(20);
  let r2 = yield Q.readRef(ref);
  return T.pure(r1 === "done" && r2 === "acquiredonerelease")
});

describe('Task.Core', () => {
  describe('Basic Operation', () => {
    it('pure', (done) => {
      T.runTask(done, Q.equals(T.Task.of(42), T.Task.of(42)));
    });

    it('chain', (done) => {
      T.runTask(
        done,
        Q.shouldBe(
          42,
          T.Task.of(40)
            .chain(x => T.Task.of(x + 1))
            .chain(x => T.Task.of(x + 1))
        )
      );
    });

    it('map', (done) => {
      T.runTask(done, Q.equals(T.Task.of(2), T.Task.of(2).map(Q.id)));
    });

    it('try', (done) => {
      T.runTask(done, testTry);
    });

    it('try/throw', (done) => {
      T.runTask(
        done,
        Q.assertTask(
          T.attempt(T.Task.throwError(new Error('nope')))
          .map(Q.isLeft)
        )
      );
    });

    it("fork", (done) => {
      T.runTask(
        done,
        Q.assertTask(
          Q.newRef("")
          .chain(ref => {
            return T.forkTask(T.delay(10).chain(_ => Q.modifyRef(ref, (s) => s + 'child')))
              .chain(_ => Q.modifyRef(ref, (x) => x + 'go'))
              .chain(_ => T.delay(20))
              .chain(_ => Q.modifyRef(ref, (x) => x + 'parent'))
              .chain(_ => Q.readRef(ref))
              .map(s => s === 'gochildparent')
          })
        )
      );
    });

    it('suspend', (done) => {
      T.runTask(
        done,
        Q.assertTask(
          Q.newRef("")
          .chain(ref => {
            return T.suspendTask(T.delay(10).chain(_ => Q.modifyRef(ref, (s) => s + 'child')))
              .chain(fib => {
                return Q.modifyRef(ref, (x) => x + 'go')
                  .chain(_ => T.delay(20))
                  .chain(_ => Q.modifyRef(ref, (x) => x + 'parent'))
                  .chain(_ => T.joinFiber(fib))
                  .chain(_ => Q.readRef(ref))
                  .map(s => s === 'goparentchild')
              });
          })
        )
      );
    });

    it('supervise', done =>
      T.runTask(done, Q.assertTask(testSupervise))
    );

    it('ChainRec', (done) => {
      T.runTask(done, Q.shouldBe(11, tsChaiRecAsync))
    });

    it('test generator', (done) => {
      T.runTask(done, Q.assertTask(tsGen));
    });

    it('Async work', (done) => {
      T.runTask(done, Q.equals(T.delay(20).map(x => 2), T.Task.of(2)));
    });

    it('merge array of Tasks', (done) => {
      T.runTask(done, Q.shouldBe([42, 99], T.merge([T.Task.of(42), T.Task.of(99)])));
    });

    it('merge parallel array of Tasks', (done) => {
      T.runTask(done, Q.shouldBe([42, 99], T.mergePar([T.Task.of(42), T.Task.of(99)])));
    });
  });

  describe('Error handling & Joining forked Task', () => {
    it('joining an error task should rethrown in current context', (done) => {
      T.runTask(done, Q.assertTask(T.co(function* () {
        let fib = yield T.forkTask(T.co(function* () {
          yield T.delay(10);
          return T.Task.throwError(new Error('Nope.'))
        }));
        let et = yield T.attempt(T.joinFiber(fib));
        return T.Task.of(et.tag === 'LEFT');
      })));
    });

    it('join an error sync task should behave like async task', (done) => {
      T.runTask(
        done,
        Q.assertTask(T.co(function* () {
          let fib = yield T.forkTask(T.Task.throwError(new Error('nope')));
          let et = yield T.attempt(T.joinFiber(fib));
          return T.Task.of(et.tag === 'LEFT');
        }))
      );
    });

    it('propagate Error that thrown in sync Task', (done) => {
      T.runTask(
        done,
        Q.assertTask(
          T.attempt(T.liftEff(() => {
            throw new Error('sync error');
          })).map(e => e.tag === 'LEFT')
        )
      );
    });

    it('Multi join Task', (done) => {
      T.runTask(done, Q.assertTask(taskMultiJoin));
    });
  });

  describe('Race', () => {
    it('select the first success', (done) => {
      T.runTask(
        done,
        Q.shouldBe(1, T.race([ T.delay(10).map(_ => 1), T.delay(10).map(_ => 2) ])));
    });

    it('select the fast one (fast in last)', (done) => {
      const tasks = [
        T.delay(100).map(_ => 10),
        T.delay(90).map(_ => 9),
        T.delay(10).map(_ => 8)
      ];
      T.runTask(done, Q.shouldBe(8, T.race(tasks)));
    });

    it('work even if some task throw an error', (done) => {
      T.runTask(
        done,
        Q.shouldBe(5, T.race([
          T.delay(10).then(T.raise(new Error('failed 1'))),
          T.delay(100).map(_ => 9),
          T.delay(20).then(T.raise(new Error('failed'))),
          T.delay(40).map(_ => 5)
        ])
      ))
    });
  })
});
