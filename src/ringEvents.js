import { addDays, civilDate, dateKey, RING_INNER } from './calendar.js';

// All-day end dates are exclusive. Clip long events to the displayed year before
// expanding them, so an event spanning years can't generate unbounded cells.
export function allDayEventsByDate(events, year) {
  const dates = new Map();
  const first = dateKey(civilDate(year, 0, 1)), end = dateKey(civilDate(year + 1, 0, 1));
  for (const event of events) {
    if (!event.start?.date || !event.end?.date || event.status === 'cancelled') continue;
    const from = event.start.date > first ? event.start.date : first;
    const until = event.end.date < end ? event.end.date : end;
    if (from >= until) continue;
    for (let day = new Date(`${from}T00:00:00Z`); dateKey(day) < until; day = addDays(day, 1)) {
      const key = dateKey(day);
      const entries = dates.get(key) || [];
      entries.push(event);
      dates.set(key, entries);
    }
  }
  return dates;
}

// Join the visible event across adjacent dates, never across week spokes or
// different calendars. Extra events remain available through each day's chooser.
export function allDayEventSpans(weeks, eventsByDate) {
  const spans = [];
  for (const week of weeks) {
    let previous = null;
    for (const cell of week) {
      const event = cell.inYear ? eventsByDate.get(cell.key)?.[0] : null;
      if (!event) { previous = null; continue; }
      if (previous && previous.event.id === event.id && previous.event.calendar?.id === event.calendar?.id) {
        previous.cells.push(cell);
      } else {
        previous = { event, cells: [cell] };
        spans.push(previous);
      }
    }
  }
  return spans;
}

function roundedPolygon(points, rounding) {
  if (!rounding) return `M ${points.map(point => point.join(' ')).join(' L ')} Z`;
  const corners = points.map((point, index) => {
    const previous = points[(index + points.length - 1) % points.length], next = points[(index + 1) % points.length];
    const before = Math.hypot(previous[0] - point[0], previous[1] - point[1]);
    const after = Math.hypot(next[0] - point[0], next[1] - point[1]);
    const inset = Math.min(rounding, before / 2, after / 2);
    const toward = (neighbor, distance) => point.map((value, axis) => value + (neighbor[axis] - value) * inset / distance);
    return { point, incoming: toward(previous, before), outgoing: toward(next, after) };
  });
  return `M ${corners[0].incoming.join(' ')} ${corners.map(({ point, outgoing }, index) =>
    `${index ? `L ${corners[index].incoming.join(' ')} ` : ''}Q ${point.join(' ')} ${outgoing.join(' ')}`).join(' ')} Z`;
}

function taperedCorners(inner, outer, center, tangent) {
  const innerWidth = 2 * inner * tangent - 3, outerWidth = 2 * outer * tangent - 3;
  return [[-outerWidth / 2, center - outer], [outerWidth / 2, center - outer],
    [innerWidth / 2, center - inner], [-innerWidth / 2, center - inner]];
}

// Reserve the upper third of the spoke in the title's reading direction,
// using the same angular lane for every event. Size it for the innermost cell
// so single-day and joined strips share edges at every radius.
export function radialEventBox(inner, outer, start, end, outward = true) {
  const spokeAngle = (start + end) / 2;
  const spokeWidth = Math.abs(end - start);
  const spokeTangent = Math.tan(spokeWidth / 2);
  const labelFontSize = 2 * (inner + 2) * spokeTangent - 3 < 24 ? 5.5 : 6;
  const minimumFontSize = 2 * (RING_INNER + 2) * spokeTangent - 3 < 24 ? 5.5 : 6;
  const titleHeight = minimumFontSize + 3;
  const stripAngle = Math.max(spokeWidth / 3, 2 * Math.atan((titleHeight + 3) / (2 * (RING_INNER + 2))));
  const upperSide = outward ? -1 : 1;
  const angle = spokeAngle + upperSide * (spokeWidth - stripAngle) / 2;
  const radius = (inner + outer) / 2;
  const length = outer - inner - 4;
  const tangent = Math.tan(stripAngle / 2);
  const localCorners = taperedCorners(inner + 2, outer - 2, radius, tangent);
  const innerWidth = localCorners[2][0] * 2, outerWidth = localCorners[1][0] * 2;
  const rotation = angle * 180 / Math.PI;
  const x = 450 + radius * Math.sin(angle), y = 450 - radius * Math.cos(angle);
  return { x, y, radius, tangent, spokeAngle, spokeWidth, stripAngle, innerWidth, outerWidth, length, rotation, outward, corners: localCorners,
    path: roundedPolygon(localCorners, 2.5), labelFontSize, labelWidth: length - 8,
    labelX: x, labelY: y,
    labelRotation: rotation + (outward ? -90 : 90) };
}

export function radialEventDatePosition(box, radius) {
  const angle = box.spokeAngle + (box.outward ? 1 : -1) * box.stripAngle / 2;
  const width = 2 * radius * Math.tan((box.spokeWidth - box.stripAngle) / 2);
  const projection = Math.abs(Math.cos(angle)) + Math.abs(Math.sin(angle));
  const fontSize = Math.min(8, (width - 1) / (1.14 * projection));
  const x = 450 + radius * Math.sin(angle);
  const y = 450 - radius * Math.cos(angle);
  const direction = box.outward ? 1 : -1;
  return { x, y, fontSize,
    countX: x + direction * 9 * Math.sin(angle), countY: y - direction * 9 * Math.cos(angle),
    todayX: x - direction * 7 * Math.sin(angle), todayY: y + direction * 7 * Math.cos(angle) };
}

export function radialEventHitArea(box, inner, outer) {
  return roundedPolygon(taperedCorners(inner, outer, box.radius, box.tangent), 0);
}

export function compactEventLabel(title, width) {
  const characters = Array.from(title);
  const limit = Math.max(1, Math.floor(width / 3.4));
  return characters.length <= limit ? title : `${characters.slice(0, Math.max(1, limit - 1)).join('')}…`;
}
