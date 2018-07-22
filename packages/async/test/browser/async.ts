import * as T from '@jonggrang/task';
import { isLeft, right, nothing, just, Maybe } from '@jonggrang/prelude';

import * as S from '../../src/async';
import { shouldBe, assertTask, tdeepEq } from './utils';


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

  it('compete should return the fastest task', function () {
    return shouldBe(
      right('right'),
      S.compete(
        T.delay(30).map(() => 'left'),
        T.delay(20).map(() => 'right')
      )
    );
  });

  it('wither can map a structure async', function () {
    return shouldBe(
      [3, 4, 5],
      S.wither(['0', '1', '2', '3', '4', '5', 'a'], filterDigit)
    );
  });

  it('witherPar should behave like wither', function () {
    const inputs = ['0', '1', '2', 'a', 'b', '4', '5'];
    return tdeepEq(S.wither(inputs, filterDigit), S.witherPar(inputs, filterDigit));
  });

  it('witherLim should behave like wither', function () {
    const inputs = ['0', '1', '2', 'a', 'b', '4', '5'];
    return tdeepEq(S.wither(inputs, filterDigit), S.witherLim(4, inputs, filterDigit));
  });

  it('eachOfObj traversals', function () {
    return shouldBe(
      { a: 'A', b: 'B', c: 'C', d: 'D', e: 'E', f: 'F', g: '' },
      S.eachObj({ a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6 }, toAlpha)
    );
  });
});

function filterDigit(s: string): T.Task<Maybe<number>> {
  const x = parseInt(s, 10);
  return isNaN(x) || x < 3 ? T.delay(10).map(() => nothing)
    : T.delay(5).map(() => just(x));
}

function toAlpha(s: number): T.Task<string> {
  const alpha = s === 0 ? 'A' : s === 1 ? 'B' : s === 2 ? 'C'
    : s === 3 ? 'D' : s === 4 ? 'E' : s === 5 ? 'F' : '';

  return T.delay(10).map(() => alpha);
}
