import { expect } from 'chai';

import * as T from '@jonggrang/task';

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
