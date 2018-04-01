import * as P from '@jonggrang/prelude';
import * as PS from '@jonggrang/parsing';
import { isHexTable } from './internal/querystring';


/**
 * Represents a general universal resource identifier using its component parts.
 * For example, for the URI:
 * foo://anonymous@www.haskell.org:42/ghc?query#frag
 */
export interface URI {
  scheme: string; // foo:
  auth: P.Maybe<URIAuth>; // //anonymous@www.haskell.org:42
  path: string; // /ghc
  query: string; // ?query
  fragment: string; // #frag
}

export interface URIAuth {
  userInfo: string; // anonymous@
  port: string; // :42
  regName: string; // www.haskell.org
}

export function mkURI(scheme: string, auth: P.Maybe<URIAuth>, path: string, query: string, fragment: string): URI {
  return { scheme, auth, path, query, fragment };
}

export function mkURIAuth(userInfo: string, regName: string, port: string) {
  return { userInfo, port, regName };
}

export function uriToString(fn: (s: string) => string, uri: URI): string {
  return uri.scheme + uriAuthToString(fn, uri.auth) + uri.path + uri.query + uri.fragment;
}

export function uriAuthToString(fn: (s: string) => string, auth: P.Maybe<URIAuth>): string {
  if (P.isNothing(auth)) return '';

  const uriAuth = auth.value;
  return `//${uriAuth.userInfo.length === 0 ? '' : fn(uriAuth.userInfo)}${uriAuth.regName}${uriAuth.port}`;
}

export function ensurePrefix(p: string, s: string): string {
  const ix = p.length > s.length ? -1 : s.indexOf(p);
  return ix === 0 ? s : p + s;
}

export function uriIsAbsolute(uri: URI): boolean {
  return uri.scheme !== '';
}

export function uriIsRelative(uri: URI): boolean {
  return !uriIsAbsolute(uri);
}

const hexDigitChar: PS.Parser<string> = PS.satisfy(isHexDigitAt);

const escaped: PS.Parser<string> = sequenceP([ PS.char('%'), hexDigitChar, hexDigitChar ]).map(joinStr);

const subDelims = PS.oneOf(['!', '$', '&', '\'', '(', ')', '*', '+', ',', ';', '=']);

const unreservedChar = PS.satisfy(isUnreserved);

const uscheme: PS.Parser<string> = PS.co(function* () {
  const s: string = yield oneThenMany(PS.anyLetter, PS.satisfy(isSchemeChar)).map(joinStr);
  yield PS.char(':');
  return PS.pure(s + ':');
});

const userinfo: PS.Parser<string> = PS.co(function* () {
  const uu: string[] = yield PS.many(uchar(';:&=+$,'));
  yield PS.char('@');
  return PS.pure(uu.join('') + '@');
});

const ipvFuture: PS.Parser<string> = PS.co(function* () {
  const h: string = yield PS.between(PS.char('v'), PS.char('.'), hexDigitChar);
  const a = yield PS.many1(PS.satisfy(isIpvFutureChar)).map(joinStr);
  return PS.pure(`v${h}.${a}`);
});

const decOctet: PS.Parser<string> = PS.co(function* () {
  const a1: string = yield countMinMax(1, 3, hexDigitChar).map(joinStr);
  let s = parseFloat(a1);
  if (isNaN(s) || s > 255) return PS.fail('Decimal octet value too large');
  return PS.pure(a1);
});

const nameChar = unreservedChar.alt(escaped).alt(subDelims);

const ipv4address: PS.Parser<string> = PS.co(function* () {
  const a1: string = yield decOctet;
  yield PS.char('.');
  const a2: string = yield decOctet;
  yield PS.char('.');
  const a3: string = yield decOctet;
  yield PS.char('.');
  const a4: string = yield decOctet;
  yield notFollowedBy(nameChar);
  return PS.pure(`${a1}.${a2}.${a3}.${a4}`);
});

const zoneid: PS.Parser<string> = PS.many1(unreservedChar.alt(escaped)).map(joinStr);

const h4: PS.Parser<string> = countMinMax(1, 4, hexDigitChar).map(joinStr);

const h4c: PS.Parser<string> = PS.attempt(PS.co(function* () {
  const a1: string = yield h4;
  yield PS.char(':');
  yield notFollowedBy(PS.char(':'));
  return PS.pure(a1 + ':');
}));

const ls32: PS.Parser<string> = PS.attempt(h4c.chain(a => h4.map(a2 => a + a2))).alt(ipv4address);

