import * as P from '@jonggrang/prelude';
import * as PS from '@jonggrang/parsing';


export type Month = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export type Day
  = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15
  | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29
  | 30 | 31;

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export class HttpDate {
  constructor(
    readonly year: number,
    readonly month: Month,
    readonly day: Day,
    readonly hour: number,
    readonly minute: number,
    readonly second: number,
    readonly weekDay: Weekday
  ) {
  }

  equals(other: HttpDate) {
    return this.year === other.year &&
      this.month === other.month &&
      this.day === other.day &&
      this.hour === other.hour &&
      this.minute === other.minute &&
      this.second === other.second &&
      this.weekDay === other.weekDay;
  }
}

const MONTH_TO_NUM = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
};

const NUM_TO_MONTH: (keyof (typeof MONTH_TO_NUM))[] = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const NUM_TO_WEEKDAY = [
  'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'
];

function matchToken(token: PS.PosStr, nt: string): string | null {
  const { str, pos } = token;
  const ix = str.indexOf(nt, pos);
  return ix !== -1 && ix === pos ? nt : null;
}

function digits(min: number, max: number): PS.Parser<number> {
  return PS.defParser(({ str, pos }) => {
    let i = 0;
    let len = str.length - pos;
    let code: number;
    while (i < len) {
      code = str.charCodeAt(pos + i);
      if (code <= 0x2F || code >= 0x3A) {
        break;
      }
      i++;
    }
    if (i < min || i > max) {
      return P.left({ pos, error: new PS.ParseError(`expected ${min}*${max}DIGITS`) });
    }

    return P.right({ result: parseInt(str.substr(pos, i), 10), suffix: { str, pos: pos + i } });
  });
}

const weekDay: PS.Parser<Weekday> = PS.defParser(({ str, pos }) => {
  if ((str.length - pos) < 3)
    return P.left({ pos, error: new PS.ParseError('Expected one of day name') });

  for (let i = 0; i < 7; i++) {
    if (matchToken({ str, pos }, NUM_TO_WEEKDAY[i]) !== null) {
      return P.right({ result: i as Weekday, suffix: { str, pos: pos + 3 } });
    }
  }

  return P.left({ pos, error: new PS.ParseError('Expected one of day name') });
});

const month: PS.Parser<Month> = PS.defParser(({ str, pos }) => {
  if ((str.length - pos) < 3)
    return P.left({ pos, error: new PS.ParseError('Expected one of month name') });

  let ix: number;
  for (let i = 0; i < 12; i++) {
    ix = str.indexOf(NUM_TO_MONTH[i], pos);
    if (ix !== -1 && ix === pos) {
      return P.right({ result: i as Month, suffix: { str, pos: pos + 3 }});
    }
  }

  return P.left({ pos, error: new PS.ParseError('Expected one of month name') });
});

const date: PS.Parser<[number, Month, Day]> = PS.co(function* () {
  let d = yield digits(1, 2);
  yield PS.optional(PS.whiteSpace);

  let m = yield month;
  yield PS.optional(PS.whiteSpace);

  let y = yield digits(2, 4);
  if (y >= 70 && y <= 99) {
    y += 1900;
  } else if (y >= 0 && y <= 69) {
    y += 2000;
  }

  return PS.pure([y, m, d]);
});

const time: PS.Parser<[number, number, number]> = PS.co(function* () {
  let h = yield digits(2, 2);
  yield PS.char(':');
  let m = yield digits(2, 2);
  // the seconds fields is optional
  let s = yield PS.option(0, PS.attempt(PS.char(':').chain(() => digits(2, 2))));

  if (h > 23 || m > 59 || s > 59) {
    return PS.fail('hour, minute and seconds must be in valid range');
  }
  return PS.pure([h, m, s]);
});

const rfc1123Date: PS.Parser<HttpDate> = PS.co(function *() {
  yield PS.optional(weekDay.chain(() => PS.string(', ')));
  const [y, m, d]: [number, Month, Day] = yield date;
  yield PS.optional(PS.whiteSpace);
  const [h, n, s]: [number, number, number] = yield time;
  yield PS.optional(PS.whiteSpace);
  // RFC 2616 defines GMT only but there are actually ill-formed ones such
  // as "+0000" and "UTC" in the wild.
  yield PS.string('GMT').alt(PS.string('+0000')).alt(PS.string('UTC'));

  return PS.pure(fromDate(new Date(Date.UTC(y, m, d, h, n, s))));
});

export function fromDate(date: Date): HttpDate {
  return new HttpDate(
    date.getUTCFullYear(),
    date.getUTCMonth() as Month,
    date.getUTCDate() as Day,
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCDay() as Weekday
  );
}

export function parseHTTPDate(str: string): P.Maybe<HttpDate> {
  const ret = PS.runParser(rfc1123Date, str);
  if (P.isRight(ret)) {
    return P.just(ret.value);
  }
  return P.nothing;
}

export function formatHttpDate(h: HttpDate): string {
  const d = `${NUM_TO_WEEKDAY[h.weekDay]}, ${int2(h.day)} ${NUM_TO_MONTH[h.month]} ${h.year}`;
  const t = `${int2(h.hour)}:${int2(h.minute)}:${int2(h.second)} GMT`;
  return d + ' ' + t;
}

function int2(d: number): string {
  return d >= 10 ? ('' + d) : `0${d}`;
}
