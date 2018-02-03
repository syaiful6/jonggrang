import * as T from '@jonggrang/task';
import * as R from '@jonggrang/ref';

export interface Loop<A> {
  loop: (i: A) => T.Task<Loop<A>>;
  tick: () => T.Task<Loop<A>>;
}

export type EvInstance<O> = {
  run: T.Task<void>;
  push: (o: O) => T.Task<void>;
};

export type EvQueue<I, O> = (ei: EvInstance<O>) => T.Task<Loop<I>>;

export type EvAccum<S, I> = {
  init: S;
  update: (s: S, i: I) => T.Task<S>;
  commit: (s: S) => T.Task<S>;
}

export function stepper<I, O>(k: (_: I) => T.Task<O>): EvQueue<I, O> {
  return function queue(next) {
    function tick(): T.Task<Loop<I>> {
      return T.pure({ loop, tick });
    }

    function loop(i: I): T.Task<Loop<I>> {
      return k(i)
        .chain(v => next.push(v))
        .then(next.run)
        .then(T.pure({ loop, tick }))
    }

    return tick();
  }
}

export function withCont<I, O>(k: (ei: EvInstance<O>, i: I) => T.Task<void>): EvQueue<I, O> {
  return function queue(next) {
    function push(i: I) {
      return k(next, i);
    }
    function loop(i: I) {
      return push(i).then(T.pure({ loop, tick }))
    }

    function tick() {
      return T.pure({ loop, tick });
    }

    return tick();
  }
}

export function withAccum<S, I, O>(
  specFn: (ei: EvInstance<O>) => T.Task<EvAccum<S, I>>
): EvQueue<I, O> {
  return function queue(next) {
    return specFn(next).map(spec => {
      function tick(s: S) {
        return {
          loop: (i: I) => update(s, i),
          tick: commit(s)
        }
      }
      function update(s: S, i: I) {
        return spec.update(s, i).map(tick);
      }
      function commit(s: S) {
        return () => spec.commit(s).map(tick)
      }
      return tick(spec.init);
    })
  }
}

export function withAccumArray<I, O>(
  specFn: (ei: EvInstance<O>) => T.Task<(i: I[]) => T.Task<void>>
): EvQueue<I, O> {
  return withAccum(next => {
    return specFn(next).map(spec => {
      function update(b: I[], i: I) {
        let b2 = b.slice();
        b2.push(i);
        return T.pure(b2)
      }
      function commit(buf: I[]) {
        return spec(buf).map(() => []);
      }
      return { commit, update, init: [] };
    })
  });
}

export function fix<I>(
  proc: EvQueue<I, I>
): T.Task<EvInstance<I>> {
  return R.newRef<I[]>([])
    .chain(queue => {
      return R.newRef<Loop<I> | undefined>(void 0)
        .chain(machine => {
          function push(i: I): T.Task<void> {
            return R.modifyRef(queue, ys => {
              let xs = ys.slice();
              xs.push(i);
              return xs;
            })
          }
          const run: T.Task<void> =
            R.modifyRef_(machine, x => [void 0, x]).chain(i => traverse_(loop, i));
          function loop(mc: Loop<I>): T.Task<void> {
            return R.readRef(queue)
              .chain(q => {
                if (q.length > 0) {
                  let head = q[0],
                    tail = q.slice(1);
                  return R.writeRef(queue, tail)
                    .chain(() => mc.loop(head).chain(loop))
                }
                return mc.tick()
                  .chain(st => {
                    return R.readRef(queue)
                      .chain(q2 => {
                        if (q2.length === 0) {
                          return R.writeRef(machine, st)
                            .then(R.writeRef(queue, []))
                        }
                        return loop(st);
                      })
                  })
              })
          }
          const inst: EvInstance<I> = { run, push };
          return proc(inst)
            .chain(step => {
              return R.writeRef(machine, step).then(T.pure(inst))
            });
        })
    });
}

function foldr_<A, B>(
  f: (a: A, b: B) => B,
  b: B,
  fa: A | null | undefined
): B {
  if (fa == null) return b;
  return f(fa, b);
}

function traverse_<A, B>(
  f: (_: A) => T.Task<B>,
  fa: A | null | undefined
): T.Task<void> {
  return foldr_((a, b) => f(a).then(b), T.pure(void 0), fa)
}