function optNH4cH4(n: number): PS.Parser<string> {
  return PS.option('', PS.co(function* () {
    const a1: string = yield countMinMax(0, n, h4c).map(joinStr);
    const a2: string = yield h4;
    return PS.pure(a1 + a2);
  }));
}

const ipv6address: PS.Parser<string> = PS.attempt(
  countP(6, h4c).chain(a2 => ls32.map(a3 => a2 + a3))
).alt(PS.attempt(
  PS.string('::').chain(() => countP(5, h4c).map(joinStr))
    .chain(a2 => ls32.map(a3 => `::${a2}${a3}`))
)).alt(PS.attempt(PS.co(function* () {
  const a1: string = yield optNH4cH4(0);
  yield PS.string('::');
  const a2: string = yield countP(4, h4c).map(joinStr);
  const a3: string = yield ls32;
  return PS.pure(`${a1}::${a2}${a3}`);
}))).alt(PS.attempt(PS.co(function* () {
  const a1: string = yield optNH4cH4(1);
  yield PS.string('::');
  const a2: string = yield countP(3, h4c).map(joinStr);
  const a3: string = yield ls32;
  return PS.pure(`${a1}::${a2}${a3}`);
}))).alt(PS.attempt(PS.co(function* () {
  const a1: string = yield optNH4cH4(2);
  yield PS.string('::');
  const a2: string = yield countP(2, h4c).map(joinStr);
  const a3: string = yield ls32;
  return PS.pure(`${a1}::${a2}${a3}`);
}))).alt(PS.attempt(PS.co(function* () {
  const a1: string = yield optNH4cH4(3);
  yield PS.string('::');
  const a2: string = yield h4c;
  const a3: string = yield ls32;
  return PS.pure(`${a1}::${a2}${a3}`);
}))).alt(PS.attempt(PS.co(function* () {
  const a1: string = yield optNH4cH4(4);
  yield PS.string('::');
  const a3: string = yield ls32;
  return PS.pure(`${a1}::${a3}`);
}))).alt(PS.attempt(PS.co(function* () {
  const a1: string = yield optNH4cH4(5);
  yield PS.string('::');
  const a3: string = yield h4;
  return PS.pure(`${a1}::${a3}`);
}))).alt(PS.attempt(PS.co(function* () {
  const a1: string = yield optNH4cH4(6);
  yield PS.string('::');
  return PS.pure(`${a1}::`);
})));

const ipv6addrz: PS.Parser<string> = PS.co(function* () {
  const ip: string = yield ipv6address;
  const t: string = yield PS.option('', PS.attempt(PS.co(function* () {
    const e: string = yield PS.string('%25');
    const z: string = yield zoneid;
    return PS.pure(e + z);
  })));
  return PS.pure(ip + t);
});

function isIpvFutureChar(c: string): boolean {
  return isUnreserved(c) || isSubDelims(c) || c === ';';
}

const ipLiteral: PS.Parser<string> = PS.between(
  PS.char('['),
  PS.char(']'),
  ipv6addrz.alt(ipvFuture).map(ua => `[${ua}]`)
);

function uchar(c: string): PS.Parser<string> {
  return unreservedChar.alt(escaped).alt(subDelims).alt(PS.oneOf(c.split('')));
}

const pchar = uchar(':@');

const regName: PS.Parser<string> = countMinMax(0, 255, nameChar).map(joinStr);

const uquery: PS.Parser<string> = PS.many(uchar(':@/?')).map(x => `?${joinStr(x)}`);

const ufragment: PS.Parser<string> = PS.many(uchar(':@/?')).map(x => `#${joinStr(x)}`);

const host: PS.Parser<string> = ipLiteral.alt(PS.attempt(ipv4address)).alt(regName);

const port: PS.Parser<string> = PS.char(':').chain(() => PS.many(PS.anyDigit)).map(xs => `:${xs.join('')}`);

const segment = PS.many(pchar).map(joinStr);

const slashSegment = PS.char('/').chain(() => segment).map(x => `/${x}`);

const segmentNz = PS.many1(pchar).map(joinStr);

const segmentNzc = PS.many1(uchar('@')).map(joinStr);

const pathAbEmpty: PS.Parser<string> = PS.many(slashSegment).map(joinStr);

const pathNoScheme: PS.Parser<string> = segmentNzc.chain(s1 => PS.many(slashSegment).map(ss => s1 + ss.join('')));

const pathRootLess: PS.Parser<string> = PS.co(function* () {
  const s1: string = yield segmentNz;
  const ss: string[] = yield PS.many(slashSegment);
  return PS.pure(s1 + ss.join(''));
});

