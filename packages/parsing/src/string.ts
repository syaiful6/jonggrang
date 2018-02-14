import * as P from '@jonggrang/prelude';

import { Parser, defParser, ParseError, attempt, fail } from './parser';
import * as PC from './combinator';

export const eof: Parser<void> = defParser(input =>
  input.pos < input.str.length
    ? P.left({ pos: input.pos, error: new ParseError('Expected EOF') })
    : P.right({ result: void 0, suffix: input })
);

export const anyChar: Parser<string> = defParser(({ str, pos}) =>
  pos >= 0 && pos < str.length
    ? P.right({ result: str.charAt(pos), suffix: { str, pos: pos + 1 }})
    : P.left({ pos, error: new ParseError('Unexpected EOF') })
);

export const anyDigit: Parser<string> = attempt(
  anyChar.chain(c =>
    c >= '0' && c <= '9' ? Parser.of(c) : fail(`Character ${c} is not a digit`)
  )
);

export function string(nt: string): Parser<string> {
  return defParser(({ pos, str }) => {
    const ix = str.indexOf(nt, pos);
    return ix !== -1 && ix === pos
      ? P.right({ result: nt, suffix: { str, pos: pos + nt.length }})
      : P.left({ pos, error: new ParseError(`Expected '${nt}'.`) })
  });
}

export function satisfy(f: (s: string) => boolean): Parser<string> {
  return attempt(
    anyChar.chain(c => f(c) ? Parser.of(c) : fail(`Character ${c} didn't satisfy predicate`))
  )
}

export function char(c: string) {
  return PC.withError(
    satisfy(s => s === c),
    `Could not match character ${c}`
  )
}

export const whiteSpace: Parser<string> = PC.many(
  satisfy(c => c == '\n' || c == '\r' || c == ' ' || c == '\t'),
).map(xs => xs.join(''));
