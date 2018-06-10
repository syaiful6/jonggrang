import 'mocha';
import assert from 'assert';
import * as jsv from 'jsverify';
import * as H from '../../src/date';
import * as P from '@jonggrang/prelude';


describe('HTTP Date', () => {
  describe('parseHTTPDate', () => {
    it('can parse RFC2616', () => {
      const str = 'Tue, 15 Nov 1994 12:45:26 GMT';
      const date = H.parseHTTPDate(str);
      assert.ok(P.isJust(date));
      assert.deepEqual((date as any).value, new H.HttpDate(1994, 10, 15, 12, 45, 26, 2));
    });
  });

  describe('formatHttpDate', () => {
    jsv.property('behave like model', jsv.datetime, date =>
      H.formatHttpDate(H.fromDate(date)) === date.toUTCString()
    );
  });
});