const pathAbs: PS.Parser<string> = PS.co(function* () {
  yield PS.char('/');
  const ss = yield PS.option('', pathRootLess);
  return PS.pure(`/${ss}`);
});

const uauthority: PS.Parser<P.Maybe<URIAuth>> = PS.co(function* () {
  const uu: string = yield PS.option('', PS.attempt(userinfo));
  const uh: string = yield host;
  const up: string = yield PS.option('', port);
  return PS.pure(P.just(mkURIAuth(uu, uh, up)));
});

const relativePart: PS.Parser<[P.Maybe<URIAuth>, string]> = PS.co(function* () {
  yield PS.attempt(PS.string('//'));
  const ua: P.Maybe<URIAuth> = yield uauthority;
  const up: string = yield pathAbEmpty;
  return PS.pure([ua, up]);
})
  .alt(pathAbs.map(p => [P.nothing, p]))
  .alt(pathNoScheme.map(p => [P.nothing, p]))
  .alt(PS.pure([P.nothing, '']));

const relativeRef: PS.Parser<URI> = PS.co(function* () {
  yield notMatching(uscheme);
  const [ua, path]: [P.Maybe<URIAuth>, string] = yield relativePart;
  const uq: string = yield PS.option('', PS.char('?').chain(() => uquery));
  const uf: string = yield PS.option('', PS.char('#').chain(() => ufragment));
  return PS.pure(mkURI('', ua, path, uq, uf));
});

const hierPart: PS.Parser<[P.Maybe<URIAuth>, string]> = PS.co(function* () {
  yield PS.attempt(PS.string('//'));
  const ua: P.Maybe<URIAuth> = yield uauthority;
  const up: string = yield pathAbEmpty;
  return PS.pure([ua, up]);
})
  .alt(pathAbs.map(ps => [P.nothing, ps]))
  .alt(pathRootLess.map(ps => [P.nothing, ps]))
  .alt(PS.pure([P.nothing, '']));

const uri: PS.Parser<URI> = PS.co(function* () {
  const us: string = yield PS.attempt(uscheme);
  const [ua, up]: [P.Maybe<URIAuth>, string] = yield hierPart;
  const uq: string = yield PS.option('', PS.char('?').chain(() => uquery));
  const uf: string = yield PS.option('', PS.char('#').chain(() => ufragment));
  return PS.pure(mkURI(us, ua, up, uq, uf));
});

const absoluteURI: PS.Parser<URI> = PS.co(function* () {
  const us: string = yield uscheme;
  const [ua, up]: [P.Maybe<URIAuth>, string] = yield hierPart;
  const uq: string = yield PS.option('', PS.char('?').chain(() => uquery));
  return PS.pure(mkURI(us, ua, up, uq, ''));
});

const uriReference: PS.Parser<URI> = uri.alt(relativeRef);

export function parseURIAny(p: PS.Parser<URI>, str: string): P.Maybe<URI> {
  const ret = PS.runParser(parseEof(p), str);
  if (P.isRight(ret)) return P.just(ret.value);
  return P.nothing;
}

export function parseAbsoluteURI(str: string): P.Maybe<URI> {
  return parseURIAny(absoluteURI, str);
}

export function parseURI(str: string): P.Maybe<URI> {
  return parseURIAny(uri, str);
}

export function parseURIReference(str: string): P.Maybe<URI> {
  return parseURIAny(uriReference, str);
}

export function parseRelativeReference(str: string): P.Maybe<URI> {
  return parseURIAny(relativeRef, str);
}

export function isValidParse<A>(p: PS.Parser<A>, str: string): boolean {
  const ret = PS.runParser(parseEof(p), str);
  if (P.isRight(ret)) return true;
  return false;
}

export function isURIReference(str: string): boolean {
  return isValidParse(uriReference, str);
}

export function isRelativeReference(str: string): boolean {
  return isValidParse(relativeRef, str);
}

export function isAbsoluteURI(str: string): boolean {
  return isValidParse(absoluteURI, str);
}

export function isURI(str: string): boolean {
  return isValidParse(uri, str);
}

function uriAuthEquals(s: P.Maybe<URIAuth>, d: P.Maybe<URIAuth>): boolean {
  if (P.isNothing(s) && P.isNothing(d)) return true;
  if (P.isJust(s) && P.isJust(d)) {
    const sa = s.value;
    const da = d.value;
    const uriAuth: (keyof URIAuth)[] = ['userInfo', 'port', 'regName'];
    return uriAuth.every(x => sa[x] === da[x]);
  }
  return false;
}

