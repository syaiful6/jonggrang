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
      this.weekDay === other.weekDay
  }
}

const wkday
  = PS.choice([
    PS.useDef(0, PS.string('Sun')),
    PS.useDef(1, PS.string('Mon')),
    PS.useDef(2, PS.string('Tue')),
    PS.useDef(3, PS.string('Wed')),
    PS.useDef(4, PS.string('Thu')),
    PS.useDef(5, PS.string('Fri')),
    PS.useDef(6, PS.string('Sat'))
  ]) as PS.Parser<Weekday>;

const month
  = PS.choice([
    PS.useDef(0, PS.string('Jan')),
    PS.useDef(1, PS.string('Feb')),
    PS.useDef(2, PS.string('Mar')),
    PS.useDef(3, PS.string('Apr')),
    PS.useDef(4, PS.string('May')),
    PS.useDef(5, PS.string('Jun')),
    PS.useDef(6, PS.string('Jul')),
    PS.useDef(7, PS.string('Aug')),
    PS.useDef(8, PS.string('Sep')),
    PS.useDef(9, PS.string('Oct')),
    PS.useDef(10, PS.string('Nov')),
    PS.useDef(11, PS.string('Dec'))
  ]) as PS.Parser<Month>;

const digit2: PS.Parser<number> =
  PS.anyDigit.chain(x1 =>
    PS.anyDigit.map(x2 =>
      toInt(x1) * 10 + toInt(x2)
    )
  );

const digit4: PS.Parser<number> =
  PS.anyDigit.chain(x1 =>
    PS.anyDigit.chain(x2 =>
      PS.anyDigit.chain(x3 =>
        PS.anyDigit.map(x4 =>
          toInt(x1) * 1000 + toInt(x2) * 100 + toInt(x3) * 10 + toInt(x4)
        )
      )
    )
  );

const sp: PS.Parser<void> = PS.char(' ').map(() => {});

const date: PS.Parser<[number, Month, Day]> = PS.co(function *() {
  let d = yield digit2;
  yield sp;
  let m = yield month;
  yield sp;
  let y = yield digit4;
  return PS.pure([y, m, d]);
})

const time: PS.Parser<[number, number, number]> = PS.co(function *() {
  let h = yield digit2;
  yield PS.char(':');
  let m = yield digit2;
  yield PS.char(':');
  let s = yield digit2;
  return PS.pure([h, m, s]);
});

const rfc1123Date: PS.Parser<HttpDate> = PS.co(function *() {
  const w: Weekday = yield wkday;
  yield PS.string(', ');
  const [y, m, d]: [number, Month, Day] = yield date;
  yield sp;
  const [h, n, s]: [number, number, number] = yield time;
  yield sp;
  // RFC 2616 defines GMT only but there are actually ill-formed ones such
  // as "+0000" and "UTC" in the wild.
  yield PS.string('GMT').alt(PS.string('+0000')).alt(PS.string('UTC'));
  return PS.pure(new HttpDate(y, m, d, h, n, s, w));
});

export function parseHTTPDate(str: string): P.Maybe<HttpDate> {
  return P.either(
    () => P.nothing,
    P.just,
    PS.runParser(rfc1123Date, str)
  ) as P.Maybe<HttpDate>;
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
  )
}

function toInt(s: string): number {
  return s.charCodeAt(0) - 48;
}

const WEEKDAY =
  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const MONTH =
  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'
  , 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]

function weekDay2String(wd: Weekday): string {
  return WEEKDAY[wd]
}

function month2String(m: Month): string {
  return MONTH[m];
}

export function formatHttpDate(h: HttpDate): string {
  const d = `${weekDay2String(h.weekDay)}, ${int2(h.day)} ${month2String(h.month)} ${h.year}`;
  const t = `${int2(h.hour)}:${int2(h.minute)}:${int2(h.second)} GMT`;
  return d + ' ' + t;
}

function int2(d: number): string {
  return d < 10 ? `0${d}` : `${d}`;
}
