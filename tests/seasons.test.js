import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seasonEvents } from '../src/seasons.js';

test('2026 events agree with US Naval Observatory UTC times within two minutes', () => {
  // https://aa.usno.navy.mil/data/Earth_Seasons
  const reference = ['2026-03-20T14:46:00Z', '2026-06-21T08:24:00Z', '2026-09-23T00:05:00Z', '2026-12-21T20:50:00Z'];
  const events = seasonEvents(2026, 'UTC');
  events.forEach((event, index) => assert.ok(Math.abs(event.instant - new Date(reference[index])) < 120_000, event.name));
});

test('event dates follow the viewer time zone at midnight boundaries', () => {
  assert.deepEqual(seasonEvents(2026, 'America/New_York').map(event => event.key), ['2026-03-20', '2026-06-21', '2026-09-22', '2026-12-21']);
  assert.equal(seasonEvents(2024, 'UTC')[0].key, '2024-03-20');
  assert.equal(seasonEvents(2024, 'America/New_York')[0].key, '2024-03-19');
});

test('year navigation recalculates all four events including supported endpoints', () => {
  for (const year of [1900, 2024, 2025, 2026, 2100, 2200]) {
    const events = seasonEvents(year, 'UTC');
    assert.equal(events.length, 4);
    assert.deepEqual(events.map(event => event.date.getUTCMonth()), [2, 5, 8, 11]);
    for (const event of events) assert.equal(event.date.getUTCFullYear(), year);
  }
});
