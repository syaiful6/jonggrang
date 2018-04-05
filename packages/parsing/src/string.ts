import { left, right, list as L } from '@jonggrang/prelude';

import { Parser, defParser, ParseError, attempt, fail } from './parser';
import * as PC from './combinator';

export const eof: Parser<void> = defParser(input =>
  input.pos < input.str.length
    ? left({ pos: input.pos, error: new ParseError('Expected EOF') })
    : right({ result: void 0, suffix: input })
);

export const anyChar: Parser<string> = defParser(({ str, pos}) =>
  pos >= 0 && pos < str.length
    ? right({ result: str.charAt(pos), suffix: { str, pos: pos + 1 }})
    : left({ pos, error: new ParseError('Unexpected EOF') })
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
      ? right({ result: nt, suffix: { str, pos: pos + nt.length }})
      : left({ pos, error: new ParseError(`Expected '${nt}'.`) });
  });
}

export function satisfy(f: (s: string) => boolean): Parser<string> {
  return attempt(
    anyChar.chain(c => f(c) ? Parser.of(c) : fail(`Character ${c} didn't satisfy predicate`))
  );
}

export function char(c: string) {
  return PC.withError(
    satisfy(s => s === c),
    `Could not match character ${c}`
  );
}

export const whiteSpace: Parser<string> = PC.many(
  satisfy(c => c == '\n' || c == '\r' || c == ' ' || c == '\t'),
).map(xs => L.joinWith(xs, identity));

export const skipSpaces: Parser<void> = whiteSpace.map(() => {});

export function oneOf(xs: string[]): Parser<string> {
  return satisfy(x => xs.indexOf(x) !== -1);
}

export function noneOf(xs: string[]): Parser<string> {
  return satisfy(x => xs.indexOf(x) === -1);
}

export const lowerCaseChar: Parser<string> = attempt(
  anyChar.chain(c => {
    const co = c.charCodeAt(0);
    return co >= 97 && co <= 122
      ? Parser.of(c)
      : fail(`Expected a lower case character but found ${c}`);
  })
);

export const upperCaseChar: Parser<string> = attempt(
  anyChar.chain(c => {
    const co = c.charCodeAt(0);
    return co >= 65 && co <= 90
      ? Parser.of(c)
      : fail(`Expected a upper case character but found ${c}`);
  })
);

export const anyLetter: Parser<string> = PC.withError(
  lowerCaseChar.alt(upperCaseChar),
  'Expected a letter'
);

export const alphaNum: Parser<string> = PC.withError(
  anyLetter.alt(anyDigit),
  'Expected a letter or a number'
);

function identity<A>(x: A): A {
  return x;
}
