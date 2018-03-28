import * as P from '@jonggrang/prelude';

import { Parser, defParser, tailRecParser, fail } from './parser';


/**
 * Read ahead without consuming input.
*/
export function lookAhead<A>(p: Parser<A>) {
  return defParser(s =>
    P.mapEither(p.fn(s), ({ result }) => ({ result, suffix: s }))
  );
}

export function many<A>(p: Parser<A>): Parser<A[]> {
  function go(i: A[]): Parser<P.Either<A[], A[]>> {
    return (p.map(P.left) as Parser<P.Either<A, null>>).alt(Parser.of(P.right(null)))
      .map(aa => P.bimapEither(aa, x => consArr(x, i), () => reverseArr(i)));
  }
  return tailRecParser([] as A[], go);
}

export function many1<A>(p: Parser<A>): Parser<A[]> {
  return p.chain(head => many(p).map(xs => consArr(head, xs)));
}

export function withError<A>(p: Parser<A>, msg: string): Parser<A> {
  return p.alt(fail(msg));
}

/**
 * Parse a string between opening and closing markers.
 * @param open
 * @param close
 * @param p
 */
export function between<A>(open: Parser<any>, close: Parser<any>, p: Parser<A>): Parser<A> {
  return open.chain(() => p).chain(x => close.map(() => x));
}

export function option<A>(def: A, p: Parser<A>): Parser<A> {
  return p.alt(Parser.of(def));
}

export function optional(p: Parser<any>): Parser<void> {
  return p.map(() => {}).alt(Parser.of(void 0));
}

export function optionMaybe<A>(p: Parser<A>): Parser<P.Maybe<A>> {
  return option(P.nothing, p.map(P.just));
}

export function sepBy<A>(p: Parser<A>, sep: Parser<any>): Parser<A[]> {
  return sepBy1(p, sep).alt(Parser.of([]));
}

// Parse one or more separated values.
export function sepBy1<A>(p: Parser<A>, sep: Parser<any>): Parser<A[]> {
  return p.chain(a => many(sep.chain(() => p)).map(as => consArr(a, as)));
}

export function sepEndBy<A>(p: Parser<A>, sep: Parser<any>): Parser<A[]> {
  return sepEndBy1(p, sep).alt(Parser.of([]));
}

export function sepEndBy1<A>(p: Parser<A>, sep: Parser<any>): Parser<A[]> {
  return p.chain(a =>
    sep.chain(() => sepEndBy(p, sep).map(as => consArr(a, as)))
      .alt(Parser.of([a]))
  );
}

export function endBy1<A>(p: Parser<A>, sep: Parser<any>): Parser<A[]> {
  return many1(p.chain(a => sep.map(() => a)));
}

export function endBy<A>(p: Parser<A>, sep: Parser<any>): Parser<A[]> {
  return many(p.chain(a => sep.map(() => a)));
}

export function choice<A>(xs: Parser<A>[]): Parser<A> {
  return xs.reduce((prev, cur) => prev.alt(cur), fail('nothing to parse'));
}

export function useDef<A>(a: A, p: Parser<any>): Parser<A> {
  return p.map(() => a);
}

// 2 functions below mutate the array, should be used locally

function consArr<A>(a: A, xs: A[]): A[] {
  xs.unshift(a);
  return xs;
}

function reverseArr<A>(xs: A[]): A[] {
  let ys = xs.slice();
  return ys.reverse();
}