export function relativeFrom(uabs: URI, base: URI): URI {
  if (uabs.scheme !== base.scheme)
    return uabs;

  if (!uriAuthEquals(uabs.auth, base.auth))
    return mkURI('', uabs.auth, uabs.path, uabs.query, uabs.fragment);

  if (uabs.path !== base.path) {
    return mkURI(
      '',
      P.nothing,
      relPathFrom(removeBodyDotSegments(uabs.path), removeBodyDotSegments(base.path)),
      uabs.query,
      uabs.fragment
    );
  }

  if (uabs.query !== base.query)
    return mkURI('', P.nothing, '', uabs.query, uabs.fragment);

  return mkURI('', P.nothing, '', '', uabs.fragment);
}

export function relativeTo(ref: URI, base: URI): URI {
  if (ref.scheme !== '') {
    return justSegments(ref);
  }

  if (P.isJust(ref.auth)) {
    return justSegments(mkURI(base.scheme, ref.auth, ref.path, ref.query, ref.fragment));
  }

  if (ref.path !== '') {
    if (ref.path.charAt(0) === '/') {
      return justSegments(mkURI(base.scheme, base.auth, ref.path, ref.query, ref.fragment));
    }

    return justSegments(mkURI(base.scheme, base.auth, mergePaths(base, ref), ref.query, ref.fragment));
  }

  if (ref.query !== '') {
    return justSegments(mkURI(base.scheme, base.auth, base.path, ref.query, ref.fragment));
  }

  return justSegments(mkURI(base.scheme, base.auth, base.path, base.query, ref.fragment));
}

const RDS1 = /^\.\.?\//;
const RDS2 = /^\/\.(\/|$)/;
const RDS3 = /^\/\.\.(\/|$)/;
const RDS5 = /^\/?(?:.|\n)*?(?=\/|$)/;

function removeDotSegments(input: string): string {
  let out: string[] = [];

  while (input.length) {
    if (input.match(RDS1)) {
      input = input.replace(RDS1, '');
    } else if (input.match(RDS2)) {
      input = input.replace(RDS2, '/');
    } else if (input.match(RDS3)) {
      input = input.replace(RDS3, '/');
      out.pop();
    } else if (input === '.' || input === '..') {
      input = '';
    } else {
      const im = input.match(RDS5);
      if (im) {
        const s = im[0];
        input = input.slice(s.length);
        out.push(s);
      }
    }
  }

  return out.join('');
}

function removeBodyDotSegments(p: string): string {
  const [p1, p2] = splitLast(p);
  return removeDotSegments(p1) + p2;
}

function mergePaths(b: URI, r: URI): string {
  if (P.isJust(b.auth) && b.path.length === 0) {
    return '/' + r.path;
  }
  return splitLast(b.path)[0] + r.path;
}

function relPathFrom(pabs: string, base: string): string {
  if (pabs.length === 0) return '/';
  if (base.length === 0) return pabs;
  const [sa1, ra1] = nextSegment(pabs);
  const [sb1, rb1] = nextSegment(base);

  if (sa1 === sb1) {
    if (sa1 === '/') {
      const [sa2, ra2] = nextSegment(ra1);
      const [sb2, rb2] = nextSegment(rb1);
      if (sa2 === sb2)
        return relPathFrom1(ra2, rb2);
      else
        return pabs;
    } else {
      return relPathFrom1(ra1, rb1);
    }
  } else {
    return pabs;
  }
}

function relPathFrom1(pabs: string, base: string): string {
  const [sa, na] = splitLast(pabs);
  const [sb, nb] = splitLast(base);
  const rp = relSegsFrom(sa, sb);

  return rp.length === 0
    ? (na === nb ? '' : (na.length === 0 || na.indexOf(':') !== -1 ? `./${na}` : na))
    : (rp + na);
}

function relSegsFrom(sabs: string, base: string): string {
  while (true) {
    if (sabs.length === 0 && base.length === 0)
      return '';
    let [sa1, ra1] = nextSegment(sabs);
    let [sb1, ra2] = nextSegment(base);
    if (sa1 === sb1) {
      sabs = ra1;
      base = ra2;
      continue;
    } else {
      return difSegsFrom(sabs, base);
    }
  }
}

function difSegsFrom(sabs: string, base: string): string {
  while (true) {
    if (base === '') return sabs;

    sabs = `../${sabs}`;
    base = nextSegment(base)[1];
  }
}

function justSegments(b: URI): URI {
  return mkURI(b.scheme, b.auth, removeDotSegments(b.path), b.query, b.fragment);
}

