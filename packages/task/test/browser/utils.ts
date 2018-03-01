import { expect } from 'chai';

import * as T from '../../src';
import { either, left } from '@jonggrang/prelude';

function pair<A, B>(a: A): (b: B) => [A, B] {
  return (b: B) => [a, b]
}

export function id<A>(a: A) {
  return a
}

export function equals<A>(t: T.Task<A>, b: T.Task<A>): T.Task<void> {
  return t.map(pair).ap(b).chain(([a, b]) => {
    return T.liftEff(null, () => {
      expect(a).to.deep.equal(b)
    })
  });
}

export function shouldBe<A>(a: A, t: T.Task<A>): T.Task<void> {
  return t.chain(b => {
    return T.liftEff(null, () => {
      expect(a).to.deep.equal(b);
    })
  })
}

export function assertTask(t: T.Task<boolean>): T.Task<void> {
  return t.chain(b => {
    return T.liftEff(null, () => {
      expect(b).to.be.equal(true)
    })
  })
}

export function withTimeout<A>(timeout: number, t: T.Task<A>): T.Task<A> {
  return T.sequential(
    T.parallel(
      T.attempt(t)
    ).alt(
      T.parallel(
        T.delay(timeout)).map(() => left(new Error('Timed out')))
  )).chain(e => either(T.raise, T.pure, e))
}

export type Ref<A> = {
  value: A
}

export function newRef<A>(a: A): T.Task<Ref<A>> {
  return T.liftEff(null, () => ({ value: a }))
}

export function readRef<A>(ref: Ref<A>): T.Task<A> {
  return T.liftEff(null, () => ref.value);
}

export function modifyRef<A>(ref: Ref<A>, f: (_: A) => A): T.Task<void> {
  return T.liftEff(null, () => {
    ref.value = f(ref.value);
    return;
  });
}
