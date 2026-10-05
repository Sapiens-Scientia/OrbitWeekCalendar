import { addDays, civilDate, dateKey } from './calendar.js';

export const HOURS = Array.from({ length: 25 }, (_, hour) => hour);
export const hourLabel = hour => `${hour % 12 || 12}${hour < 12 || hour === 24 ? 'am' : 'pm'}`;
export const eventTitle = event => event.summary || (event.visibility === 'private' ? 'Private event' : 'Untitled event');

const clock = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
const fullClock = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
export function eventTimeLabel(event) {
  if (event.start.date) return 'All day';
  const start = new Date(event.start.dateTime), end = new Date(event.end.dateTime);
  const differentDay = start.toDateString() !== end.toDateString();
  return `${differentDay ? fullClock.format(start) : clock.format(start)} – ${differentDay ? fullClock.format(end) : clock.format(end)}`;
}

export function localMidnight(civil) {
  return new Date(civil.getUTCFullYear(), civil.getUTCMonth(), civil.getUTCDate());
}

const wallMinutes = date => date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;

export function currentTimePosition(now, day) {
  const today = civilDate(now.getFullYear(), now.getMonth(), now.getDate());
  return dateKey(today) === dateKey(day) ? wallMinutes(now) / 1440 * 100 : null;
}

// Clip overnight events to this civil day. Positions follow the 24-hour wall clock,
// rather than stretching the axis on 23/25-hour daylight-saving days.
export function segmentForDay(event, day) {
  const key = dateKey(day);
  if (event.start.date) {
    return event.start.date <= key && event.end.date > key ? { event, allDay: true } : null;
  }
  const midnight = localMidnight(day), nextMidnight = localMidnight(addDays(day, 1));
  const start = new Date(event.start.dateTime), end = new Date(event.end.dateTime);
  if (!Number.isFinite(+start) || !Number.isFinite(+end) || end <= midnight || start >= nextMidnight || end <= start) return null;
  const from = start <= midnight ? 0 : wallMinutes(start);
  const to = end >= nextMidnight ? 1440 : wallMinutes(end);
  // During the repeated fall-back hour, the end's wall time may precede the start.
  // Keep a visible segment, with the precise instants available in the event editor.
  return { event, allDay: false, from, to: Math.min(1440, Math.max(to, from + 1)) };
}

export function layoutDay(events, day) {
  const segments = events.map(event => segmentForDay(event, day)).filter(Boolean);
  const allDay = segments.filter(segment => segment.allDay).map(segment => segment.event);
  const timed = segments.filter(segment => !segment.allDay).sort((a, b) => a.from - b.from || b.to - a.to);
  const laneEnds = [];
  for (const segment of timed) {
    let lane = laneEnds.findIndex(end => end <= segment.from);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = segment.to;
    segment.lane = lane;
  }
  // Independent overlap groups can each use the full width in the week columns.
  let group = [], groupEnd = 0;
  function finishGroup() {
    const columns = Math.max(1, ...group.map(segment => segment.lane + 1));
    group.forEach(segment => { segment.columns = columns; });
  }
  for (const segment of timed) {
    if (group.length && segment.from >= groupEnd) { finishGroup(); group = []; }
    group.push(segment);
    groupEnd = Math.max(...group.map(item => item.to));
  }
  finishGroup();
  return { allDay, timed, lanes: Math.max(1, laneEnds.length) };
}
