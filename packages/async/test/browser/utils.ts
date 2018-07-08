import * as AV from '@jonggrang/avar';
import * as T from '@jonggrang/task';


export type Forked<A> = [T.Fiber<A>, AV.AVar<void>];

export function fork<A>(t: T.Task<A>): T.Task<Forked<A>> {
  return AV.newEmptyAVar.chain(avar =>
    T.forkTask(T.ensure(t, AV.putAVar(avar, void 0))).chain(fib =>
      T.delay(10).map(() => [fib, avar] as [T.Fiber<A>, AV.AVar<void>])
    )
  );
}

export function stop<A>(fib: T.Fiber<A>, av: AV.AVar<void>): T.Task<void> {
  return T.killFiber(new Error('stop'), fib)
    .chain(() => T.delay(10).chain(() => AV.takeAVar(av)));
}

export function test(s: string, fn: () => Iterator<T.Task<any>>) {
  it(s, function () {
    return T.toPromise(T.co(fn));
  });
}
