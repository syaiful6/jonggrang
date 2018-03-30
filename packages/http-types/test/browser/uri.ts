import 'mocha';
import { expect } from 'chai';
import * as P from '@jonggrang/prelude';

import * as uri from '../../src/uri';

const enum URIType {
  AbsId,
  AbsRf,
  RelRf,
  InvRf
}

function isValidT(t: URIType) {
  return t === URIType.InvRf ? false : true;
}

// function isAbsRfT(t: URIType) {
//   return t === URIType.AbsId || t === URIType.AbsRf;
// }

function isRelRfT(t: URIType) {
  return t === URIType.RelRf;
}

function isAbsIdT(t: URIType) {
  return t === URIType.AbsId;
}

function testEq(s: string, a: any, b: any) {
  expect(a).to.be.deep.equals(b, s);
}

function testURIRef(t: URIType, u: string) {
  testEq('test_isURIReference: ' + u, isValidT(t), uri.isURIReference(u));
  testEq('test_isRelativeReference: ' + u, isRelRfT(t), uri.isRelativeReference(u));
  testEq('test_isAbsoluteURI: ' + u, isAbsIdT(t), uri.isAbsoluteURI(u));
}

function testURIRefComponents(msg: string, uv: P.Maybe<uri.URI>, str: string) {
  testEq('testURIRefComponents: ' + str, uv, uri.parseURIReference(str));
}

