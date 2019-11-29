// Days of the week

// An ISO day of the week, starting at Monday (=1) up to Sunday (=7).
export const enum Weekday {
  Mon = 1,
  Tue,
  Wed,
  Thu,
  Fri,
  Sat,
  Sun,
}

/**
 * Convert a weekday number to a `:weekday`(starting at Monday (=1) up to Sunday (=7)).
 * Takes the integer `i - 1` modulo 7, so `0` or `14` also become Sunday etc.
 */
export function toWeekday(i: number): Weekday {
  i = i | 0; // truncate to int32
  const d = (i - 1) % 7;
  return d + 1;
}

export function showWeekday(d: Weekday): string {
  switch (d) {
  case Weekday.Mon: return 'Monday';
  case Weekday.Tue: return 'Tuesday';
  case Weekday.Wed: return 'Wednesday';
  case Weekday.Thu: return 'Thursday';
  case Weekday.Fri: return 'Friday';
  case Weekday.Sat: return 'Saturday';
  case Weekday.Sun: return 'Sunday';
  }
}

export function addWeekday(i: Weekday, n: number): Weekday {
  return toWeekday(i + n);
}

export function substractWeekday(i: Weekday, n: number): Weekday {
  return toWeekday(i - n);
}

/**
 * A date consists of a the year, month, and day.
 */
export class Date {
  constructor(public year: number, public month: number, public day: number) {

  }

  static weekdate(year: number, month: number, weekday: Weekday): Date {
    return new Date(year, month, weekday);
  }

  compare(other: Date): 1 | -1 | 0 {
    if (this.year === other.year) {
      if (this.month === other.month) {
        return this.day > other.day ? 1 : this.day < other.day ? -1 : 0;
      }
      return this.month > other.month ? 1 : -1;
    }
    return this.year > other.year ? 1 : -1;
  }

  /**
   * Add two dates field-wise together.
   */
  add(other: Date): Date {
    return new Date(this.year + other.year, this.month + other.month, this.day + other.day);
  }
}
