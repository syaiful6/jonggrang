import 'mocha';
import { expect } from 'chai';
import * as P from '@jonggrang/prelude';

import * as uri from '../../src';


const enum URIType {
  AbsId,
  AbsRf,
  RelRf,
  InvRf
}

function isValidT(t: URIType) {
  return t === URIType.InvRf ? false : true;
}

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

function testRelSplit(label: string, base: string, uabs: string, urel: string) {
  function mkRel(s: P.Maybe<uri.URI>, b: P.Maybe<uri.URI>) {
    if (P.isJust(s) && P.isJust(b)) {
      return uri.uriToString(iden, uri.relativeFrom(s.value, b.value));
    }
    return P.isNothing(s) ? `Invalid URI: ${urel}` : `Invalid URI: ${uabs}`;
  }

  const puabs = uri.parseURIReference(uabs);
  const pubas = uri.parseURIReference(base);

  return testEq(label, mkRel(puabs, pubas), urel);
}

function testRelJoin(label: string, base: string, urel: string, uabs: string) {
  function mkabs(s: P.Maybe<uri.URI>, b: P.Maybe<uri.URI>) {
    if (P.isJust(s) && P.isJust(b)) {
      return uri.uriToString(iden, uri.relativeTo(s.value, b.value));
    }
    return P.isNothing(s) ? `Invalid URI: ${urel}` : `Invalid URI: ${uabs}`;
  }

  const purel = uri.parseURIReference(urel);
  const pubas = uri.parseURIReference(base);
  return testEq(label, mkabs(purel, pubas), uabs);
}

function testRelative(label: string, base: string, uabs: string, urel: string) {
  testRelSplit(label + ' (rel)', base, uabs, urel);
  testRelJoin(label + ' (abs)', base, urel, uabs);
}

