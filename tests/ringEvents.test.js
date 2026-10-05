import test from 'node:test';
import assert from 'node:assert/strict';
import { allDayEventsByDate, allDayEventSpans, compactEventLabel, radialEventBox, radialEventHitArea, radialEventDatePosition } from '../src/ringEvents.js';
import { calendarYear, weekdayTrack } from '../src/calendar.js';
import { listYearAllDayEvents } from '../src/googleCalendar.js';

const allDay = (id, from, until) => ({ id, start: { date: from }, end: { date: until } });

test('ring dates expand multi-day events with exclusive ends and clip at year boundaries', () => {
  const events = [allDay('new-year', '2025-12-30', '2026-01-03'), allDay('trip', '2026-10-05', '2026-10-08'), allDay('end', '2026-12-31', '2027-01-04'),
    { ...allDay('cancelled', '2026-01-01', '2026-01-02'), status: 'cancelled' },
    { id: 'timed', start: { dateTime: '2026-10-05T09:00:00Z' }, end: { dateTime: '2026-10-05T10:00:00Z' } }];
  const dates = allDayEventsByDate(events, 2026);
  assert.deepEqual([...dates.keys()], ['2026-01-01', '2026-01-02', '2026-10-05', '2026-10-06', '2026-10-07', '2026-12-31']);
  assert.equal(dates.get('2026-01-01')[0].id, 'new-year');
  assert.equal(dates.has('2026-10-08'), false);
});

test('leap days and multiple calendars retain all all-day events on the same date', () => {
  const a = allDay('a', '2028-02-28', '2028-03-01'), b = allDay('b', '2028-02-29', '2028-03-01');
  const dates = allDayEventsByDate([a, b], 2028);
  assert.deepEqual(dates.get('2028-02-29').map(event => event.id), ['a', 'b']);
  assert.equal(dates.has('2028-03-01'), false);
  assert.equal(allDayEventsByDate([allDay('long', '1900-01-01', '2200-01-01')], 2028).size, 366);
});

test('the same event joins consecutive dates within a spoke and splits at week and year boundaries', () => {
  const trip = allDay('trip', '2026-06-18', '2026-06-23');
  const boundary = allDay('boundary', '2025-12-30', '2026-01-05');
  const spans = allDayEventSpans(calendarYear(2026).weeks, allDayEventsByDate([trip, boundary], 2026));
  assert.deepEqual(spans.map(span => span.cells.map(cell => cell.key)), [
    ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04'],
    ['2026-06-18', '2026-06-19', '2026-06-20', '2026-06-21'], ['2026-06-22'],
  ]);
  assert(spans.every(span => span.cells.every(cell => cell.week === span.cells[0].week)));
});

test('spans distinguish calendar and event IDs and preserve gaps and day-specific overlapping events', () => {
  const weeks = calendarYear(2026).weeks;
  const a = { ...allDay('same-id', '2026-10-05', '2026-10-08'), summary: 'Trip', calendar: { id: 'a' } };
  const b = { ...allDay('same-id', '2026-10-08', '2026-10-09'), summary: 'Trip', calendar: { id: 'b' } };
  const c = { ...allDay('different-id', '2026-10-09', '2026-10-10'), summary: 'Trip', calendar: { id: 'b' } };
  const overlap = allDay('overlap', '2026-10-06', '2026-10-07');
  const dates = allDayEventsByDate([a, b, c, overlap], 2026);
  const spans = allDayEventSpans(weeks, dates);
  assert.equal(spans.length, 3);
  assert.deepEqual(spans.map(span => span.cells.length), [3, 1, 1]);
  assert.equal(dates.get('2026-10-06').length, 2);
  dates.delete('2026-10-06');
  assert.deepEqual(allDayEventSpans(weeks, dates).map(span => span.cells.length), [1, 1, 1, 1]);
});

test('rounded event strips widen outward, fit their text, and leave the lower cell exposed in every orientation', () => {
  for (const direction of [-1, 1]) for (const bottom of [0, Math.PI]) for (const weeks of [53, 54]) for (let week = 0; week < weeks; week++) for (let ring = 0; ring < 7; ring++) {
    const step = direction * Math.PI * 2 / weeks, start = bottom + week * step;
    const inner = 175 + ring * 30, outer = inner + 30;
    const box = radialEventBox(inner, outer, start, start + step);
    assert.equal(box.length, 26);
    assert(Number.isFinite(box.labelX) && Number.isFinite(box.labelY));
    assert(box.labelWidth > 0);
    assert(Math.abs(Math.hypot(box.x - 450, box.y - 450) - (inner + outer) / 2) < 1e-8);
    assert(box.outerWidth > box.innerWidth);
    assert(box.stripAngle >= Math.abs(step) / 3 - 1e-8 && box.stripAngle < Math.abs(step) * .57);
    assert(box.innerWidth >= box.labelFontSize + 3 - 1e-8);
    assert(box.path.includes('Q'));
    for (const [tangent, localY] of box.corners) {
      const radial = -localY;
      const radius = Math.hypot((inner + outer) / 2 + radial, tangent);
      const angle = Math.atan2(tangent, (inner + outer) / 2 + radial) + box.rotation * Math.PI / 180 - box.spokeAngle;
      assert(radius > inner && radius < outer);
      assert(Math.abs(angle) < Math.abs(step) / 2);
    }
  }
});

