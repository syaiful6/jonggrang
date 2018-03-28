import 'mocha';
import { expect } from 'chai';
import * as H from '../../src/date';
import * as P from '@jonggrang/prelude';


describe('HTTP Date', () => {
  describe('parseHTTPDate', () => {
    it('can parse RFC2616', () => {
      const str = 'Tue, 15 Nov 1994 12:45:26 GMT';
      const date = H.parseHTTPDate(str);
      /*tslint:disable */
      expect(P.isJust(date)).to.be.true;
      /*tslint:enable */
      expect((date as any).value).to.be.deep.equals(new H.HttpDate(1994, 10, 15, 12, 45, 26, 2));
    });
  });

  describe('formatHttpDate', () => {
    it('behave like model', () => {
      for (let i = 0; i < 100000; i += 10000000000) {
        const date = new Date(i);
        const hdate = H.fromDate(date);
        expect(date.toUTCString()).to.be.equals(H.formatHttpDate(hdate));
      }
    });
  });
});
