import 'mocha';
import { expect } from 'chai';

import * as P from '@jonggrang/prelude';
import * as PS from '../../src';


function canParse(p: PS.Parser<any>, s: string): boolean {
  return P.isRight(PS.runParser(p, s));
}

// function parseFail(p: PS.Parser<any>, s: string): boolean {
//   return P.isLeft(PS.runParser(p, s));
// }

function repeat(n: number, s: string) {
  let acc = s;
  while (n > 0) {
    acc += s;
    n--;
  }
  return acc;
}

function expectResult<A>(res: A, p: PS.Parser<A>, s: string) {
  expect(PS.runParser(p, s)).to.deep.equals(P.right(res));
}

describe('Parsing', () => {
  describe('Basic', () => {
    it('many should not blow the stack', () => {
      /* tslint:disable */
      expect(canParse(PS.many(PS.string('a')), repeat(10000, 'a'))).to.be.true;
      /* tslint:enable */
    });

    it('can parse string', () => {
      expectResult('foo', PS.string('foo'), 'foobar');
    });

    it('many return array', () => {
      expectResult(['a', 'a', 'a'], PS.many(PS.string('a')), 'aaa');
    });
  });
});