describe('HTTP URI', () => {
  describe('parsing URIRef', () => {
    it('parse URIRef correctly', () => {
      testURIRef(URIType.AbsRf, 'http://example.org/aaa/bbb#ccc');
      testURIRef(URIType.AbsId, 'mailto:local@domain.org');
      testURIRef(URIType.AbsRf, 'mailto:local@domain.org#frag');
      testURIRef(URIType.AbsRf, 'HTTP://EXAMPLE.ORG/AAA/BBB#CCC');
      testURIRef(URIType.RelRf, '//example.org/aaa/bbb#ccc');
      testURIRef(URIType.RelRf, '/aaa/bbb#ccc');
      testURIRef(URIType.RelRf, 'bbb#ccc');
      testURIRef(URIType.RelRf, '#ccc');
      testURIRef(URIType.RelRf, '#');
      testURIRef(URIType.RelRf, '/');
    });

    it('parse escapes URIRef escaped', () => {
      testURIRef(URIType.AbsRf, 'http://example.org/aaa%2fbbb#ccc');
      testURIRef(URIType.AbsRf, 'http://example.org/aaa%2Fbbb#ccc');
      testURIRef(URIType.RelRf, '%2F');
      testURIRef(URIType.RelRf, 'aaa%2Fbbb');
    });

    it('parse URI with port', () => {
      testURIRef(URIType.AbsRf, 'http://example.org:80/aaa/bbb#ccc');
      testURIRef(URIType.AbsRf, 'http://example.org:/aaa/bbb#ccc');
      testURIRef(URIType.AbsRf, 'http://example.org./aaa/bbb#ccc');
      testURIRef(URIType.AbsRf, 'http://example.123./aaa/bbb#ccc');
    });

    it('parse bare authority', () => {
      testURIRef(URIType.AbsId, 'http://example.org');
    });

    it('parse IPv6 literals - RFC2732', () => {
      ([
        [ URIType.AbsId, 'http://[FEDC:BA98:7654:3210:FEDC:BA98:7654:3210]:80/index.html' ],
        [ URIType.AbsId, 'http://[1080:0:0:0:8:800:200C:417A]/index.html' ],
        [ URIType.AbsId, 'http://[3ffe:2a00:100:7031::1]' ],
        [ URIType.AbsId, 'http://[1080::8:800:200C:417A]/foo' ],
        [ URIType.AbsId, 'http://[::192.9.5.5]/ipng' ],
        [ URIType.AbsId, 'http://[::FFFF:129.144.52.38]:80/index.html' ],
        [ URIType.AbsId, 'http://[2010:836B:4179::836B:4179]' ],
        [ URIType.RelRf, '//[2010:836B:4179::836B:4179]' ],
        [ URIType.InvRf, '[2010:836B:4179::836B:4179]' ],
        [ URIType.AbsId, 'http://[fe80::ff:fe00:1%25eth0]' ]
      ] as [URIType, string][]).forEach(([type, str]) => testURIRef(type, str));
    });

    it('RFC2396 test cases', () => {
      ([
        [ URIType.RelRf, './aaa' ],
        [ URIType.RelRf, '../aaa' ],
        [ URIType.AbsId, 'g:h' ],
        [ URIType.RelRf, 'g' ],
        [ URIType.RelRf, './g' ],
        [ URIType.RelRf, 'g/' ],
        [ URIType.RelRf, '/g' ],
        [ URIType.RelRf, '//g' ],
        [ URIType.RelRf, '?y' ],
        [ URIType.RelRf, 'g?y' ],
        [ URIType.RelRf, '#s' ],
        [ URIType.RelRf, 'g#s' ],
        [ URIType.RelRf, 'g?y#s' ],
        [ URIType.RelRf, ';x' ],
        [ URIType.RelRf, 'g;x' ],
        [ URIType.RelRf, 'g;x?y#s'],
        [ URIType.RelRf, '.' ],
        [ URIType.RelRf, './' ],
        [ URIType.RelRf, '..' ],
        [ URIType.RelRf, '../' ],
        [ URIType.RelRf, '../g' ],
        [ URIType.RelRf, '../..' ],
        [ URIType.RelRf, '../../' ],
        [ URIType.RelRf, '../../g' ],
        [ URIType.RelRf, '../../../g' ],
        [ URIType.RelRf, '../../../../g' ],
        [ URIType.RelRf, '/./g' ],
        [ URIType.RelRf, '/../g' ],
        [ URIType.RelRf, 'g.' ],
        [ URIType.RelRf, '.g' ],
        [ URIType.RelRf, 'g..' ],
        [ URIType.RelRf, '..g' ],
        [ URIType.RelRf, './../g' ],
        [ URIType.RelRf, './g/.' ],
        [ URIType.RelRf, 'g/./h' ],
        [ URIType.RelRf, 'g/../h' ],
        [ URIType.RelRf, 'g;x=1/./y'],
        [ URIType.RelRf, 'g;x=1/../y' ],
        [ URIType.RelRf, 'g?y/./x' ],
        [ URIType.RelRf, 'g?y/../x' ],
        [ URIType.RelRf, 'g#s/./x' ],
        [ URIType.RelRf, 'g#s/../x' ],
        [ URIType.RelRf, '' ],
        [ URIType.RelRf, 'A\'C' ],
        [ URIType.RelRf, 'A$C' ],
        [ URIType.RelRf, 'A@C' ],
        [ URIType.RelRf, 'A,C' ],
      ] as [URIType, string][]).forEach(([type, str]) => testURIRef(type, str));
    });

    it('passed invalid URI didn\'t crash and return correctly', () => {
      [ 'http://foo.org:80Path/More"' , '::' , ' ' , '%' , 'A%Z', '%ZZ', '%AZ'
      , 'A C', 'A"C', 'A`C', 'A<C', 'A>C', 'A^C', 'A\\C', 'A{C', 'A|C', 'A}C'
      , 'A[C', 'A]C', 'A[**]C', 'http://[xyz]/', 'http://]/'
      , 'http://example.org/[2010:836B:4179::836B:4179]'
      , 'http://example.org/abc#[2010:836B:4179::836B:4179]'
      , 'http://example.org/xxx/[qwerty]#a[b]'
      ].forEach(str => testURIRef(URIType.InvRf, str));
    });

    it('test other scheme', () => {
      ([
        [ URIType.AbsRf, 'http://example/Andr&#567;' ],
        [ URIType.AbsId, 'file:///C:/DEV/Haskell/lib/HXmlToolbox-3.01/examples/' ],
        [ URIType.AbsId, 'http://46229EFFE16A9BD60B9F1BE88B2DB047ADDED785/demo.mp3' ],
        [ URIType.InvRf, 'http://example.org/xxx/qwerty#a#b' ],
        [ URIType.InvRf, 'dcp.tcp.pft://192.168.0.1:1002:3002?fec=1&crc=0' ],
        [ URIType.AbsId, 'dcp.tcp.pft://192.168.0.1:1002?fec=1&crc=0' ],
        [ URIType.AbsId, 'foo://' ]
      ] as [URIType, string][]).forEach(([type, str]) => testURIRef(type, str));
    });

    it('parses URIs prefixed with IPv4 addresses', () => {
      testURIRef(URIType.AbsId, 'http://192.168.0.1.example.com/');
      testURIRef(URIType.AbsId, 'http://192.168.0.1.example.com./');
      testURIRef(URIType.AbsId, 'http://192.168.0.1test.example.com/');
    });

    it('parses URI with IPv(future) address', () => {
      testURIRef(URIType.AbsId, 'http://[v9.123.abc;456.def]/');
      const uriAuth = P.chainMaybe(uri.parseURI('http://[v9.123.abc;456.def]:42/'), ret => ret.auth);
      expect(uriAuth).to.be.deep.equal(P.just(uri.mkURIAuth('', '[v9.123.abc;456.def]', ':42')));
    });
  });

  describe('URI components', () => {
    it('correctly decompose URI into components', () => {
      testURIRefComponents(
        'testComponent01',
        P.just(uri.mkURI('http:', P.just(uri.mkURIAuth('user:pass@', 'example.org', ':99')), '/aaa/bbb',
                         '?qqq', '#fff')),
        'http://user:pass@example.org:99/aaa/bbb?qqq#fff'
      );

      testURIRefComponents(
        'testComponent02',
        P.nothing,
        'http://user:pass@example.org:99aaa/bbb'
      );

      testURIRefComponents(
        'testComponent03',
        P.just(uri.mkURI('http:', P.just(uri.mkURIAuth('user:pass@', 'example.org', ':99')), '',
                         '?aaa/bbb', '')),
        'http://user:pass@example.org:99?aaa/bbb'
      );

      testURIRefComponents(
        'testComponent04',
        P.just(uri.mkURI('http:', P.just(uri.mkURIAuth('user:pass@', 'example.org', ':99')), '',
                         '', '#aaa/bbb')),
        'http://user:pass@example.org:99#aaa/bbb'
      );

      testURIRefComponents(
        'testComoinent05',
        P.just(uri.mkURI('about:', P.nothing, '', '', '')),
        'about:'
      );

      testURIRefComponents(
        'testComoinent06',
        P.just(uri.mkURI('file:', P.just(uri.mkURIAuth('', 'windowsauth', '')), '/d$', '', '')),
        'file://windowsauth/d$'
      );
    });
  });
});
