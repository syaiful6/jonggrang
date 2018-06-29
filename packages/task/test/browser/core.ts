import * as P from '@jonggrang/prelude';

import * as T from '../../src';
import * as Q from './utils';


function after<A>(ms: number, a: A): T.Task<A> {
  return T.delay(ms).map(() => a);
}

function raiseAfter(ms: number): T.Task<any> {
  return T.delay(ms).chain(() => T.raise(new Error('raise after')));
}

function timer(v: Error | string, cb: (err: Error | null, t?: string) => void): void {
  setTimeout(() => {
    if (v instanceof Error) {
      return cb(v);
    }
    cb(null, v);
  }, 50);
}

function add(x: number, y: number) {
  return x + y;
}

function sum(xs: number[]): number {
  return xs.reduce(add, 0);
}

describe('Task Core', function () {
  describe('attempt()', function () {
    it('resolve with right if task success', function () {
      return Q.assertTask(T.attempt(after(10, 'foo')).map(P.isRight));
    });

    it('resolve with left it task failed', function () {
      return Q.assertTask(T.attempt(raiseAfter(10)).map(P.isLeft));
    });
  });

  describe('suspend', function () {
    it('didn\'t run until it joined', function () {
      return Q.shouldBe('goparentchild', T.co(function* () {
        let ref: Q.Ref<string> = yield Q.newRef('');
        let fib: T.Fiber<string> = yield T.suspendTask(
          T.delay(10).chain(_ => Q.modifyRef(ref, s => s + 'child'))
        );
        yield Q.modifyRef(ref, x => x + 'go');
        yield T.delay(20);
        yield Q.modifyRef(ref, x => x + 'parent');
        yield T.joinFiber(fib);
        return Q.readRef(ref);
      }));
    });
  });

  describe('fork', function () {
    it('can forked task', function () {
      this.timeout(40);

      return Q.shouldBe('gochildparent', T.co(function* () {
        let ref: Q.Ref<string> = yield Q.newRef('');
        yield T.forkTask(T.delay(10).chain(() => Q.modifyRef(ref, s => s + 'child')));
        yield Q.modifyRef(ref, s => s + 'go');
        yield T.delay(20);
        yield Q.modifyRef(ref, s => s + 'parent');
        return Q.readRef(ref);
      }));
    });

    it('can forked bracket task', function () {
      return Q.assertTask(
        T.bracket(
          T.forkTask(T.delay(10)),
          () => T.pure(void 0),
          () => after(10, true)
        )
      );
    });
  });

  describe('joinFiber', function () {
    it('join fiber return result of forked task', function () {
      return Q.shouldBe('parentchild', T.co(function* () {
        let ref: Q.Ref<string> = yield Q.newRef('');
        let fib: T.Fiber<string> = yield T.forkTask(T.co(function* () {
          yield T.delay(10);
          yield Q.modifyRef(ref, s => s + 'child');
          return Q.readRef(ref);
        }));
        yield Q.modifyRef(ref, s => s + 'parent');
        return T.joinFiber(fib);
      }));
    });

    it('join failed task should rethrow in the current fiber', function () {
      return Q.assertTask(T.co(function* () {
        let fib: T.Fiber<any> = yield T.forkTask(raiseAfter(20));
        return T.attempt(T.joinFiber(fib)).map(P.isLeft);
      }));
    });

    it('join failed sync task should rethrow in the current fiber', function () {
      return Q.assertTask(T.co(function* () {
        let fib = yield T.forkTask(T.raise(new Error('Nope.')));
        return T.attempt(T.joinFiber(fib)).map(P.isLeft);
      }));
    });

    it('can join many fibers', function () {
      return Q.shouldBe([50, 3], T.co(function* () {
        let ref: Q.Ref<number> = yield Q.newRef(1);
        const f1: T.Fiber<number> = yield T.forkTask(T.co(function* () {
          yield T.delay(10);
          yield Q.modifyRef(ref, x => x + 1);
          return T.pure(10);
        }));
        const f2: T.Fiber<number> = yield T.forkTask(T.co(function* () {
          yield T.delay(20);
          yield Q.modifyRef(ref, x => x + 1);
          return T.pure(20);
        }));

        return T.both(
          T.forIn([f1, f1, f1, f2], T.joinFiber).map(sum),
          Q.readRef(ref)
        );
      }));
    });
  });

  describe('bracket', function () {
    it('correctly run acquire, release and run', function () {
      return Q.shouldBe(['foo', 'foo/run', 'foo/release'], T.co(function* () {
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

        return Q.readRef(ref);
      }));
    });

    it('correctly run acquire, release and run in nested bracket', function () {
      const expectation = [
        'foo/bar',
        'foo/bar/run',
        'foo/bar/release',
        'foo/bar/run/run/bar',
        'foo/bar/run/run/bar/run',
        'foo/bar/run/run/bar/release',
        'foo/bar/run/release/bar',
        'foo/bar/run/release/bar/run',
        'foo/bar/run/release/bar/release'
      ];
      return Q.shouldBe(expectation, T.co(function* () {
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

        return Q.readRef(ref);
      }));
    });
  });

  describe('supervise', function () {
    it('supervise', function () {
      return Q.shouldBe(['done', 'acquiredonerelease'], T.co(function* () {
        let ref: Q.Ref<string> = yield Q.newRef('');
        let r1: string = yield T.supervise(T.co(function* () {
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
        return T.both(T.pure(r1), Q.readRef(ref));
      }));
    });
  });

  describe('killFiber', function () {
    it('can kill fiber', function () {
      return Q.assertTask(T.forkTask(T.never)
        .chain(fiber =>
          T.killFiber(new Error('nope'), fiber)
            .chain(() => T.attempt(T.joinFiber(fiber)).map(P.isLeft))));
    });

    it('killing fiber call task\'s canceller', function () {
      return Q.assertTask(T.co(function* () {
        let ref: Q.Ref<string> = yield Q.newRef('');
        let fib: T.Fiber<void> = yield T.forkTask(T.makeTask(() => {
          return () => T.delay(20).chain(() => Q.modifyRef(ref, () => 'cancel'));
        }).chain(() => Q.modifyRef(ref, () => 'done')));
        yield T.delay(10);
        yield T.killFiber(new Error('nope'), fib);
        let ret: P.Either<Error, void> = yield T.attempt(T.joinFiber(fib));
        let s: string = yield Q.readRef(ref);
        return T.pure(s === 'cancel' && P.isLeft(ret) && ret.value.message === 'nope');
      }));
    });

    it('kill fiber that have supervised context', function () {
      return Q.assertTask(T.co(function* () {
        const sup = T.makeSupervisor();
        function action(s: string) {
          return T.delay(20).map(() => s);
        }
        let fib: T.Fiber<string> = yield T.forkWith(sup, action('bar'));
        let fib2: T.Fiber<string> = yield T.forkWith(sup, action('foo'));
        yield T.killAll(new Error('kill All'), sup);
        const s1: P.Either<Error, string> = yield T.attempt(T.joinFiber(fib));
        const s2: P.Either<Error, string> = yield T.attempt(T.joinFiber(fib2));
        return T.pure(P.isLeft(s1) && P.isLeft(s2));
      }));
    });
  });

  describe('Error handling & Joining forked Task', function () {
    it('joining an error task should rethrown in current context', function () {
      return Q.assertTask(T.co(function* () {
        let fib: T.Fiber<any> = yield T.forkTask(T.co(function* () {
          yield T.delay(10);
          return T.raise(new Error('Nope.'));
        }));

        return T.attempt(T.joinFiber(fib)).map(P.isLeft);
      }));
    });

    it('join an error sync task should behave like async task', function () {
      return Q.assertTask(T.co(function* () {
        let fib: T.Fiber<any> = yield T.forkTask(T.raise(new Error('nope')));
        return T.attempt(T.joinFiber(fib)).map(P.isLeft);
      }));
    });

    it('propagate Error that thrown in sync Task', function () {
      return Q.assertTask(
        T.attempt(T.liftEff(null, () => {
          throw new Error('sync error');
        })).map(P.isLeft)
      );
    });
  });

  describe('Race', function () {
    it('select the first success', function () {
      return Q.shouldBe(2, T.race([ after(20, 1), after(10, 2), after(60, 3) ]));
    });

    it('work even if some task throw an error', function () {
      return Q.shouldBe(4, T.race([
        raiseAfter(10),
        after(100, 2),
        raiseAfter(20),
        after(20, 4)
      ]));
    });
  });

  describe('node', function () {
    it('can turn node js callback to task', function () {
      return Q.shouldBe('yes', T.node(null, 'yes', timer));
    });

    it('can run multiple times', function () {
      const t = T.node(null, 'yes', timer);
      return Q.equals(t, t);
    });

    it('correctly handle error case', function () {
      return Q.assertTask(T.attempt(T.node(null, new Error('fail'), timer)).map(P.isLeft));
    });
  });

  describe('both', function () {
    it('wait complete the task with pair of result of two task', function () {
      return Q.shouldBe([1, 'foo'], T.both(after(10, 1), after(20, 'foo')));
    });
  });

  describe('bothPar', function () {
    it('wait both task to completed', function () {
      return Q.shouldBe([1, 'foo'], T.bothPar(after(10, 1), after(20, 'foo')));
    });

    it('if one fail, it raise an error', function () {
      return Q.assertTask(T.attempt(T.bothPar( after(10, 'a'), raiseAfter(20))).map(P.isLeft));
    });
  });

  describe('semigroup', function () {
    it('associativity (old Semigroup', function () {
      const a = T.pure(Q.WrappedString.from('foo'));
      const b = T.pure(Q.WrappedString.from('bar'));
      const c = T.pure(Q.WrappedString.from('baz'));

      return Q.equals(a.concat(b).concat(c), a.concat(b.concat(c)));
    });

    it('associativity (new Semigroup)', function () {
      const a = T.pure(Q.WrappedString.from('foo'));
      const b = T.pure(Q.WrappedString.from('bar'));
      const c = T.pure(Q.WrappedString.from('baz'));

      return Q.equals(
        a['fantasy-land/concat'](b)['fantasy-land/concat'](c),
        a['fantasy-land/concat'](b['fantasy-land/concat'](c))
      );
    });
  });

  describe('Traversing (ignore result)', function () {
    it('forIn_ correctly run in order', function () {
      return Q.shouldBe(['a', 'b', 'c'], T.co(function* () {
        const ref: Q.Ref<string[]> = yield Q.newRef([]);
        yield T.forIn_(['a', 'b', 'c'], item =>
          T.delay(10).chain(() => Q.modifyRef(ref, xs => xs.concat(item))));
        return Q.readRef(ref);
      }));
    });

    it('merge_ correctly run in order', function () {
      return Q.shouldBe(['a', 'b'], T.co(function* () {
        const ref: Q.Ref<string[]> = yield Q.newRef([]);
        yield T.merge_([
          T.delay(10).chain(() => Q.modifyRef(ref, xs => xs.concat('a'))),
          T.delay(10).chain(() => Q.modifyRef(ref, xs => xs.concat('b'))),
        ]);
        return Q.readRef(ref);
      }));
    });
  });

  describe('Parallel task', function () {
    it('parallel', function () {
      return Q.assertTask(T.co(function* () {
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
      }));
    });

    it('raise error if one Parallel failed', function () {
      this.timeout(100);

      return Q.assertTask(T.co(function* () {
        let ref: Q.Ref<string> = yield Q.newRef('');

        function action(n: number, s: string) {
          return T.delay(n)
            .chain(() => Q.modifyRef(ref, t => t + s))
            .map(() => s);
        }

        function combine(a: string) {
          return (b: string) => ({ a, b });
        }

        let r1: P.Either<Error, { a: string; b: string; }> = yield T.attempt(T.sequential(
          action(10, 'foo').chain(() => T.raise(new Error('Nope')))
            .parallel()
            .map(combine)
            .ap(T.parallel(T.never))
        ));
        const r2: string = yield Q.readRef(ref);

        return T.pure(P.isLeft(r1) && r2 === 'foo');
      }));
    });

    it('Alt instance is select the first task to resolve', function () {
      return Q.assertTask(T.co(function* () {
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
      }));
    });

    it('can kill Parallel when using .alt', function () {
      return Q.assertTask(T.co(function* () {
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
      }));
    });

    it('can kill Parallel .alt - finalizer', function () {
      return Q.assertTask(T.co(function* () {
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
      }));
    });
  });

  describe('fromPromise', function () {
    it('resolves with the resolution value of the returned Promise', function () {
      return Q.shouldBe('good', T.fromPromise(null, () => Promise.resolve('good')));
    });

    it('rejects with rejection reason of the returned Promise', function () {
      return Q.assertTask(T.co(function* () {
        const ret: P.Either<Error, any> = yield T.attempt(
          T.fromPromise(null, () => Promise.reject(new Error('bad')))
        );
        return T.pure(P.isLeft(ret) && ret.value.message === 'bad');
      }));
    });
  });
});
