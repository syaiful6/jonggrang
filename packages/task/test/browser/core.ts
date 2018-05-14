import 'mocha';
import * as E from '@jonggrang/prelude';

import * as T from '../../src';
import * as Q from './utils';


const testTry = Q.assertTask(T.attempt(T.Task.of(42)).chain(x => {
  if (x.tag === E.EitherType.RIGHT && x.value === 42) {
    return T.Task.of(true);
  }
  return T.Task.of(false);
}));

const tsGen = T.co(function* () {
  let ref = yield Q.newRef('');
  yield T.forkTask(T.co(function* () {
    yield T.delay(10);
    return Q.modifyRef(ref, x => x + 'child');
  }));
  yield Q.modifyRef(ref, x => x + 'go');
  yield T.delay(20);
  yield Q.modifyRef(ref, (x) => x + 'parent');
  let b = yield Q.readRef(ref);
  return T.Task.of(b === 'gochildparent');
});

const tsChaiRecAsync = T.Task.chainRec(function (f, g, x) {
  if (x > 10) {
    return T.Task.of(g(x));
  } else {
    return T.delay(0).chain(_ => T.Task.of(f(x + 1)));
  }
}, 0);

const taskMultiJoin = T.co(function* () {
  let ref: Q.Ref<number> = yield Q.newRef(1);
  let f1 = yield T.forkTask(T.co(function* () {
    yield T.delay(10);
    yield Q.modifyRef(ref, x => x + 1);
    return T.pure(10);
  }));
  let f2 = yield T.forkTask(T.co(function* () {
    yield T.delay(20);
    yield Q.modifyRef(ref, x => x + 1);
    return T.pure(20);
  }));
  let n1 = yield T.forIn([f1, f1, f1, f2], T.joinFiber);
  let n2 = yield Q.readRef(ref);
  return T.pure(n1.reduce((a: number, b: number) => a + b, 0) === 50 && n2 === 3);
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
  return T.pure(r1 === 'done' && r2 === 'acquiredonerelease');
});

const testKillParallelAlt: T.Task<boolean> = T.co(function* () {
  let ref: Q.Ref<string> = yield Q.newRef('');
  const action = (n: number, s: string) =>
    T.bracket(
      T.pure(void 0),
      () => Q.modifyRef(ref, s2 => s2 + 'killed' + s),
      () => T.delay(n).then(Q.modifyRef(ref, s2 => s2 + s))
    );
  let f1: T.Fiber<void> = yield T.forkTask(T.sequential(
    action(10, 'foo').parallel().alt(action(20, 'bar').parallel())
  ));
  let f2: T.Fiber<void> = yield T.forkTask(T.co(function* () {
    yield T.delay(5);
    yield T.killFiber(new Error('Nope'), f1);
    return Q.modifyRef(ref, s => s + 'done');
  }));
  yield T.attempt(T.joinFiber(f1));
  yield T.attempt(T.joinFiber(f2));
  return Q.readRef(ref).map(s => s === 'killedfookilledbardone');
});

function timer(text: string, cb: (err: Error | null, t: string) => void): void {
  setTimeout(() => cb(null, text), 100);
}

function test(desc: string, t: T.Task<any>) {
  it(desc, done => {
    T.runTask(done, t);
  });
}

