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
