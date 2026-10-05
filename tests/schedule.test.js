import test from 'node:test';
import assert from 'node:assert/strict';
import { civilDate, dateKey, startOfWeek, addDays } from '../src/calendar.js';
import { hourLabel, layoutDay, segmentForDay } from '../src/schedule.js';
import { listRangeEvents } from '../src/googleCalendar.js';

const timed = (id, start, end) => ({ id, start: { dateTime: start }, end: { dateTime: end } });
function inNewYork(fn) {
  const previous = process.env.TZ;
  process.env.TZ = 'America/New_York';
  try { return fn(); } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
}

test('the selected week runs Monday through Sunday across a year boundary', () => {
  const monday = startOfWeek(civilDate(2027, 0, 1));
  assert.equal(dateKey(monday), '2026-12-28');
  assert.equal(dateKey(addDays(monday, 6)), '2027-01-03');
  assert.equal(hourLabel(0), '12am');
  assert.equal(hourLabel(12), '12pm');
  assert.equal(hourLabel(24), '12am');
});

test('timed segments clip overnight events at local midnight and exclude adjacent days', () => inNewYork(() => {
  const event = timed('overnight', '2026-10-05T23:00:00-04:00', '2026-10-06T02:00:00-04:00');
  const monday = segmentForDay(event, civilDate(2026, 9, 5));
  assert.equal(monday.from, 1380);
  assert.equal(monday.to, 1440);
  const tuesday = segmentForDay(event, civilDate(2026, 9, 6));
  assert.equal(tuesday.from, 0);
  assert.equal(tuesday.to, 120);
  assert.equal(segmentForDay(event, civilDate(2026, 9, 7)), null);
  const boundary = timed('boundary', '2026-10-05T23:00:00-04:00', '2026-10-06T00:00:00-04:00');
  assert.equal(segmentForDay(boundary, civilDate(2026, 9, 6)), null);
}));

test('multi-day all-day events use exclusive end dates without timezone shifts', () => {
  const event = { id: 'all-day', start: { date: '2026-10-05' }, end: { date: '2026-10-08' } };
  for (const day of [5, 6, 7]) assert.equal(segmentForDay(event, civilDate(2026, 9, day)).allDay, true);
  assert.equal(segmentForDay(event, civilDate(2026, 9, 8)), null);
});

test('overlaps occupy separate lanes; touching and later events reuse available space', () => inNewYork(() => {
  const events = [
    timed('long', '2026-10-05T09:00:00-04:00', '2026-10-05T11:00:00-04:00'),
    timed('overlap', '2026-10-05T10:00:00-04:00', '2026-10-05T10:30:00-04:00'),
    timed('touching', '2026-10-05T10:30:00-04:00', '2026-10-05T11:00:00-04:00'),
    timed('later', '2026-10-05T14:00:00-04:00', '2026-10-05T15:00:00-04:00'),
  ];
  const layout = layoutDay(events, civilDate(2026, 9, 5));
  assert.equal(layout.lanes, 2);
  assert.deepEqual(layout.timed.map(segment => segment.lane), [0, 1, 1, 0]);
  assert.deepEqual(layout.timed.map(segment => segment.columns), [2, 2, 2, 1]);
  assert.equal(events[0].lane, undefined);
}));

test('daylight saving days retain a midnight-to-midnight 24-hour wall-clock axis', () => inNewYork(() => {
  const fullSpringDay = timed('spring', '2026-03-08T00:00:00-05:00', '2026-03-09T00:00:00-04:00');
  const spring = segmentForDay(fullSpringDay, civilDate(2026, 2, 8));
  assert.equal(spring.from, 0);
  assert.equal(spring.to, 1440);
  const repeatedHour = timed('fall', '2026-11-01T01:45:00-04:00', '2026-11-01T01:15:00-05:00');
  const fall = segmentForDay(repeatedHour, civilDate(2026, 10, 1));
  assert(fall.to > fall.from);
}));

test('week requests use a single inclusive-start / exclusive-end date range', async t => {
  t.mock.method(globalThis, 'fetch', async url => {
    const from = new Date(url.searchParams.get('timeMin'));
    const to = new Date(url.searchParams.get('timeMax'));
    assert.equal((to - from) / 3600000, 7 * 24);
    assert.equal(url.searchParams.get('singleEvents'), 'true');
    return new Response(JSON.stringify({ items: [] }));
  });
  await listRangeEvents('test-token', { id: 'primary' }, civilDate(2026, 9, 5), civilDate(2026, 9, 12));
});
