import * as assert from 'assert';
import * as CO from '../../src/cookie';
import * as P from '@jonggrang/prelude';


describe('HTTP Cookie', () => {
  describe('parseCookies', () => {
    it('Can parse basic cookiess', () => {
      assert.deepEqual(
        CO.parseCookies('yummy_cookie=choco'),
        [CO.createCookieKV('yummy_cookie', 'choco')]
      );
    });

    it('Can parse two or more cookies', () => {
      const cookie = 'yummy_cookie=choco; tasty_cookie=strawberry';
      assert.deepEqual(
        CO.parseCookies(cookie),
        [ CO.createCookieKV('yummy_cookie', 'choco')
        , CO.createCookieKV('tasty_cookie', 'strawberry')
        ]
      );
    });

    it('Duplicate cookies are parsed', () => {
      const cookie = 'duplicate=; yummy_cookie=choco; duplicate=yes';
      assert.deepEqual(
        CO.parseCookies(cookie),
        [ CO.createCookieKV('duplicate', '')
        , CO.createCookieKV('yummy_cookie', 'choco')
        , CO.createCookieKV('duplicate', 'yes')
        ]
      );
    });

    it('Ignore spaces', () => {
      const cookie = 'foo  =  bar; baz  =  raz';
      assert.deepEqual(
        CO.parseCookies(cookie),
        [ CO.createCookieKV('foo', 'bar')
        , CO.createCookieKV('baz', 'raz')
        ]
      );
    });

    it('Escaping', () => {
      const cookie = 'foo="bar=123456789&name=Magic+Mouse"';
      assert.deepEqual(
        CO.parseCookies(cookie),
       [ CO.createCookieKV('foo', 'bar=123456789&name=Magic+Mouse') ]
      );

      const cookie2 = 'email=%20%22%2c%3b%2f';
      assert.deepEqual(
        CO.parseCookies(cookie2),
        [ CO.createCookieKV('email', ' ",;/') ]
      );
    });

    it('Ignore escaping error', () => {
      const cookie = 'foo=%1;bar=bar';
      assert.deepEqual(
        CO.parseCookies(cookie),
        [ CO.createCookieKV('foo', '%1')
        , CO.createCookieKV('bar', 'bar')
        ]
      );
    });
  });

  describe('renderCookie', () => {
    it('render basic Cookie', () => {
      assert.deepEqual(
        CO.renderCookie(P.nothing, CO.createCookieKV('foo', 'bar')),
        P.right('foo=bar; Path=/; HttpOnly')
      );

      assert.deepEqual(
        CO.renderCookie(P.nothing, CO.createCookieKV('foo', 'bar baz')),
        P.right('foo=bar%20baz; Path=/; HttpOnly')
      );

      assert.deepEqual(
        CO.renderCookie(P.nothing, CO.createCookieKV('foo', '')),
        P.right('foo=; Path=/; HttpOnly')
      );

      assert.ok(
        /Cookie name is invalid/.exec(CO.renderCookie(P.nothing, CO.createCookieKV('foo\u280a', 'baz')).value),
      );

      assert.ok(
        /Cookie name is invalid/.exec(CO.renderCookie(P.nothing, CO.createCookieKV('foo\u280a', 'baz')).value)
      );
    });

    it('can render all options', () => {
      const cookie = CO.createCookie('foo', 'baz', '/', 'example.com', true, true, 'LAX');
      /* tslint:disable */
      const RE = /foo=baz; Domain=example\.com; Path=\/; Max-Age=([0-9]{1,}); Expires=(\w{3},\s[\w\d\s-]{9,11}\s[\d:]{8}\sGMT); HttpOnly; Secure; SameSite=LAX$/;
      /* tslint:enable */
      const life = CO.calculateCookieLife(Date.now(), CO.cookieLifeExpired);
      assert.ok(
        RE.exec(CO.renderCookie(life, cookie).value)
      );
    });

    it('can render Cookie path', () => {
      const cookie = CO.createCookie('foo', 'bar', '/', undefined, false, false, undefined);
      assert.deepEqual(
        CO.renderCookie(P.nothing, cookie),
        P.right('foo=bar; Path=/')
      );

      const cookieInvalidPath = CO.createCookie('foo', 'bar', '/\n', undefined, false, false, undefined);
      assert.ok(
        /Cookie path is invalid/.exec(CO.renderCookie(P.nothing, cookieInvalidPath).value)
      );
    });

    it('can render Cookie secure', () => {
      const cookieSecure = CO.createCookie('foo', 'baz', undefined, undefined, true, false, undefined);
      assert.deepEqual(
        CO.renderCookie(P.nothing, cookieSecure),
        P.right('foo=baz; Secure')
      );

      const cookieNonSecure = CO.createCookie('foo', 'baz', undefined, undefined, false, false, undefined);
      assert.deepEqual(
        CO.renderCookie(P.nothing, cookieNonSecure),
        P.right('foo=baz')
      );
    });

    it('can render Cookie domain', () => {
      const cookie = CO.createCookie('foo', 'baz', undefined, 'example.com', false, false, undefined);
      assert.deepEqual(
        CO.renderCookie(P.nothing, cookie),
        P.right('foo=baz; Domain=example.com')
      );

      const cookieDI = CO.createCookie('foo', 'baz', undefined, 'example.com\n', false, false, undefined);
      assert.ok(
        /Cookie domain is invalid/.exec(CO.renderCookie(P.nothing, cookieDI).value)
      );
    });

    it('can render Cookie HttpOnly', () => {
      const cookie = CO.createCookie('foo', 'baz', undefined, undefined, false, true, undefined);
      assert.deepEqual(
        CO.renderCookie(P.nothing, cookie),
        P.right('foo=baz; HttpOnly')
      );
    });

    it('can render Cookie expires', () => {
      // if cookie expires is set, both expires and maxAge will be set
      const cookie = CO.createCookie('foo', 'bar', undefined, undefined, false, false, undefined);
      const RE = /foo=bar; Max-Age=([0-9]{1,}); Expires=(\w{3},\s[\w\d\s-]{9,11}\s[\d:]{8}\sGMT)$/;
      const life = CO.calculateCookieLife(Date.now(), CO.cookieLifeMaxAge(86400));
      assert.ok(
        RE.exec(CO.renderCookie(life, cookie).value)
      );
    });
  });

  describe('lookupCookie', () => {
    it('return nothing if no cookie found', () => {
      const ret = CO.lookupCookie('foo', []);
      assert.deepEqual(ret, P.nothing);
    });

    it('return the cookie in array', () => {
      const ret = CO.lookupCookie('foo', [
        CO.createCookieKV('foo', 'bar'),
        CO.createCookieKV('baz', 'bazz')
      ]);
      assert.deepEqual(ret, P.just(CO.createCookieKV('foo', 'bar')));
    });
  });

  describe('lookupCookieValue', () => {
    it('return nothing if no cookie found', () => {
      const ret = CO.lookupCookieValue('foo', []);
      assert.deepEqual(ret, P.nothing);
    });

    it('return the cookie in array', () => {
      const ret = CO.lookupCookieValue('foo', [
        CO.createCookieKV('foo', 'bar'),
        CO.createCookieKV('baz', 'bazz')
      ]);
      assert.deepEqual(ret, P.just('bar'));
    });
  });
});
