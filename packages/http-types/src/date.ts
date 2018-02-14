export type Month = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export type Day = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15
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
