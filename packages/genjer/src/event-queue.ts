import * as T from '@jonggrang/task';

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

export function withAccumArray<S, I, O>(
  specFn: (ei: EvInstance<O>) => T.Task<I[] => T.Task<void>>
): EvQueue<I, O> {
  return withAccum(next => {
    return specFn(next).map(spec => {
      function update(b: I[], i: I) {
        let b2 = b.slice();
        b2.push(i);
        return T.pure(b2)
      }
    })
  });
}
