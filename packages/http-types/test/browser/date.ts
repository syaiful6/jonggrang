import 'mocha';
import { expect } from 'chai';
import * as H from '../../src/date';
import * as P from '@jonggrang/prelude';

describe('HTTP Date', () => {
  describe('parseHTTPDate', () => {
    it('can parse RFC2616', () => {
      const str = 'Tue, 15 Nov 1994 12:45:26 GMT';
      const date = H.parseHTTPDate(str);
      expect(P.isJust(date)).to.be.true;
      expect((date as any).value).to.be.deep.equals(new H.HttpDate(1994, 10, 15, 12, 45, 26, 2));
    });
  });

  describe('formatHttpDate', () => {
    it('behave like model', () => {
      const date = new Date();
      const hdate = H.fromDate(date);
      expect(date.toUTCString()).to.be.equals(H.formatHttpDate(hdate));
    })
  });
})
