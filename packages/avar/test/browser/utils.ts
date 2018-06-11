import * as assert from 'assert';

import * as T from '@jonggrang/task';


function pair<A, B>(a: A): (b: B) => [A, B] {
  return (b: B) => [a, b];
}

export function id<A>(a: A) {
  return a;
}

export function equals<A>(t: T.Task<A>, b: T.Task<A>): Promise<void> {
  return T.toPromise(t.map(pair).ap(b).chain(([a, b]) => {
    return T.liftEff(null, () => {
      assert.deepEqual(a, b);
    });
  }));
}

export function shouldBe<A>(a: A, t: T.Task<A>): Promise<void> {
  return T.toPromise(t.chain(b => {
    return T.liftEff(null, () => {
      assert.deepEqual(a, b);
    });
  }));
}

export function assertTask(t: T.Task<boolean>): Promise<void> {
  return T.toPromise(t.chain(b => {
    return T.liftEff(null, () => {
      assert.equal(b, true);
    });
  }));
}
