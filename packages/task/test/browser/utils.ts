import { expect } from 'chai';

import * as T from '../../src';

function pair<A, B>(a: A): (b: B) => [A, B] {
  return (b: B) => [a, b]
}

export function id<A>(a: A) {
  return a
}

export function equals<A>(t: T.Task<A>, b: T.Task<A>): T.Task<void> {
  return t.map(pair).ap(b).chain(([a, b]) => {
    return T.liftEff(() => {
      expect(a).to.deep.equal(b)
    })
  });
}

export function shouldBe<A>(a: A, t: T.Task<A>): T.Task<void> {
  return t.chain(b => {
    return T.liftEff(() => {
      expect(a).to.deep.equal(b);
    })
  })
}

export function assertTask(t: T.Task<boolean>): T.Task<void> {
  return t.chain(b => {
    return T.liftEff(() => {
      expect(b).to.be.equal(true)
    })
  })
}

export type Ref<A> = {
  value: A
}

export function newRef<A>(a: A): T.Task<Ref<A>> {
  return T.liftEff(() => ({ value: a }))
}

export function readRef<A>(ref: Ref<A>): T.Task<A> {
  return T.liftEff(() => ref.value);
}

export function modifyRef<A>(ref: Ref<A>, f: (_: A) => A): T.Task<void> {
  return T.liftEff(() => {
    ref.value = f(ref.value);
    return;
  });
}
