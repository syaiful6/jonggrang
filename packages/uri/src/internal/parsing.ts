import { just, nothing, Maybe, list as L } from '@jonggrang/prelude';
import * as PS from '@jonggrang/parsing';

import { URI, URIAuth, mkURI, mkURIAuth } from '../types';


const isHexTable = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 0 - 15
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 16 - 31
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 32 - 47
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, // 48 - 63
  0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 64 - 79
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 80 - 95
  0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 96 - 111
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 112 - 127
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 128 ...
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0  // ... 256
];

const hexDigitChar: PS.Parser<string> = PS.satisfy(isHexDigitAt);

const escaped: PS.Parser<string> = sequenceP([ PS.char('%'), hexDigitChar, hexDigitChar ]).map(arrjoinStr);

const subDelims = PS.oneOf(['!', '$', '&', '\'', '(', ')', '*', '+', ',', ';', '=']);

const unreservedChar = PS.satisfy(isUnreserved);

const uscheme: PS.Parser<string> = PS.co(function* () {
  const s: string = yield oneThenMany(PS.anyLetter, PS.satisfy(isSchemeChar)).map(joinStr);
  yield PS.char(':');
  return PS.pure(s + ':');
});

const userinfo: PS.Parser<string> = PS.co(function* () {
  const uu: L.List<string> = yield PS.many(uchar(';:&=+$,'));
  yield PS.char('@');
  return PS.pure(joinStr(uu) + '@');
});

