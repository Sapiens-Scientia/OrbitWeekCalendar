import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calendarYear, changeYear, civilDate, dateKey, dayOfYear, isoWeek, weekday } from '../src/calendar.js';

test('every civil date appears once, on its weekday track, for a full Gregorian cycle', () => {
  for (let year = 2000; year < 2400; year++) {
    const calendar = calendarYear(year);
    const dates = calendar.weeks.flat().filter(cell => cell.inYear);
    assert.equal(dates.length, calendar.dayCount);
    assert.equal(new Set(dates.map(cell => cell.key)).size, calendar.dayCount);
    assert.equal(dates[0].key, `${year}-01-01`);
    assert.equal(dates.at(-1).key, `${year}-12-31`);
    for (const cell of dates) assert.equal(weekday(cell.date), cell.track);
    for (const week of calendar.weeks) {
      assert.equal(weekday(week[0].date), 0);
      assert.equal(weekday(week[6].date), 6);
    }
  }
});

test('partial weeks preserve empty cells at year boundaries', () => {
  const calendar = calendarYear(2026);
  assert.equal(calendar.weekCount, 53);
  assert.deepEqual(calendar.weeks[0].map(cell => cell.inYear), [false, false, false, true, true, true, true]);
  assert.equal(calendar.weeks[0][3].key, '2026-01-01');
  assert.equal(calendarYear(2012).weekCount, 54);
});

test('leap years and changing from February 29 are handled', () => {
  assert.equal(calendarYear(2024).dayCount, 366);
  assert.equal(calendarYear(2100).dayCount, 365);
  assert.equal(dateKey(changeYear(civilDate(2024, 1, 29), 2025)), '2025-02-28');
  assert.equal(dayOfYear(civilDate(2024, 11, 31)), 366);
});

test('ISO week numbers match year boundary and reference dates', () => {
  assert.equal(isoWeek(civilDate(2026, 8, 28)), 40);
  assert.equal(dayOfYear(civilDate(2026, 8, 28)), 271);
  assert.equal(isoWeek(civilDate(2021, 0, 1)), 53);
  assert.equal(isoWeek(civilDate(2024, 11, 30)), 1);
});
