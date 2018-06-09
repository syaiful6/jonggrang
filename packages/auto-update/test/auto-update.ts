import 'mocha';
import { expect } from 'chai';
import * as T from '@jonggrang/task';
import * as R from '@jonggrang/ref';
import { mkAutoUpdate } from '../src/auto-update';

function range(start: number, end: number): number[] {
  let xs: number[] = [];
  for (; start < end; start++) {
    xs.push(start);
  }
  return xs;
}

describe('auto update', function () {
  it('correctly handle cached data', function () {
    this.timeout(1000);
    return T.toPromise(T.co(function* () {
      const ref: R.Ref<number> = yield R.newRef(0);
      const update: T.Task<number> = R.modifyRef_(ref, i => [i + 1, i + 1]);
      const next: T.Task<number> = yield mkAutoUpdate({ delay: 100, task: update });
      yield T.forIn_(range(1, 11), i => {
        return next.chain(j => {
          expect(i === j && i !== 1).to.be.equals(false);
          return T.pure(void 0);
        });
      });
      yield T.delay(300);
      const last1: number = yield R.readRef(ref);
      yield T.delay(200);
      const last2: number = yield R.readRef(ref);
      expect(last1).to.be.equals(last2);
      return T.pure(void 0);
    }));
  });
});