describe('Task.Core', () => {
  describe('Basic Operation', () => {
    test('pure put value into task', Q.equals(T.pure(42), T.pure(42)));

    test(
      'chain',
      Q.shouldBe(42, T.pure(40).chain(x => T.pure(x + 1)).chain(x => T.pure(x + 1))));

    test('map', Q.shouldBe(2, T.pure(2).map(Q.id)));

    test('attempt', testTry);

    test('try/throw', Q.assertTask(T.attempt(T.raise(new Error('nope'))).map(E.isLeft)));

    test(
      'suspend',
      Q.assertTask(
        Q.newRef('')
          .chain(ref =>
            T.suspendTask(T.delay(10).chain(_ => Q.modifyRef(ref, (s) => s + 'child')))
              .chain(fib =>
                Q.modifyRef(ref, (x) => x + 'go')
                  .chain(_ => T.delay(20))
                  .chain(_ => Q.modifyRef(ref, (x) => x + 'parent'))
                  .chain(_ => T.joinFiber(fib))
                  .chain(_ => Q.readRef(ref))
                  .map(s => s === 'goparentchild')
              )
          )
      )
    );

    test('supervise', Q.assertTask(testSupervise));

    test('chainRec', Q.shouldBe(11, tsChaiRecAsync));

    test('generator', Q.assertTask(tsGen));

    test('async work', Q.equals(T.delay(20).map(() => 2), T.pure(2)));

    test('merge array of tasks', Q.shouldBe([42, 99], T.merge([ T.pure(42), T.pure(99)])));
  });

  describe('Bracket', () => {
    test('correctly run acquire, release and run', Q.assertTask(T.co(function* () {
      let ref: Q.Ref<string[]> = yield Q.newRef([]);
      function action(s: string) {
        return T.delay(10)
          .chain(() => Q.modifyRef(ref, xs => xs.concat([s])))
          .map(() => s);
      }
      yield T.bracket(
        action('foo'),
        s => action(s + '/release').map(() => {}),
        s => action(s + '/run')
      );
      return Q.readRef(ref).map(xs => E.deepEq(xs, [ 'foo', 'foo/run', 'foo/release' ]));
    })));

    test('correctly run acquire, release and run in nested bracket', Q.assertTask(T.co(function* () {
      let ref: Q.Ref<string[]> = yield Q.newRef([]);
      function action(s: string) {
        return T.delay(10)
          .chain(() => Q.modifyRef(ref, xs => xs.concat([s])))
          .map(() => s);
      }
      function bracketAction(s: string) {
        return T.bracket(
          action(s + '/bar'),
          t => action(t + '/release').map(() => {}),
          t => action(t + '/run')
        );
      }
      yield T.bracket(
        bracketAction('foo'),
        s => bracketAction(s + '/release').map(() => {}),
        s => bracketAction(s + '/run')
      );
      return Q.readRef(ref).map(xs =>
        E.deepEq(xs, [
          'foo/bar',
          'foo/bar/run',
          'foo/bar/release',
          'foo/bar/run/run/bar',
          'foo/bar/run/run/bar/run',
          'foo/bar/run/run/bar/release',
          'foo/bar/run/release/bar',
          'foo/bar/run/release/bar/run',
          'foo/bar/run/release/bar/release'
      ]));
    })));
  });

  describe('parallel task applicative', () => {
    test('parallel', Q.assertTask(T.co(function* () {
      let ref: Q.Ref<string> = yield Q.newRef('');
      function action(s: string) {
        return T.delay(10)
          .chain(() => Q.modifyRef(ref, t => t + s))
          .map(() => s);
      }
      function combine(a: string) {
        return (b: string) => ({ a, b });
      }
      let f1: T.Fiber<{ a: string; b: string; }> = yield T.forkTask(T.sequential(
        action('foo').parallel().map(combine).ap(action('bar').parallel())
      ));
      yield T.delay(15);
      const r1: string = yield Q.readRef(ref);
      const r2: { a: string; b: string; } = yield T.joinFiber(f1);
      return T.pure(r1 === 'foobar' && r2.a === 'foo' && r2.b === 'bar');
    })));

    test('parallel throws', Q.assertTask(Q.withTimeout(100, T.co(function* () {
      let ref: Q.Ref<string> = yield Q.newRef('');
      function action(n: number, s: string) {
        return T.delay(n)
          .chain(() => Q.modifyRef(ref, t => t + s))
          .map(() => s);
      }
      function combine(a: string) {
        return (b: string) => ({ a, b });
      }
      let r1: E.Either<Error, { a: string; b: string; }> = yield T.attempt(T.sequential(
        action(10, 'foo').chain(() => T.raise(new Error('Nope')))
          .parallel()
          .map(combine)
          .ap(T.parallel(T.never))
      ));
      const r2: string = yield Q.readRef(ref);
      return T.pure(E.isLeft(r1) && r2 === 'foo');
    }))));

    test('parallel alt', Q.assertTask(T.co(function* () {
      let ref: Q.Ref<string> = yield Q.newRef('');
      function action(n: number, s: string) {
        return T.delay(n)
          .chain(() => Q.modifyRef(ref, t => t + s))
          .map(() => s);
      }
      const f1: T.Fiber<string> = yield T.forkTask(T.sequential(
        T.parallel(action(10, 'foo')).alt(T.parallel(action(5, 'bar')))
      ));
      yield T.delay(10);
      const r1: string = yield Q.readRef(ref);
      const r2: string = yield T.joinFiber(f1);
      return T.pure(r1 === 'bar' && r2 === 'bar');
    })));

    test(
      'merge parallel array of tasks',
      Q.shouldBe([42, 99], T.mergePar([ T.pure(42), T.pure(99)]))
    );

    test('kill parallel alt', Q.assertTask(testKillParallelAlt));

    test('kill parallel alt finalizer', Q.assertTask(T.co(function* () {
      let ref: Q.Ref<string> = yield Q.newRef('');
      let f1: T.Fiber<void> = yield T.forkTask(T.sequential(
        T.parallel(T.delay(10)).alt(T.parallel(T.bracket(
          T.pure(void 0),
          () => T.delay(10).chain(() => Q.modifyRef(ref, s => s + 'killed')),
          () => T.delay(20)
        )))
      ));
      let f2: T.Fiber<void> = yield T.forkTask(T.co(function* () {
        yield T.delay(15);
        yield T.killFiber(new Error('nope'), f1);
        return Q.modifyRef(ref, s => s + 'done');
      }));
      yield T.attempt(T.joinFiber(f1));
      yield T.attempt(T.joinFiber(f2));
      return Q.readRef(ref).map(s => s === 'killeddone');
    })));
  });

  describe('forking Task', () => {
    test('fork', Q.assertTask(
      Q.newRef('')
        .chain(ref => {
          return T.forkTask(T.delay(10).chain(_ => Q.modifyRef(ref, (s) => s + 'child')))
            .chain(_ => Q.modifyRef(ref, (x) => x + 'go'))
            .chain(_ => T.delay(20))
            .chain(_ => Q.modifyRef(ref, (x) => x + 'parent'))
            .chain(_ => Q.readRef(ref))
            .map(s => s === 'gochildparent');
        })
    ));

    test('forked bracket', Q.assertTask(
      T.bracket(
        T.forkTask(T.pure(void 0)),
        () => T.pure(void 0),
        () => T.pure(true)
      )
    ));
  });

  describe('Kill fiber', () => {
    test('kill fiber', Q.assertTask(
      T.forkTask(T.never)
        .chain(fiber =>
          T.killFiber(new Error('nope'), fiber)
            .chain(() => T.attempt(T.joinFiber(fiber)).map(E.isLeft))
        )
    ));

    test('killing fiber call task\'s canceller', Q.assertTask(T.co(function* () {
      let ref: Q.Ref<string> = yield Q.newRef('');
      let fib: T.Fiber<void> = yield T.forkTask(T.makeTask(() => {
        return () => T.delay(20).chain(() => Q.modifyRef(ref, () => 'cancel'));
      }).chain(() => Q.modifyRef(ref, () => 'done')));
      yield T.delay(10);
      yield T.killFiber(new Error('nope'), fib);
      let ret: E.Either<Error, void> = yield T.attempt(T.joinFiber(fib));
      let s: string = yield Q.readRef(ref);
      return T.pure(s === 'cancel' && E.isLeft(ret) && ret.value.message === 'nope');
    })));

    test('kill fiber that have supervised context', Q.assertTask(T.co(function* () {
      const sup = T.makeSupervisor();
      function action(s: string) {
        return T.delay(20).map(() => s);
      }
      let fib: T.Fiber<string> = yield T.forkWith(sup, action('bar'));
      let fib2: T.Fiber<string> = yield T.forkWith(sup, action('foo'));
      yield T.killAll(new Error('kill All'), sup);
      const s1: E.Either<Error, string> = yield T.attempt(T.joinFiber(fib));
      const s2: E.Either<Error, string> = yield T.attempt(T.joinFiber(fib2));
      return T.pure(E.isLeft(s1) && E.isLeft(s2));
    })));
  });

  describe('Error handling & Joining forked Task', () => {
    test(
      'joining an error task should rethrown in current context',
      Q.assertTask(T.co(function* () {
        let fib = yield T.forkTask(T.co(function* () {
          yield T.delay(10);
          return T.Task.throwError(new Error('Nope.'));
        }));
        let et = yield T.attempt(T.joinFiber(fib));
        return T.Task.of(et.tag === E.EitherType.LEFT);
      }))
    );

    test(
      'join an error sync task should behave like async task',
      Q.assertTask(T.co(function* () {
        let fib = yield T.forkTask(T.Task.throwError(new Error('nope')));
        let et = yield T.attempt(T.joinFiber(fib));
        return T.Task.of(et.tag ===  E.EitherType.LEFT);
      }))
    );

    test(
      'propagate Error that thrown in sync Task',
      Q.assertTask(
        T.attempt(T.liftEff(null, () => {
          throw new Error('sync error');
        })).map(e => e.tag === E.EitherType.LEFT)
      )
    );

    test('multi join', Q.assertTask(taskMultiJoin));
  });

  describe('Race', () => {
    test(
      'select the first success',
      Q.shouldBe(1, T.race([ T.delay(10).map(_ => 1), T.delay(10).map(_ => 2) ]))
    );

    test('select the fast one (fast in last)', Q.shouldBe(8, T.race([
      T.delay(100).map(_ => 10),
      T.delay(90).map(_ => 9),
      T.delay(10).map(_ => 8)
    ])));

    test('work even if some task throw an error', Q.shouldBe(5, T.race([
      T.delay(10).then(T.raise(new Error('failed 1'))),
      T.delay(100).map(_ => 9),
      T.delay(20).then(T.raise(new Error('failed'))),
      T.delay(40).map(_ => 5)
    ])));
  });

  describe('co fn', () => {
    test('can run more than once', Q.shouldBe(true, tsGen.then(tsGen).then(tsGen)));
  });

  describe('fromNodeBack', () => {
    test(
      'turn node callback into task correctly',
      Q.shouldBe('yes', T.node(null, 'yes', timer))
    );

    test(
      'can run multiple times',
      (function (t: T.Task<string>) {
        return Q.equals(t, t);
      })(T.node(null, 'yes', timer))
    );
  });

  describe('bothPar', () => {
    test('wait both task to completed', Q.shouldBe(
      ['a', 'b'],
      T.bothPar([ T.node(null, 'a', timer), T.node(null, 'b', timer)])
    ));

    test('if one fail, both task raised error', Q.assertTask(
      T.attempt(
        T.bothPar([ T.node(null, 'a', timer), T.raise(new Error('fail'))])
      ).map(E.isLeft)
    ));
  });

  describe('both', () => {
    test(
      'complete the task with pair of result of two task',
      Q.shouldBe(
        ['a', 1],
        T.both([ T.delay(50).map(() => 'a'), T.delay(50).map(() => 1)])
      )
    );
  });

  describe('Semigroup', () => {
    test('associativity (old Semigroup)', (function () {
      const a = T.pure(Q.WrappedString.from('foo'));
      const b = T.pure(Q.WrappedString.from('bar'));
      const c = T.pure(Q.WrappedString.from('baz'));

      return Q.equals(a.concat(b).concat(c), a.concat(b.concat(c)));
    }()));

    test('associativity (new Semigroup)', (function () {
      const a = T.pure(Q.WrappedString.from('foo'));
      const b = T.pure(Q.WrappedString.from('bar'));
      const c = T.pure(Q.WrappedString.from('baz'));

      return Q.equals(
        a['fantasy-land/concat'](b)['fantasy-land/concat'](c),
        a['fantasy-land/concat'](b['fantasy-land/concat'](c))
      );
    }()));
  });
});