const ipvFuture: PS.Parser<string> = PS.co(function* () {
  const h: string = yield PS.between(PS.char('v'), PS.char('.'), hexDigitChar);
  const a: string = yield PS.many1(PS.satisfy(isIpvFutureChar)).map(joinStr);
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
  PS.string('::').chain(() => countP(5, h4c).map(arrjoinStr))
    .chain(a2 => ls32.map(a3 => `::${a2}${a3}`))
)).alt(PS.attempt(PS.co(function* () {
  const a1: string = yield optNH4cH4(0);
  yield PS.string('::');
  const a2: string = yield countP(4, h4c).map(arrjoinStr);
  const a3: string = yield ls32;
  return PS.pure(`${a1}::${a2}${a3}`);
}))).alt(PS.attempt(PS.co(function* () {
  const a1: string = yield optNH4cH4(1);
  yield PS.string('::');
  const a2: string = yield countP(3, h4c).map(arrjoinStr);
  const a3: string = yield ls32;
  return PS.pure(`${a1}::${a2}${a3}`);
}))).alt(PS.attempt(PS.co(function* () {
  const a1: string = yield optNH4cH4(2);
  yield PS.string('::');
  const a2: string = yield countP(2, h4c).map(arrjoinStr);
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

const port: PS.Parser<string> = PS.char(':').chain(() => PS.many(PS.anyDigit)).map(xs => `:${joinStr(xs)}`);

const segment = PS.many(pchar).map(joinStr);

const slashSegment = PS.char('/').chain(() => segment).map(x => `/${x}`);

const segmentNz = PS.many1(pchar).map(joinStr);

const segmentNzc = PS.many1(uchar('@')).map(joinStr);

const pathAbEmpty: PS.Parser<string> = PS.many(slashSegment).map(joinStr);

const pathNoScheme: PS.Parser<string> = segmentNzc.chain(s1 => PS.many(slashSegment).map(ss => s1 + joinStr(ss)));

const pathRootLess: PS.Parser<string> = PS.co(function* () {
  const s1: string = yield segmentNz;
  const ss: L.List<string> = yield PS.many(slashSegment);
  return PS.pure(s1 + joinStr(ss));
});

const pathAbs: PS.Parser<string> = PS.co(function* () {
  yield PS.char('/');
  const ss = yield PS.option('', pathRootLess);
  return PS.pure(`/${ss}`);
});

const uauthority: PS.Parser<Maybe<URIAuth>> = PS.co(function* () {
  const uu: string = yield PS.option('', PS.attempt(userinfo));
  const uh: string = yield host;
  const up: string = yield PS.option('', port);
  return PS.pure(just(mkURIAuth(uu, uh, up)));
});

const relativePart: PS.Parser<[Maybe<URIAuth>, string]> = PS.co(function* () {
  yield PS.attempt(PS.string('//'));
  const ua: Maybe<URIAuth> = yield uauthority;
  const up: string = yield pathAbEmpty;
  return PS.pure([ua, up]);
})
  .alt(pathAbs.map(p => [nothing, p]))
  .alt(pathNoScheme.map(p => [nothing, p]))
  .alt(PS.pure([nothing, '']));

export const relativeRef: PS.Parser<URI> = PS.co(function* () {
  yield notMatching(uscheme);
  const [ua, path]: [Maybe<URIAuth>, string] = yield relativePart;
  const uq: string = yield PS.option('', PS.char('?').chain(() => uquery));
  const uf: string = yield PS.option('', PS.char('#').chain(() => ufragment));
  return PS.pure(mkURI('', ua, path, uq, uf));
});

const hierPart: PS.Parser<[Maybe<URIAuth>, string]> = PS.co(function* () {
  yield PS.attempt(PS.string('//'));
  const ua: Maybe<URIAuth> = yield uauthority;
  const up: string = yield pathAbEmpty;
  return PS.pure([ua, up]);
})
  .alt(pathAbs.map(ps => [nothing, ps]))
  .alt(pathRootLess.map(ps => [nothing, ps]))
  .alt(PS.pure([nothing, '']));

export const uri: PS.Parser<URI> = PS.co(function* () {
  const us: string = yield PS.attempt(uscheme);
  const [ua, up]: [Maybe<URIAuth>, string] = yield hierPart;
  const uq: string = yield PS.option('', PS.char('?').chain(() => uquery));
  const uf: string = yield PS.option('', PS.char('#').chain(() => ufragment));
  return PS.pure(mkURI(us, ua, up, uq, uf));
});

export const absoluteURI: PS.Parser<URI> = PS.co(function* () {
  const us: string = yield uscheme;
  const [ua, up]: [Maybe<URIAuth>, string] = yield hierPart;
  const uq: string = yield PS.option('', PS.char('?').chain(() => uquery));
  return PS.pure(mkURI(us, ua, up, uq, ''));
});

export const uriReference: PS.Parser<URI> = uri.alt(relativeRef);

function oneThenMany<A>(p: PS.Parser<A>, r: PS.Parser<A>): PS.Parser<L.List<A>> {
  return p.chain(x => PS.many(r).map(xs => L.cons(x, xs)));
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

function countMinMax<A>(m: number, n: number, p: PS.Parser<A>): PS.Parser<L.List<A>> {
  if (m > 0) {
    return p.chain(x => countMinMax(m - 1, n - 1, p).map(ar => L.cons(x, ar)));
  } else if (n <= 0) {
    return PS.pure(L.nil);
  }
  return PS.option(L.nil, p.chain(x => countMinMax(0, n - 1, p).map(ar => L.cons(x, ar))));
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

function joinStr(xs: L.List<string>): string {
  return L.joinWith(xs, ident);
}

function arrjoinStr(xs: string[]): string {
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

export function isHexDigitAt(c: string, i?: number): boolean {
  return !!isHexTable[c.charCodeAt(i == null ? 0 : i)];
}

export function isGenDelims(c: string): boolean {
  return ':/?#[]@'.indexOf(c) !== -1;
}

export function isSubDelims(c: string): boolean {
  return '!$&\'()*+,;='.indexOf(c) !== -1;
}

export function isReserved(c: string): boolean {
  return isGenDelims(c) || isSubDelims(c);
}

export function isDigits(c: string) {
  return c >= '0' && c <= '9';
}

export function isLowerCaseChar(c: string) {
  const co = c.charCodeAt(0);
  return co >= 97 && co <= 122;
}

export function isUpperCaseChar(c: string) {
  const co = c.charCodeAt(0);
  return co >= 65 && co <= 90;
}

function isAlphaNumChar(c: string) {
  return isDigits(c) || isLowerCaseChar(c) || isUpperCaseChar(c);
}

export function isUnreserved(c: string) {
  return isAlphaNumChar(c) || '-_.~'.indexOf(c) !== -1;
}

export function isSchemeChar(c: string) {
  return isAlphaNumChar(c) || '+-.'.indexOf(c) !== -1;
}