test('joined boxes fit inside their spoke; radial titles follow weekday order in every orientation', () => {
  for (const direction of [-1, 1]) for (const bottom of [false, true]) for (let week = 0; week < 54; week++) for (let ring = 0; ring < 7; ring++) for (let days = 1; days <= 7 - ring; days++) {
    const step = direction * Math.PI * 2 / 54, start = (bottom ? Math.PI : 0) + week * step, angle = start + step / 2;
    const inner = 175 + ring * 30, outer = inner + days * 30;
    const monday = weekdayTrack(0, week, 54, direction < 0, bottom), sunday = weekdayTrack(6, week, 54, direction < 0, bottom);
    const outward = monday < sunday;
    const box = radialEventBox(inner, outer, start, start + step, outward);
    assert.equal(box.length, days * 30 - 4);
    assert(Number.isFinite(box.labelX) && Number.isFinite(box.labelY) && box.labelWidth > 0);
    const labelAngle = box.labelRotation * Math.PI / 180;
    const chronologicalX = (outward ? 1 : -1) * Math.sin(angle), chronologicalY = (outward ? -1 : 1) * Math.cos(angle);
    assert(Math.cos(labelAngle) * chronologicalX + Math.sin(labelAngle) * chronologicalY > .998);
    const titleAngle = box.rotation * Math.PI / 180;
    assert(Math.cos(labelAngle) * (outward ? 1 : -1) * Math.sin(titleAngle) + Math.sin(labelAngle) * (outward ? -1 : 1) * Math.cos(titleAngle) > .999999);
    for (const [tangent, localY] of box.corners) {
      const radius = Math.hypot(box.radius - localY, tangent);
      assert(radius > inner && radius < outer);
      assert(Math.abs(Math.atan2(tangent, box.radius - localY) + titleAngle - angle) < Math.abs(step) / 2);
    }
    for (let day = 0; day < days; day++) {
      const radius = inner + (day + .5) * 30;
      const position = radialEventDatePosition(box, radius);
      assert(Number.isFinite(position.x) && Number.isFinite(position.y));
      assert(position.fontSize >= 5);
      const dateAngle = Math.atan2(position.x - 450, 450 - position.y);
      const normalized = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
      assert(Math.abs(normalized(dateAngle - angle)) < Math.abs(step) / 2);
      // The date's center must select the day rather than the event strip.
      assert(Math.abs(normalized(dateAngle - titleAngle)) > box.stripAngle / 2);
      const from = Math.max(inner + day * 30, inner + 2), until = Math.min(inner + (day + 1) * 30, outer - 2);
      const hit = radialEventHitArea(box, from, until);
      const vertices = hit.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/g).map(Number);
      for (let vertex = 0; vertex < vertices.length; vertex += 2) {
        const r = box.radius - vertices[vertex + 1], tangent = vertices[vertex];
        assert(r >= from - 1e-8 && r <= until + 1e-8);
        assert(Math.abs(Math.atan2(tangent, r)) < Math.abs(step) / 2);
      }
    }
  }
});

test('single-day and multi-day strips share both edges and date positions at every radius', () => {
  const vertices = (box, radius) => {
    const values = radialEventHitArea(box, radius - 3, radius + 3).match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/g).map(Number);
    const angle = box.rotation * Math.PI / 180;
    return Array.from({ length: values.length / 2 }, (_, i) => {
      const [x, y] = values.slice(i * 2, i * 2 + 2);
      return [box.x + x * Math.cos(angle) - y * Math.sin(angle), box.y + x * Math.sin(angle) + y * Math.cos(angle)];
    });
  };
  for (const weeks of [53, 54]) for (const direction of [-1, 1]) for (const bottom of [false, true]) for (let week = 0; week < weeks; week++) {
    const step = direction * (Math.PI * 2 - .012) / weeks;
    const start = (bottom ? Math.PI : 0) + direction * .006 + week * step;
    const outward = weekdayTrack(0, week, weeks, direction < 0, bottom) < weekdayTrack(6, week, weeks, direction < 0, bottom);
    const joined = radialEventBox(175, 385, start, start + step, outward);
    for (let day = 0; day < 7; day++) {
      const inner = 175 + day * 30, radius = inner + 15;
      const single = radialEventBox(inner, inner + 30, start, start + step, outward);
      assert.equal(single.stripAngle, joined.stripAngle);
      assert.equal(single.rotation, joined.rotation);
      assert.deepEqual(radialEventDatePosition(single, radius), radialEventDatePosition(joined, radius));
      const a = vertices(single, radius), b = vertices(joined, radius);
      assert(a.every(([x, y], i) => Math.hypot(x - b[i][0], y - b[i][1]) < 1e-8));
    }
  }
});

test('compact labels truncate long titles without splitting unicode characters', () => {
  assert.equal(compactEventLabel('Trip', 30), 'Trip');
  assert.equal(compactEventLabel('Summer holiday', 20), 'Summ…');
  assert.equal(compactEventLabel('🌞🌞🌞🌞', 8), '🌞…');
});

test('year fetch keeps recurring all-day entries and discards timed events', async t => {
  t.mock.method(globalThis, 'fetch', async url => {
    assert(url.searchParams.get('timeMin').startsWith('2026-01-01'));
    assert(url.searchParams.get('timeMax').startsWith('2027-01-01'));
    assert.equal(url.searchParams.get('singleEvents'), 'true');
    return new Response(JSON.stringify({ items: [allDay('trip', '2026-06-01', '2026-06-03'), { id: 'meeting', start: { dateTime: '2026-06-01T12:00:00Z' }, end: { dateTime: '2026-06-01T13:00:00Z' } }] }));
  });
  assert.deepEqual((await listYearAllDayEvents('test-token', { id: 'primary' }, 2026)).map(event => event.id), ['trip']);
});
