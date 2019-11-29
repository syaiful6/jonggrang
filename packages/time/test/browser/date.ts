import * as assert from 'assert';

import {Weekday, toWeekday} from '../../src/date';

describe('time module', () => {
  describe('weekday', () => {
    assert.equal(toWeekday(1), Weekday.Mon);
    assert.equal(toWeekday(7), Weekday.Sun)
    assert.equal(toWeekday(8), Weekday.Mon);
  });
});
