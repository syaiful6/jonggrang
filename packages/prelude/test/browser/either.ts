import 'mocha';
import { expect } from 'chai';
import * as E from '../../src/either';

describe('Prelude Either', () => {
  describe('chainEither', () => {
    it('does not call functions if the either is Left', () => {
      let ix = 0;
      function transform(a: string) {
        ix++;
        return E.right('fail');
      }
      let e = E.chainEither(transform, E.left('error'));
      expect(ix).to.be.equals(0);
      expect(e).to.be.deep.equals({ tag: E.EitherType.LEFT, value: 'error' });
    });

    it('sequencing of `Either` values and functions that return Either', () => {
      function transform(a: string) {
        return E.right(a + 'sequencing');
      }
      let t = E.chainEither(transform, E.right('value'));
      expect(t.tag).to.be.equals(E.EitherType.RIGHT);
      expect(t.value).to.be.equals('valuesequencing');
    });
  });
});
