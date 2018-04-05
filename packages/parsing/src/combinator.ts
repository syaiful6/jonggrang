import {
  Either, left, right, bimapEither, mapEither, just, nothing, Maybe,
  list as L
} from '@jonggrang/prelude';

import { Parser, defParser, tailRecParser, fail } from './parser';


/**
 * Read ahead without consuming input.
*/
export function lookAhead<A>(p: Parser<A>): Parser<A> {
  return defParser(s =>
    mapEither(p.fn(s), ({ result }) => ({ result, suffix: s }))
  );
}

export function many<A>(p: Parser<A>): Parser<L.List<A>> {
  function go(xs: L.List<A>): Parser<Either<L.List<A>, L.List<A>>> {
    return (p.map(left) as Parser<Either<A, null>>).alt(Parser.of(right(null)))
      .map(aa => bimapEither(aa, x => L.cons(x, xs), () => L.reverse(xs)));
  }
  return tailRecParser(L.nil as L.List<A>, go);
}

export function many1<A>(p: Parser<A>): Parser<L.List<A>> {
  return p.chain(head => many(p).map(xs => L.cons(head, xs)));
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

export function optionMaybe<A>(p: Parser<A>): Parser<Maybe<A>> {
  return option(nothing, p.map(just));
}

export function sepBy<A>(p: Parser<A>, sep: Parser<any>): Parser<L.List<A>> {
  return sepBy1(p, sep).alt(Parser.of(L.nil));
}

// Parse one or more separated values.
export function sepBy1<A>(p: Parser<A>, sep: Parser<any>): Parser<L.List<A>> {
  return p.chain(a => many(sep.chain(() => p)).map(as => L.cons(a, as)));
}

export function sepEndBy<A>(p: Parser<A>, sep: Parser<any>): Parser<L.List<A>> {
  return sepEndBy1(p, sep).alt(Parser.of(L.nil));
}

export function sepEndBy1<A>(p: Parser<A>, sep: Parser<any>): Parser<L.List<A>> {
  return p.chain(a =>
    sep.chain(() => sepEndBy(p, sep).map(as => L.cons(a, as)))
      .alt(Parser.of(L.singleton(a)))
  );
}

export function endBy1<A>(p: Parser<A>, sep: Parser<any>): Parser<L.List<A>> {
  return many1(p.chain(a => sep.map(() => a)));
}

export function endBy<A>(p: Parser<A>, sep: Parser<any>): Parser<L.List<A>> {
  return many(p.chain(a => sep.map(() => a)));
}

export function choice<A>(xs: Parser<A>[]): Parser<A> {
  return xs.reduce((prev, cur) => prev.alt(cur), fail('nothing to parse'));
}

export function useDef<A>(a: A, p: Parser<any>): Parser<A> {
  return p.map(() => a);
}
