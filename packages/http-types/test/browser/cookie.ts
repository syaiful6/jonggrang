import 'mocha';
import { expect } from 'chai';
import * as CO from '../../src/cookie';
import * as P from '@jonggrang/prelude';


describe('HTTP Cookie', () => {
  describe('parseCookies', () => {
    it('Can parse basic cookiess', () => {
      expect(CO.parseCookies('yummy_cookie=choco'))
        .to.deep.equals([CO.createCookieKV('yummy_cookie', 'choco')]);
    });

    it('Can parse two or more cookies', () => {
      const cookie = 'yummy_cookie=choco; tasty_cookie=strawberry';
      expect(CO.parseCookies(cookie)).to.deep.equals([
        CO.createCookieKV('yummy_cookie', 'choco'),
        CO.createCookieKV('tasty_cookie', 'strawberry')
      ]);
    });

    it('Duplicate cookies are parsed', () => {
      const cookie = 'duplicate=; yummy_cookie=choco; duplicate=yes';
      expect(CO.parseCookies(cookie)).to.deep.equals([
        CO.createCookieKV('duplicate', ''),
        CO.createCookieKV('yummy_cookie', 'choco'),
        CO.createCookieKV('duplicate', 'yes')
      ]);
    });

    it('Ignore spaces', () => {
      const cookie = 'foo  =  bar; baz  =  raz';
      expect(CO.parseCookies(cookie)).to.deep.equals([
        CO.createCookieKV('foo', 'bar'),
        CO.createCookieKV('baz', 'raz')
      ]);
    });

    it('Escaping', () => {
      const cookie = 'foo="bar=123456789&name=Magic+Mouse"';
      expect(CO.parseCookies(cookie)).to.deep.equals([
        CO.createCookieKV('foo', 'bar=123456789&name=Magic+Mouse')
      ]);

      const cookie2 = 'email=%20%22%2c%3b%2f';
      expect(CO.parseCookies(cookie2)).to.deep.equals([
        CO.createCookieKV('email', ' ",;/')
      ]);
    });

    it('Ignore escaping error', () => {
      const cookie = 'foo=%1;bar=bar';
      expect(CO.parseCookies(cookie)).to.deep.equals([
        CO.createCookieKV('foo', '%1'),
        CO.createCookieKV('bar', 'bar')
      ]);
    });
  });

  describe('renderCookie', () => {
    it('render basic Cookie', () => {
      expect(CO.renderCookie(P.nothing, CO.createCookieKV('foo', 'bar'))).to.be.deep.equals(
        P.right('foo=bar; Path=/; HttpOnly')
      );
      expect(CO.renderCookie(P.nothing, CO.createCookieKV('foo', 'bar baz'))).to.be.deep.equals(
        P.right('foo=bar%20baz; Path=/; HttpOnly')
      );
      expect(CO.renderCookie(P.nothing, CO.createCookieKV('foo', ''))).to.be.deep.equals(
        P.right('foo=; Path=/; HttpOnly')
      );
      // return left
      expect(CO.renderCookie(P.nothing, CO.createCookieKV('foo\n', 'bar')).value)
        .to.be.match(/Cookie name is invalid/);
      expect(CO.renderCookie(P.nothing, CO.createCookieKV('foo\u280a', 'baz')).value)
        .to.be.match(/Cookie name is invalid/);
    });

    it('can render all options', () => {
      const cookie = CO.createCookie('foo', 'baz', '/', 'example.com', true, true, 'LAX');
      /* tslint:disable */
      const RE = /foo=baz; Domain=example\.com; Path=\/; Max-Age=([0-9]{1,}); Expires=(\w{3},\s[\w\d\s-]{9,11}\s[\d:]{8}\sGMT); HttpOnly; Secure; SameSite=LAX$/;
      /* tslint:enable */
      const life = CO.calculateCookieLife(Date.now(), CO.cookieLifeExpired);
      expect(CO.renderCookie(life, cookie).value).to.be.match(RE);
    });

    it('can render Cookie path', () => {
      const cookie = CO.createCookie('foo', 'bar', '/', undefined, false, false, undefined);
      expect(CO.renderCookie(P.nothing, cookie)).to.be.deep.equals(P.right('foo=bar; Path=/'));

      const cookieInvalidPath = CO.createCookie('foo', 'bar', '/\n', undefined, false, false, undefined);
      expect(CO.renderCookie(P.nothing, cookieInvalidPath).value).to.be.match(/Cookie path is invalid/);
    });

    it('can render Cookie secure', () => {
      const cookieSecure = CO.createCookie('foo', 'baz', undefined, undefined, true, false, undefined);
      expect(CO.renderCookie(P.nothing, cookieSecure)).to.be.deep.equals(P.right('foo=baz; Secure'));

      const cookieNonSecure = CO.createCookie('foo', 'baz', undefined, undefined, false, false, undefined);
      expect(CO.renderCookie(P.nothing, cookieNonSecure)).to.be.deep.equals(P.right('foo=baz'));
    });

    it('can render Cookie domain', () => {
      const cookie = CO.createCookie('foo', 'baz', undefined, 'example.com', false, false, undefined);
      expect(CO.renderCookie(P.nothing, cookie)).to.be.deep.equals(P.right('foo=baz; Domain=example.com'));

      const cookieDI = CO.createCookie('foo', 'baz', undefined, 'example.com\n', false, false, undefined);
      expect(CO.renderCookie(P.nothing, cookieDI).value).to.be.match(/Cookie domain is invalid/);
    });

    it('can render Cookie HttpOnly', () => {
      const cookie = CO.createCookie('foo', 'baz', undefined, undefined, false, true, undefined);
      expect(CO.renderCookie(P.nothing, cookie)).to.be.deep.equals(P.right('foo=baz; HttpOnly'));
    });

    it('can render Cookie expires', () => {
      // if cookie expires is set, both expires and maxAge will be set
      const cookie = CO.createCookie('foo', 'bar', undefined, undefined, false, false, undefined);
      const RE = /foo=bar; Max-Age=([0-9]{1,}); Expires=(\w{3},\s[\w\d\s-]{9,11}\s[\d:]{8}\sGMT)$/;
      const life = CO.calculateCookieLife(Date.now(), CO.cookieLifeMaxAge(86400));
      expect(CO.renderCookie(life, cookie).value).to.be.match(RE);
    });
  });
});
