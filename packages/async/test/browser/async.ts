import * as T from '@jonggrang/task';
import { isLeft } from '@jonggrang/prelude';

import * as S from '../../src/async';
import { shouldBe, assertTask } from './utils';


describe('Async functions', function () {
  it('#eachOfLim work correctly', function () {
    return shouldBe(
      [false, false, false, true, true, true],
      S.eachOfLim(3, [1, 2, 3, 4, 5, 6], x => T.delay(5).map(() => x > 3))
    );
  });

  it('#eachOfLim should return error if given zero or less', function () {
    return assertTask(
      T.attempt(S.eachOfLim(-3, [1, 2, 3], T.pure)).map(isLeft)
    );
  });
});