function nextSegment(s: string): [string, string] {
  let ix = s.indexOf('/');
  let first = s.slice(0, ix);
  let second = s.slice(ix, s.length);

  if (second.charAt(0) === '/') {
    return [first + '/', second.slice(1)];
  }
  return [first, second];
}

function splitLast(p: string): [string, string] {
  let ix = p.lastIndexOf('/');
  let first = p.slice(0, ix + 1);
  let last = p.slice(ix + 1, p.length);
  return [first, last];
}

function parseEof<A>(p: PS.Parser<A>): PS.Parser<A> {
  return p.chain(x => PS.eof.map(() => x));
}

function oneThenMany<A>(p: PS.Parser<A>, r: PS.Parser<A>): PS.Parser<A[]> {
  return p.chain(x => PS.many(r).map(xs => [x].concat(xs)));
}

function countP<A>(n: number, p: PS.Parser<A>): PS.Parser<A[]> {
  if (n <= 0) return PS.pure([]);
  return sequenceP(replicateA(n, p));
}

function notFollowedBy(p: PS.Parser<any>): PS.Parser<void> {
  return PS.attempt(
    PS.attempt(p).chain(a => PS.fail(Object.prototype.toString.call(a)))
      .alt(PS.pure(void 0))
  );
}

function notMatching(p: PS.Parser<any>): PS.Parser<void> {
  return PS.attempt(p).chain(x => PS.fail('unexpected')).alt(PS.pure(void 0));
}

function countMinMax<A>(m: number, n: number, p: PS.Parser<A>): PS.Parser<A[]> {
  if (m > 0) {
    return p.chain(x => countMinMax(m - 1, n - 1, p).map(ar => [x].concat(ar)));
  } else if (n <= 0) {
    return PS.pure([]);
  }
  return PS.option([], p.chain(x => countMinMax(0, n - 1, p).map(ar => [x].concat(ar))));
}

function concatArr<A>(xs: A[]) {
  return function(ys: A[]) {
    return xs.concat(ys);
  };
}

function singletonArr<A>(a: A): A[] {
  return [a];
}

function pair<A>(a: A): (b: A) => A[] {
  return (b: A) => [a, b];
}

function ident<A>(a: A): A {
  return a;
}

function joinStr(xs: string[]) {
  return xs.join('');
}

function forP<A, B>(xs: A[], f: (_: A) => PS.Parser<B>): PS.Parser<B[]> {
  function go(idx: number, n: number): PS.Parser<B[]> {
    switch (n) {
      case 0: return PS.pure([]);
      case 2: return f(xs[idx]).map(pair).ap(f(xs[idx + 1]));
      default:
        let m = Math.floor(n / 4) * 2;
        return go(idx, m).map(concatArr).ap(go(idx + m, n - m));
    }
  }
  return xs.length % 2 === 1
    ? f(xs[0]).map(singletonArr).map(concatArr).ap(go(1, xs.length - 1))
    : go(0, xs.length);
}

function sequenceP<A>(xs: PS.Parser<A>[]): PS.Parser<A[]> {
  return forP(xs, ident);
}

function replicateA<A>(n: number, a: A): A[] {
  if (n <= 0) return [];
  let result: A[] = [];
  for (let i = 0; i < n; i++) {
    result.push(a);
  }
  return result;
}

function isHexDigitAt(c: string, i?: number): boolean {
  return !!isHexTable[c.charCodeAt(i == null ? 0 : i)];
}

function isGenDelims(c: string): boolean {
  return ':/?#[]@'.indexOf(c) !== -1;
}

function isSubDelims(c: string): boolean {
  return '!$&\'()*+,;='.indexOf(c) !== -1;
}

export function isReserved(c: string): boolean {
  return isGenDelims(c) || isSubDelims(c);
}

function isDigits(c: string) {
  return c >= '0' && c <= '9';
}

function isLowerCaseChar(c: string) {
  const co = c.charCodeAt(0);
  return co >= 97 && co <= 122;
}

function isUpperCaseChar(c: string) {
  const co = c.charCodeAt(0);
  return co >= 65 && co <= 90;
}

function isAlphaNumChar(c: string) {
  return isDigits(c) || isLowerCaseChar(c) || isUpperCaseChar(c);
}

function isUnreserved(c: string) {
  return isAlphaNumChar(c) || '-_.~'.indexOf(c) !== -1;
}

function isSchemeChar(c: string) {
  return isAlphaNumChar(c) || '+-.'.indexOf(c) !== -1;
}
