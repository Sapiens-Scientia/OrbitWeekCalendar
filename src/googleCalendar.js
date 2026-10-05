import { addDays, civilDate, dateKey } from './calendar.js';

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/calendar.events',
];
const API = 'https://www.googleapis.com/calendar/v3';
let identityPromise;

// Load only when connecting. The orbit still works offline without Google's script.
export function loadGoogleIdentity() {
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google.accounts.oauth2);
  if (!identityPromise) {
    identityPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      const timeout = setTimeout(() => fail(), 15000);
      function fail() {
        clearTimeout(timeout);
        script.remove();
        identityPromise = undefined;
        reject(new Error('Google sign-in could not load. Check your connection and try again.'));
      }
      script.onload = () => {
        if (!window.google?.accounts?.oauth2) return fail();
        clearTimeout(timeout);
        resolve(window.google.accounts.oauth2);
      };
      script.onerror = fail;
      document.head.append(script);
    });
  }
  return identityPromise;
}

export const canWriteCalendar = calendar => ['owner', 'writer', 'writerWithoutPrivateAccess'].includes(calendar.accessRole);
export const calendarName = calendar => calendar.summaryOverride || calendar.summary || 'Calendar';

// Selected dates are UTC civil dates; API boundaries are local midnights.
// Construct the next midnight separately so DST days can be 23 or 25 hours.
export function dayBounds(selected) {
  const year = selected.getUTCFullYear(), month = selected.getUTCMonth(), day = selected.getUTCDate();
  return {
    timeMin: new Date(year, month, day).toISOString(),
    timeMax: new Date(year, month, day + 1).toISOString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

export async function calendarRequest(token, path, { method = 'GET', params, body, signal, etag } = {}) {
  const url = new URL(`${API}${path}`);
  if (params) Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, String(value));
  });
  const response = await fetch(url, {
    method, signal,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(etag ? { 'If-Match': etag } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = response.status === 401 ? 'Your Google session expired. Connect again to continue.'
      : response.status === 412 ? 'This event changed in Google Calendar. Refresh the schedule before editing it again.'
      : data.error?.message || `Google Calendar request failed (${response.status}).`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function listPages(token, path, params, signal) {
  const items = [];
  let pageToken;
  do {
    const page = await calendarRequest(token, path, { params: { ...params, pageToken }, signal });
    items.push(...(page.items || []));
    pageToken = page.nextPageToken;
  } while (pageToken);
  return items;
}

export async function listCalendars(token, signal) {
  const calendars = await listPages(token, '/users/me/calendarList', { maxResults: 250 }, signal);
  return calendars.filter(calendar => !calendar.deleted && calendar.accessRole !== 'freeBusyReader')
    .sort((a, b) => Number(Boolean(b.primary)) - Number(Boolean(a.primary)) || calendarName(a).localeCompare(calendarName(b)));
}

export async function listDayEvents(token, calendar, selected, signal) {
  return listRangeEvents(token, calendar, selected, addDays(selected, 1), signal);
}

export async function listRangeEvents(token, calendar, start, end, signal) {
  const items = await listPages(token, `/calendars/${encodeURIComponent(calendar.id)}/events`, {
    ...dayBounds(start), timeMax: dayBounds(end).timeMin,
    singleEvents: true, orderBy: 'startTime', maxResults: 2500,
  }, signal);
  return items.filter(event => event.status !== 'cancelled').map(event => ({ ...event, calendar }));
}

export async function listYearAllDayEvents(token, calendar, year, signal) {
  const events = await listRangeEvents(token, calendar, civilDate(year, 0, 1), civilDate(year + 1, 0, 1), signal);
  return events.filter(event => event.start?.date && event.end?.date);
}

export function sortEvents(events) {
  return [...events].sort((a, b) => Number(Boolean(b.start.date)) - Number(Boolean(a.start.date))
    || new Date(a.start.date || a.start.dateTime) - new Date(b.start.date || b.start.dateTime));
}

export function eventPath(calendarId, eventId) {
  return `/calendars/${encodeURIComponent(calendarId)}/events${eventId ? `/${encodeURIComponent(eventId)}` : ''}`;
}

export function localInputDate(dateTime) {
  const date = new Date(dateTime);
  const pad = number => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function eventDraft(selected, calendarId, event) {
  const day = dateKey(selected);
  const allDay = Boolean(event?.start.date);
  return {
    calendarId: event?.calendar.id || calendarId,
    summary: event?.summary || '', location: event?.location || '', description: event?.description || '',
    allDay,
    start: event ? (allDay ? event.start.date : localInputDate(event.start.dateTime)) : `${day}T09:00`,
    end: event ? (allDay ? dateKey(addDays(new Date(`${event.end.date}T00:00:00Z`), -1)) : localInputDate(event.end.dateTime)) : `${day}T10:00`,
  };
}

export function draftBody(draft) {
  if (!draft.summary.trim()) throw new Error('Give your event a title.');
  let start, end;
  if (draft.allDay) {
    if (!draft.start || !draft.end || draft.end < draft.start) throw new Error('The end date must be on or after the start date.');
    // Explicit nulls remove the other representation during a PATCH conversion.
    start = { date: draft.start, dateTime: null, timeZone: null };
    end = { date: dateKey(addDays(new Date(`${draft.end}T00:00:00Z`), 1)), dateTime: null, timeZone: null };
  } else {
    const from = new Date(draft.start), to = new Date(draft.end);
    if (!Number.isFinite(+from) || !Number.isFinite(+to) || to <= from) throw new Error('The end time must be after the start time.');
    // Catch local times that don't exist during the spring DST transition.
    if (localInputDate(from) !== draft.start || localInputDate(to) !== draft.end) throw new Error('This time does not exist in your time zone. Choose another time.');
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    start = { dateTime: from.toISOString(), date: null, timeZone };
    end = { dateTime: to.toISOString(), date: null, timeZone };
  }
  return { summary: draft.summary.trim(), location: draft.location.trim(), description: draft.description, start, end };
}
