import * as P from '@jonggrang/prelude';


export type Month = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export type Day
  = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15
  | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29
  | 30 | 31;

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Token {
  str: string;
  pos: number;
}

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
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Des: 11
};

const NUM_TO_MONTH: (keyof (typeof MONTH_TO_NUM))[] = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Des'
];

const NUM_TO_WEEKDAY = [
  'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'
];

export function parseHTTPDate(str: string): P.Maybe<HttpDate> {
  const ret = parserfc1123Date({ str, pos: 0 });
  if (ret === null) return P.nothing;
  return P.just(ret);
}

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

export function formatHttpDate(h: HttpDate): string {
  const d = `${NUM_TO_WEEKDAY[h.weekDay]}, ${int2(h.day)} ${NUM_TO_MONTH[h.month]} ${h.year}`;
  const t = `${int2(h.hour)}:${int2(h.minute)}:${int2(h.second)} GMT`;
  return d + ' ' + t;
}

function matchToken(token: Token, nt: string): string | null {
  const { str, pos } = token;
  const ix = str.indexOf(nt, pos);
  return ix !== -1 && ix === pos ? nt : null;
}

/**
 * Parses a Natural number
 */
function parseDigits(token: Token, min: number, max: number, trailingOK: boolean): number | null {
  const { str, pos } = token;
  let i = 0;
  let len = str.length - token.pos;
  let code: number;
  while (i < len) {
    code = str.charCodeAt(pos + i);
    if (code <= 0x2F || code >= 0x3A) {
      break;
    }
    i++;
  }
  if (i < min || i > max) return null;

  if (!trailingOK && i !== len) return null;

  return parseInt(str.substr(pos, i), 10);
}

/**
 *
 * @param token string
 */
function parseWeekDay(token: Token): Weekday | null {
  const { str, pos } = token;
  if ((str.length - pos) < 3) return null;
  for (let i = 0; i < 7; i++) {
    if (matchToken(token, NUM_TO_WEEKDAY[i]) !== null) {
      return i as Weekday;
    }
  }
  return null;
}

function parseMonth(token: Token) {
  const { str, pos } = token;
  if ((str.length - pos) < 3) return null;
  let ix: number;
  for (let i = 0; i < 12; i++) {
    ix = str.indexOf(NUM_TO_MONTH[i], pos);
    if (ix !== -1 && ix === pos) {
      return i;
    }
  }
  return null;
}

function parseDate(token: Token): [number, Month, Day] | null {
  const { str, pos } = token;
  // day
  let d = parseDigits(token, 2, 2, true);
  if (d === null) return null;
  // sp
  if (str.charAt(pos + 2) !== ' ') return null;
  // month
  let m = parseMonth({ str, pos: pos + 3 });
  if (m === null) return null;
  // sp
  if (str.charAt(pos + 6) !== ' ') return null;
  // year
  let y = parseDigits({ str, pos: pos + 7 }, 4, 4, true);
  if (y === null) return null;

  return [y, m, d] as [number, Month, Day];
}

function parseTime(token: Token): [number, number, number] | null {
  const { str, pos } = token;
  // hour
  let h = parseDigits(token, 2, 2, true);
  if (h === null) return null;

  if (str.charAt(pos + 2) !== ':') return null;

  let m = parseDigits({ str, pos: pos + 3 }, 2, 2, true);
  if (m === null) return null;

  if (str.charAt(pos + 5) !== ':') return null;

  let s = parseDigits({ str, pos: pos + 6 }, 2, 2, true);
  if (s === null) return null;

  return [h, m, s];
}

function parserfc1123Date(token: Token): HttpDate | null {
  const { str, pos } = token;

  const weekday = parseWeekDay(token);
  if (weekday === null) return null;

  if (matchToken({ str, pos: pos + 3 }, ', ') === null) return null;

  const date = parseDate({ str, pos: pos + 5 });
  if (date === null) return null;

  if (str.charAt(pos + 16) !== ' ') return null;

  const time = parseTime({ str, pos: pos + 17 });
  if (time === null) return null;

  if (str.charAt(pos + 25) !== ' ') return null;

  const token2 = { str, pos: pos + 26 };
  const gmt = anyArr(['GMT', '+0000', 'UTC'], x => matchToken(token2, x) !== null);
  if (!gmt) return null;

  return new HttpDate(date[0], date[1], date[2], time[0], time[1], time[2], weekday);
}

function anyArr<A>(xs: A[], fn: (_: A) => boolean): boolean {
  for (let i = 0, len = xs.length; i < len; i++) {
    if (fn(xs[i])) {
      return true;
    }
  }
  return false;
}

function int2(d: number): string {
  return d >= 10 ? ('' + d) : `0${d}`;
}
