import 'mocha';
import { expect } from 'chai';
import * as jsv from 'jsverify';
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
    jsv.property('behave like model', jsv.datetime, date =>
      H.formatHttpDate(H.fromDate(date)) === date.toUTCString()
    );
  });
});
