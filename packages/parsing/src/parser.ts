import * as P from '@jonggrang/prelude';

export type Pos = number;

export type PosStr = { str: string; pos: Pos };

export class ParseError extends Error {
  constructor(msg: string) {
    super(msg);
  }

  equals(other: ParseError) {
    return this.message === other.message;
  }
}

export type ParseResult<A> = P.Either<{ pos: Pos; error: ParseError }, { result: A; suffix: PosStr }>;

export type ParserFn<A> = (input: PosStr) => ParseResult<A>;

export class Parser<A> {
  constructor(readonly fn: ParserFn<A>) {
  }

  map<B>(f: (_: A) => B): Parser<B> {
    return new Parser(input =>
      P.mapEither(this.fn(input), ({ result, suffix }) => ({ suffix, result: f(result) }))
    )
  }

  ['fantasy-land/map']<B>(f: (_: A) => B): Parser<B> {
    return this.map(f);
  }

  apply<B, C>(this: Parser<(_: B) => C>, other: Parser<B>): Parser<C> {
    return new Parser(input =>
      P.chainEither(this.fn(input), ({ result: f, suffix: s1 }) =>
        P.mapEither(other.fn(s1), ({ result: x, suffix: s2}) =>
          ({ result: f(x), suffix: s2 })
        )
      )
    )
  }

  ap<B, C>(this: Parser<(_: B) => C>, other: Parser<B>): Parser<C> {
    return this.apply(other);
  }

  ['fantasy-land/ap']<B>(other: Parser<(_: A) => B>): Parser<B> {
    return other.chain(f => this.map(f));
  }

  static of<B>(a: B): Parser<B> {
    return new Parser(input => P.right({ result: a, suffix: input }))
  }

  static ['fantasy-land/of']<B>(a: B): Parser<B> {
    return Parser.of(a);
  }

  alt(other: Parser<A>): Parser<A> {
    return new Parser(s => {
      const ret = this.fn(s);
      if (P.isLeft(ret)) {
        return ret.value.pos === s.pos ? other.fn(s) : ret;
      }
      return ret;
    });
  }

  static zero(): Parser<any> {
    return fail('No alternative');
  }

  chain<B>(f: (a: A) => Parser<B>): Parser<B> {
    return new Parser(s =>
      P.chainEither(this.fn(s), ({ result, suffix }) =>
        f(result).fn(suffix)
      )
    )
  }

  ['fantasy-land/chain']<B>(f: (a: A) => Parser<B>): Parser<B> {
    return this.chain(f);
  }

  static chainRec<B, C>(
    f: (n: (_: B) => P.Either<B, C>, d: (_: C) => P.Either<B, C>, i: B) => Parser<P.Either<B, C>>,
    i: B
  ): Parser<C> {
    return defParser(str => {
      function split(state: { suffix: PosStr, result: P.Either<B, C>}): P.Either<{ state: B, str: PosStr }, { result: C, suffix: PosStr}> {
        if (P.isLeft(state.result)) {
          return P.left({ state: state.result.value, str: state.suffix })
        }
        return P.right({ result: state.result.value, suffix: state.suffix });
      }
      return tailRecEither({ str, state: i}, st => P.mapEither(f(P.left, P.right, st.state).fn(st.str), split));
    });
  }

  static ['fantasy-land/chainRec']<B, C>(
    f: (n: (_: B) => P.Either<B, C>, d: (_: C) => P.Either<B, C>, i: B) => Parser<P.Either<B, C>>,
    i: B
  ): Parser<C> {
    return Parser.chainRec(f, i);
  }

  static defer<A>(f: () => Parser<A>): Parser<A> {
    return defParser(s => f().fn(s))
  }
}

export function fail(msg: string): Parser<any> {
  return new Parser(({ pos }) => P.left({ pos, error: new ParseError(msg) }));
}

/**
 * In case of error, the default behavior is to backtrack if no input was consumed.
 * `attempt p` backtracks even if input was consumed.
 * @param p
 */
export function attempt<A>(p: Parser<A>): Parser<A> {
  return new Parser(input => P.lmapEither(p.fn(input), err => ({ pos: input.pos, error: err.error })))
}

/**
 * unwrap parserFn from parser
 */
export function unParser<A>(p: Parser<A>): ParserFn<A> {
  return p.fn;
}

/**
 * Define parser
 */
export function defParser<A>(fn: ParserFn<A>): Parser<A> {
  return new Parser(fn);
}

/**
 * Run a parser for an input string, returning either an error or a result.
 * @param p {Parser}
 * @param str {string}
 */
export function runParser<A>(p: Parser<A>, str: string): P.Either<ParseError, A> {
  return P.bimapEither(p.fn({ str, pos: 0 }), ({ error }) => error, ({ result }) => result);
}

export interface ChainRecFnEither<E, A, B> {
  (v: A): P.Either<E, P.Either<A, B>>;
}

export function tailRec<A, B>(
  i: A,
  f: (i: A) => P.Either<A, B>
): B {
  let current = f(i);
  while (P.isLeft(current)) {
    current = f(current.value);
  }
  return current.value;
}

export function tailRecEither<E, A, B>(
  i: A,
  f: ChainRecFnEither<E, A, B>
): P.Either<E, B> {
  function go(e: P.Either<E, P.Either<A, B>>): P.Either<P.Either<E, P.Either<A, B>>, P.Either<E, B>> {
    if (P.isLeft(e)) {
      return P.right(e);
    }
    const ret = e.value;
    if (P.isLeft(ret)) {
      return P.left(f(ret.value));
    }
    return P.right(ret);
  }
  return tailRec(f(i), go);
}

export function tailRecParser<A, B>(
  i: A,
  f: (_: A) => Parser<P.Either<A, B>>
): Parser<B> {
  return defParser(str => {
    function split(state: { suffix: PosStr, result: P.Either<A, B>}): P.Either<{ state: A, str: PosStr }, { result: B, suffix: PosStr}> {
      if (P.isLeft(state.result)) {
        return P.left({ state: state.result.value, str: state.suffix })
      }
      return P.right({ result: state.result.value, suffix: state.suffix });
    }
    return tailRecEither({ str, state: i}, st => P.mapEither(f(st.state).fn(st.str), split));
  });
}

export function co(fn: () => Iterator<Parser<any>>): Parser<any> {
  let gen: null | Iterator<Parser<any>> = null;
  function go(i: any): Parser<P.Either<any, any>> {
    if (gen == null) {
      gen = fn();
    }
    let { done, value } = gen.next(i);
    if (done) {
      gen = null;
      return value.map(P.right);
    }
    return value.map(P.left);
  }
  return tailRecParser(null, go);
}