function iden<A>(a: A): A {
  return a;
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
        'testComponent05',
        P.just(uri.mkURI('about:', P.nothing, '', '', '')),
        'about:'
      );

      testURIRefComponents(
        'testComponent06',
        P.just(uri.mkURI('file:', P.just(uri.mkURIAuth('', 'windowsauth', '')), '/d$', '', '')),
        'file://windowsauth/d$'
      );
    });
  });

  describe('relative URI', () => {
    it('handle basic operation', () => {
      testRelative('testRelative01', 'foo:xyz', 'bar:abc', 'bar:abc');
      testRelative('testRelative2', 'http://example/x/y/z', 'http://example/x/abc', '../abc');
      testRelative('testRelative03', 'http://example2/x/y/z', 'http://example/x/abc', '//example/x/abc');
      testRelative('testRelative04', 'http://ex/x/y/z', 'http://ex/x/r', '../r');
      testRelative('testRelative05', 'http://ex/x/y/z', 'http://ex/r', '/r');
      testRelative('testRelative06', 'http://ex/x/y/z', 'http://ex/x/y/q/r', 'q/r');
    });

    it('handle URI fragment', () => {
      testRelative('testRelative07', 'http://ex/x/y', 'http://ex/x/q/r#s', 'q/r#s');
      testRelative('testRelative08', 'http://ex/x/y', 'http://ex/x/q/r#s/t', 'q/r#s/t');
    });

    it('handle different scheme', () => {
      testRelative('testRelative09', 'http://ex/x/y', 'ftp://ex/x/q/r', 'ftp://ex/x/q/r');
    });

    it('handle identical URI', () => {
      testRelative('testRelative10', 'http://ex/x/y', 'http://ex/x/y', '');
      testRelative('testRelative11', 'http://ex/x/y/', 'http://ex/x/y/', '');
      testRelative('testRelative12', 'http://ex/x/y/pdq', 'http://ex/x/y/pdq', '');
    });

    it('handle URI path', () => {
      testRelative('testRelative13', 'http://ex/x/y/', 'http://ex/x/y/z/', 'z/');
    });

    it('handle file scheme', () => {
      testRelative('testRelative14', 'file:/swap/test/animal.rdf', 'file:/swap/test/animal.rdf#animal', '#animal');
      testRelative('testRelative15', 'file:/e/x/y/z', 'file:/e/x/abc', '../abc');
      testRelative('testRelative16', 'file:/example2/x/y/z', 'file:/example/x/abc', '/example/x/abc');
      testRelative('testRelative17', 'file:/ex/x/y/z', 'file:/ex/x/r', '../r');
      testRelative('testRelative18', 'file:/ex/x/y/z', 'file:/r', '/r');
      testRelative('testRelative19', 'file:/ex/x/y', 'file:/ex/x/q/r', 'q/r');
      testRelative('testRelative20', 'file:/ex/x/y', 'file:/ex/x/q/r#s', 'q/r#s');
      testRelative('testRelative21', 'file:/ex/x/y', 'file:/ex/x/q/r#', 'q/r#');
      testRelative('testRelative22', 'file:/ex/x/y', 'file:/ex/x/q/r#s/t', 'q/r#s/t');
      // mix other scheme
      testRelative('testRelative23', 'file:/ex/x/y', 'ftp://ex/x/q/r', 'ftp://ex/x/q/r');
      // same URI
      testRelative('testRealtive24', 'file:/ex/x/y', 'file:/ex/x/y', '');
      testRelative('testRealtive25', 'file:/ex/x/y/', 'file:/ex/x/y/z/', 'z/');

      testRelative('testRelative26', 'file:/devel/WWW/2000/10/swap/test/reluri-1.n3',
                   'file://meetings.example.com/cal#m1', '//meetings.example.com/cal#m1');
      testRelative('testRelative27', 'file:/home/connolly/w3ccvs/WWW/2000/10/swap/test/reluri-1.n3',
                   'file://meetings.example.com/cal#m1', '//meetings.example.com/cal#m1');

      testRelative('testRelative28', 'file:/some/dir/foo', 'file:/some/dir/#blort', './#blort');
      testRelative('testRelative29', 'file:/some/dir/foo', 'file:/some/dir/#', './#');
    });

    it('handle RFC2396 section 5', () => {
      testRelative('testRelative30', 'http://ex/x/y', 'http://ex/x/q:r', './q:r');
      testRelative('testRelative31', 'http://ex/x/y', 'http://ex/x/p=q:r', './p=q:r');
      testRelative('testRelative32', 'http://ex/x/y?pp/qq', 'http://ex/x/y?pp/rr', '?pp/rr');
      testRelative('testRelative33', 'http://ex/x/y?pp/qq', 'http://ex/x/y/z', 'y/z');
      testRelative('testRelative34', 'mailto:local', 'mailto:local/qual@domain.org#frag',
                   'local/qual@domain.org#frag');
      testRelative('testRelative35', 'mailto:local/qual1@domain1.org',
                   'mailto:local/more/qual2@domain2.org#frag', 'more/qual2@domain2.org#frag');
      testRelative('testRelative36', 'http://ex/x/z?q', 'http://ex/x/y?q', 'y?q');
      testRelative('testRelative37', 'http://ex?p', 'http://ex/x/y?q', '/x/y?q');
      testRelative('testRelative38', 'foo:a/b', 'foo:a/c/d', 'c/d');
      testRelative('testRelative39', 'foo:a/b', 'foo:/c/d', '/c/d');
      testRelative('testRelative40', 'foo:a/b?c#d', 'foo:a/b?c', '');
      testRelative('testRelative41', 'foo:a', 'foo:b/c', 'b/c');
      testRelative('testRelative42', 'foo:/a/y/z', 'foo:/a/b/c', '../b/c');

      testRelJoin('testRelative43', 'foo:a', './b/c', 'foo:b/c');
      testRelJoin('testRelative44', 'foo:a', '/./b/c', 'foo:/b/c');
      testRelJoin('testRelative45', 'foo://a//b/c', '../../d', 'foo://a/d');
      testRelJoin('testRelative46', 'foo:a', '.', 'foo:');
      testRelJoin('testRelative47', 'foo:a', '..', 'foo:');
    });

    it('handle escaped URI', () => {
      testRelative('testRelative48', 'http://example/x/y%2Fz', 'http://example/x/abc', 'abc');
      testRelative('testRelaive49', 'http://example/a/x/y/z', 'http://example/a/x%2Fabc', '../../x%2Fabc');
      testRelative('testRelative50', 'http://example/a/x/y%2Fz', 'http://example/a/x%2Fabc', '../x%2Fabc');
      testRelative('testRelative51', 'http://example/x%2Fy/z', 'http://example/x%2Fy/abc', 'abc');
      testRelative('testRelative52', 'http://ex/x/y', 'http://ex/x/q%3Ar', 'q%3Ar');
      testRelative('tetstRelative53', 'http://example/x/y%2Fz', 'http://example/x%2Fabc', '/x%2Fabc');
      testRelative('testRelative54', 'http://example/x/y/z', 'http://example/x%2Fabc', '/x%2Fabc');
      testRelative('testRelative55', 'http://example/x/y%2Fz', 'http://example/x%2Fabc', '/x%2Fabc');
    });

    it('correctly normalize URI segment', () => {
      testRelJoin('testRelative56', 'ftp://example/x/y', 'http://example/a/b/../../c', 'http://example/c');
      testRelJoin('testRelative57', 'ftp://example/x/y', 'http://example/a/b/c/../../', 'http://example/a/');
      testRelJoin('testRelative58', 'ftp://example/x/y', 'http://example/a/b/c/./', 'http://example/a/b/c/');
      testRelJoin('testRelative59', 'ftp://example/x/y', 'http://example/a/b/c/.././', 'http://example/a/b/');
      testRelJoin('testRelative60', 'ftp://example/x/y', 'http://example/a/b/c/d/../../../../e', 'http://example/e');
      testRelJoin('testRelative61', 'ftp://example/x/y', 'http://example/a/b/c/d/../../../../../e', 'http://example/e');
      // Check handling of queries and fragments with non-relative paths
      testRelative('testRelative62', 'mailto:local1@domain1?query1', 'mailto:local2@domain2', 'local2@domain2');
      testRelative('testRelative63', 'mailto:local1@domain1', 'mailto:local2@domain2?query2', 'local2@domain2?query2');
      testRelative('testRelative64', 'mailto:local1@domain1?query1', 'mailto:local2@domain2?query2', 'local2@domain2?query2');
      testRelative('testRelative65', 'mailto:local@domain?query1', 'mailto:local@domain?query2', '?query2');
      testRelative('testRelative66', 'mailto:?query1', 'mailto:local@domain?query2', 'local@domain?query2');
      testRelative('testRelative67', 'mailto:local@domain?query1', 'mailto:local@domain?query2', '?query2');
      testRelative('testRelative68', 'foo:bar', 'http://example/a/b?c/../d', 'http://example/a/b?c/../d');
      testRelative('testRelative69', 'foo:bar', 'http://example/a/b#c/../d', 'http://example/a/b#c/../d');
      // awkward test, thrown up by a question: http://lists.w3.org/Archives/Public/uri/2005Jul/0013
      testRelative('testRelative70', 'http://www.example.com/data/limit/..',
                   'http://www.example.com/data/limit/test.xml', 'test.xml');
      testRelative('testRelative71', 'file:/some/dir/foo', 'file:/some/dir/#blort', './#blort');
      testRelative('testRelative72', 'file:/some/dir/foo', 'file:/some/dir/#', './#');
      testRelative('testRelative73', 'file:/some/dir/..', 'file:/some/dir/#blort', './#blort');

      testRelSplit('testRelative74', 'http://example.org/base/uri', 'http:this', 'this');
      testRelJoin('testRelative75', 'http://example.org/base/uri', 'http:this', 'http:this');
      testRelJoin('testRelative76', 'http:base', 'http:this', 'http:this');
      testRelJoin('testRelative77', 'f:/a', './/g', 'f://g');
      testRelJoin('testRelative78', 'f://example.org/base/a', 'b/c//d/e', 'f://example.org/base/b/c//d/e');
      testRelJoin('testRelative79', 'mid:m@example.ord/c@example.org', 'm2@example.ord/c2@example.org',
                  'mid:m@example.ord/m2@example.ord/c2@example.org');
      testRelJoin('testRelative80', 'file:///C:/DEV/Haskell/lib/HXmlToolbox-3.01/examples/',
                  'mini1.xml', 'file:///C:/DEV/Haskell/lib/HXmlToolbox-3.01/examples/mini1.xml');
      testRelative('testRelative81', 'foo:a/y/z', 'foo:a/b/c', '../b/c');
      testRelJoin('testRelative82', 'f:/a/', '..//g', 'f://g');
    });
  });

  describe('RFC2396 relative-to-absolute URI', () => {
    const RFCBASE = 'http://a/b/c/d;p?q';
    it('handle normal cases, RFC2396bis 5.4.1', () => {
      testRelJoin('testRFC01', RFCBASE, 'g:h', 'g:h');
      testRelJoin('testRFC02', RFCBASE, 'g', 'http://a/b/c/g');
      testRelJoin('testRFC03', RFCBASE, './g', 'http://a/b/c/g');
      testRelJoin('testRFC04', RFCBASE, 'g/', 'http://a/b/c/g/');
      testRelJoin('testRFC05', RFCBASE, '/g', 'http://a/g');
      testRelJoin('testRFC06', RFCBASE, '//g', 'http://g');
      testRelJoin('testRFC07', RFCBASE, '?y', 'http://a/b/c/d;p?y');
      testRelJoin('testRFC08', RFCBASE, 'g?y', 'http://a/b/c/g?y');
      testRelJoin('testRFC09', RFCBASE, '?q#s', 'http://a/b/c/d;p?q#s');
      testRelJoin('testRFC10', RFCBASE, '#s', 'http://a/b/c/d;p?q#s');
      testRelJoin('testRFC11', RFCBASE, 'g#s', 'http://a/b/c/g#s');
      testRelJoin('testRFC12', RFCBASE, 'g?y#s', 'http://a/b/c/g?y#s');

      testRelJoin('testRFC14', RFCBASE, 'g;x', 'http://a/b/c/g;x');
      testRelJoin('testRFC15', RFCBASE, 'g;x?y#s', 'http://a/b/c/g;x?y#s');
      testRelJoin('testRFC16', RFCBASE, '', 'http://a/b/c/d;p?q');
      testRelJoin('testRFC17', RFCBASE, '.', 'http://a/b/c/');
      testRelJoin('testRFC18', RFCBASE, './', 'http://a/b/c/');
      testRelJoin('testRFC19', RFCBASE, '..', 'http://a/b/');
      testRelJoin('testRFC20', RFCBASE, '../', 'http://a/b/');
      testRelJoin('testRFC21', RFCBASE, '../g', 'http://a/b/g');
      testRelJoin('testRFC22', RFCBASE, '../..', 'http://a/');
      testRelJoin('testRFC23', RFCBASE, '../../', 'http://a/');
      testRelJoin('testRFC24', RFCBASE, '../../g', 'http://a/g');
    });

    it('handle abnormal cases, RFC2396bis 5.4.2', () => {
      testRelJoin('testRFC25', RFCBASE, '?q', RFCBASE);
      testRelJoin('testRFC26', RFCBASE, '../../../g', 'http://a/g');
      testRelJoin('testRFC27', RFCBASE, '../../../../g', 'http://a/g');
      testRelJoin('testRFC28', RFCBASE, '/./g', 'http://a/g');
      testRelJoin('testRFC29', RFCBASE, '/../g', 'http://a/g');
      testRelJoin('testRFC30', RFCBASE, 'g.', 'http://a/b/c/g.');
      testRelJoin('testRFC31', RFCBASE, '.g', 'http://a/b/c/.g');
      testRelJoin('testRFC32', RFCBASE, 'g..', 'http://a/b/c/g..');
      testRelJoin('testRFC33', RFCBASE, '..g', 'http://a/b/c/..g');
      testRelJoin('testRFC34', RFCBASE, './../g', 'http://a/b/g');
      testRelJoin('testRFC35', RFCBASE, './g/.', 'http://a/b/c/g/');
      testRelJoin('testRFC36', RFCBASE, 'g/./h', 'http://a/b/c/g/h');
      testRelJoin('testRFC37', RFCBASE, 'g/../h', 'http://a/b/c/h');
      testRelJoin('testRFC38', RFCBASE, 'g;x=1/./y', 'http://a/b/c/g;x=1/y');
      testRelJoin('testRFC39', RFCBASE, 'g;x=1/../y', 'http://a/b/c/y');
      testRelJoin('testRFC40', RFCBASE, 'g?y/./x', 'http://a/b/c/g?y/./x');
      testRelJoin('testRFC41', RFCBASE, 'g?y/../x', 'http://a/b/c/g?y/../x');
      testRelJoin('testRFC42', RFCBASE, 'g#s/./x', 'http://a/b/c/g#s/./x');
      testRelJoin('testRFC43', RFCBASE, 'g#s/../x', 'http://a/b/c/g#s/../x');
      testRelJoin('testRFC44', RFCBASE, 'http:x', 'http:x');
    });

    it('handle null path, RFC2396bis, section 5.2', () => {
      testRelative('testRFC45', 'http://ex', 'http://ex/x/y?q', '/x/y?q');
      testRelJoin('testRFC46', 'http://ex', 'x/y?q', 'http://ex/x/y?q');
      testRelative('testRFC47', 'http://ex?p', 'http://ex/x/y?q', '/x/y?q');
      testRelJoin('testRFC48', 'http://ex?p', 'x/y?q', 'http://ex/x/y?q');
      testRelative('testRFC49', 'http://ex#f', 'http://ex/x/y?q', '/x/y?q');
      testRelJoin('testRFC50', 'http://ex#f', 'x/y?q', 'http://ex/x/y?q');
      testRelative('testRFC51', 'http://ex?p', 'http://ex/x/y#g', '/x/y#g');
      testRelJoin('testRFC52', 'http://ex?p', 'x/y#g', 'http://ex/x/y#g');
      testRelative('testRFC53', 'http://ex', 'http://ex/', '/');
      testRelJoin('testRFC54', 'http://ex', './', 'http://ex/');
      testRelative('testRFC55', 'http://ex', 'http://ex/a/b', '/a/b');
    });

    it('handle other oddballs correctly', () => {
      const MAILBASE = 'mailto:local/option@domain.org?notaquery#frag';

      testRelJoin('testMail01', MAILBASE, 'more@domain', 'mailto:local/more@domain');
      testRelJoin('testMail02', MAILBASE, '#newfrag', 'mailto:local/option@domain.org?notaquery#newfrag');
      testRelJoin('testMail03', MAILBASE, 'l1/q1@domain', 'mailto:local/l1/q1@domain');

      testRelJoin('testMail04', 'mailto:local1@domain1?query1', 'mailto:local2@domain2',
                  'mailto:local2@domain2');
      testRelJoin('testMail05', 'mailto:local1@domain1', 'mailto:local2@domain2?query2',
                  'mailto:local2@domain2?query2');
      testRelJoin('testMail06', 'mailto:local1@domain1?query1', 'mailto:local2@domain2?query2',
                  'mailto:local2@domain2?query2');
      testRelJoin('testMail07', 'mailto:local@domain?query1', 'mailto:local@domain?query2',
                  'mailto:local@domain?query2');
      testRelJoin('testMail08', 'mailto:?query1', 'mailto:local@domain?query2', 'mailto:local@domain?query2');
      testRelJoin('testMail09', 'mailto:local@domain?query1', '?query2', 'mailto:local@domain?query2');

      testRelJoin('testInfo01', 'info:name/1234/../567', 'name/9876/../543', 'info:name/name/543');
      testRelJoin('testInfo02', 'info:/name/1234/../567', 'name/9876/../543', 'info:/name/name/543');
    });
  });

  describe('URI Normalization', () => {
    it('handle case normalization; cf. RFC2396bis section 6.2.2.1', () => {
      testEq('testNormalize01', 'http://EXAMPLE.com/Root/%2A?%2B#%2C',
             uri.normalizeCase('HTTP://EXAMPLE.com/Root/%2a?%2b#%2c'));
    });

    it('handle encoding normalization', () => {
      testEq('testNormalize02', 'HTTP://EXAMPLE.com/Root/~Me/',
             uri.normalizeEscape('HTTP://EXAMPLE.com/Root/%7eMe/'));
      testEq('testNormalize03', 'foo:%40AZ%5b%60az%7b%2f09%3a-._~',
             uri.normalizeEscape('foo:%40%41%5a%5b%60%61%7a%7b%2f%30%39%3a%2d%2e%5f%7e'));
      testEq('testNomrmalize04', 'foo:%3a%2f%3f%23%5b%5d%40',
             uri.normalizeEscape('foo:%3a%2f%3f%23%5b%5d%40'));
    });

    it('handle path segment normalization; cf. RFC2396bis section 6.2.2.4', () => {
      testEq('testNormalize05', 'http://example/c', uri.normalizePathSegments('http://example/a/b/../../c'));
      testEq('testNormalize06', 'http://example/a/', uri.normalizePathSegments('http://example/a/b/c/../../'));
      testEq('testNormalize07', 'http://example/a/b/c/', uri.normalizePathSegments('http://example/a/b/c/./'));
      testEq('testNormalize08', 'http://example/a/b/', uri.normalizePathSegments('http://example/a/b/c/.././'));
      testEq('testNormalize09', 'http://example/e', uri.normalizePathSegments('http://example/a/b/c/d/../../../../e'));
      testEq('testNormalize10', 'http://example/e', uri.normalizePathSegments('http://example/a/b/c/d/../.././../../e'));
      testEq('testNormalize11', 'http://example/e', uri.normalizePathSegments('http://example/a/b/../.././../../e'));
      testEq('testNormalize12', 'foo:e', uri.normalizePathSegments('foo:a/b/../.././../../e'));
    });
  });

  describe('URI formatting', () => {
    const TESTURI = uri.mkURI('http:', P.just(uri.mkURIAuth('user:pass@', 'example.org', ':99')),
                              '/aaa/bbb', '?ccc', '#ddd/eee');
    it('show null URI return empty string', () => {
      const nullURI = uri.mkURI('', P.nothing, '', '', '');
      expect(uri.showURI(nullURI)).to.be.equals('');
    });

    it('show URI surpress suppress user info', () => {
      expect(uri.showURI(TESTURI)).to.be.equals('http://user:...@example.org:99/aaa/bbb?ccc#ddd/eee');
    });

    it('uriToString didn\'t surpass surpress suppress user info', () => {
      expect(uri.uriToString(iden, TESTURI)).to.be.equals('http://user:pass@example.org:99/aaa/bbb?ccc#ddd/eee');
    });
  });
});
