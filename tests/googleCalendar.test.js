import test from 'node:test';
import assert from 'node:assert/strict';
import { civilDate } from '../src/calendar.js';
import { calendarRequest, canWriteCalendar, dayBounds, draftBody, eventDraft, eventPath, listCalendars, listDayEvents, sortEvents } from '../src/googleCalendar.js';

test('local day boundaries follow daylight saving instead of fixed 24-hour windows', () => {
  const previous = process.env.TZ;
  process.env.TZ = 'America/New_York';
  try {
    const spring = dayBounds(civilDate(2026, 2, 8));
    assert.equal(spring.timeMin, '2026-03-08T05:00:00.000Z');
    assert.equal(spring.timeMax, '2026-03-09T04:00:00.000Z');
    const autumn = dayBounds(civilDate(2026, 10, 1));
    assert.equal(+new Date(autumn.timeMax) - +new Date(autumn.timeMin), 25 * 3600000);
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});

test('all-day editor translates inclusive end dates to Google exclusive dates and back', () => {
  const body = draftBody({ summary: ' Trip ', location: ' Home ', description: 'Notes', allDay: true, start: '2026-12-30', end: '2027-01-02' });
  assert.deepEqual(body.start, { date: '2026-12-30', dateTime: null, timeZone: null });
  assert.deepEqual(body.end, { date: '2027-01-03', dateTime: null, timeZone: null });
  assert.equal(body.summary, 'Trip');
  const draft = eventDraft(civilDate(2026, 11, 30), 'primary', { ...body, calendar: { id: 'shared' } });
  assert.equal(draft.end, '2027-01-02');
  assert.equal(draft.calendarId, 'shared');
});

test('timed events use device-local times and reject invalid ranges and nonexistent DST times', () => {
  const previous = process.env.TZ;
  process.env.TZ = 'America/New_York';
  try {
    const draft = { summary: 'Meeting', location: '', description: '', allDay: false, start: '2026-10-05T09:00', end: '2026-10-05T10:00' };
    const body = draftBody(draft);
    assert.equal(body.start.dateTime, '2026-10-05T13:00:00.000Z');
    assert.equal(body.start.date, null);
    assert.equal(body.start.timeZone, 'America/New_York');
    assert.throws(() => draftBody({ ...draft, end: draft.start }), /after/);
    assert.throws(() => draftBody({ ...draft, start: '2026-03-08T02:30', end: '2026-03-08T04:00' }), /does not exist/);
    assert.throws(() => draftBody({ ...draft, summary: ' ' }), /title/);
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});

test('combined schedule sorts all-day events first and timed events by actual instant', () => {
  const items = [
    { id: 'late', start: { dateTime: '2026-10-05T09:00:00-07:00' } },
    { id: 'early', start: { dateTime: '2026-10-05T10:00:00-04:00' } },
    { id: 'all-day', start: { date: '2026-10-05' } },
  ];
  assert.deepEqual(sortEvents(items).map(item => item.id), ['all-day', 'early', 'late']);
  assert.equal(items[0].id, 'late');
});

test('calendar permission and encoded paths handle shared calendars', () => {
  for (const accessRole of ['owner', 'writer', 'writerWithoutPrivateAccess']) assert.equal(canWriteCalendar({ accessRole }), true);
  for (const accessRole of ['reader', 'freeBusyReader', 'none']) assert.equal(canWriteCalendar({ accessRole }), false);
  assert.equal(eventPath('shared/id@example.com', 'instance/id'), '/calendars/shared%2Fid%40example.com/events/instance%2Fid');
});

test('calendar and event listings follow pagination and expand recurring occurrences', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    const isCalendars = url.pathname.endsWith('calendarList');
    const next = url.searchParams.get('pageToken');
    const data = isCalendars ? (next ? { items: [{ id: 'primary', primary: true, accessRole: 'owner', summary: 'Personal' }] }
      : { items: [{ id: 'busy', accessRole: 'freeBusyReader' }, { id: 'shared', accessRole: 'reader', summary: 'Team' }], nextPageToken: 'next' })
      : next ? { items: [{ id: 'cancelled', status: 'cancelled' }, { id: 'instance', start: { dateTime: '2026-10-05T09:00:00Z' } }] }
        : { items: [{ id: 'all', start: { date: '2026-10-05' } }], nextPageToken: 'next' };
    return new Response(JSON.stringify(data), { status: 200 });
  });
  const calendars = await listCalendars('test-token');
  assert.deepEqual(calendars.map(calendar => calendar.id), ['primary', 'shared']);
  const events = await listDayEvents('test-token', calendars[0], civilDate(2026, 9, 5));
  assert.deepEqual(events.map(event => event.id), ['all', 'instance']);
  assert.equal(events[1].calendar.id, 'primary');
  assert.equal(calls[2].url.searchParams.get('singleEvents'), 'true');
  assert.equal(calls[2].url.searchParams.get('orderBy'), 'startTime');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-token');
});

test('writes preserve unrelated fields through PATCH and protect concurrent changes with ETags', async t => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(options.method, 'PATCH');
    assert.equal(options.headers['If-Match'], 'existing-etag');
    assert.deepEqual(JSON.parse(options.body), { summary: 'New title' });
    return new Response(JSON.stringify({ id: 'event' }));
  });
  await calendarRequest('test-token', eventPath('primary', 'event'), { method: 'PATCH', body: { summary: 'New title' }, etag: 'existing-etag' });
});

test('API handles empty delete responses, expired credentials and edit conflicts', async t => {
  let status = 204;
  t.mock.method(globalThis, 'fetch', async () => new Response(status === 204 ? null : '{}', { status }));
  assert.equal(await calendarRequest('test-token', '/event', { method: 'DELETE' }), null);
  status = 401;
  await assert.rejects(calendarRequest('test-token', '/event'), error => error.status === 401 && /expired/.test(error.message));
  status = 412;
  await assert.rejects(calendarRequest('test-token', '/event'), error => error.status === 412 && /changed/.test(error.message));
});
