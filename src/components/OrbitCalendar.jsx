import { useId, useMemo, useRef, useState } from 'react';
import { addDays, arcCell, changeYear, dateKey, dayOfYear, formatDate, isoWeek, point, quarterFill, RING_INNER as INNER, RING_TRACK as TRACK, startOfWeek, weekdayTrack } from '../calendar.js';
import { Chevron, Sun } from './Icons.jsx';
import { allDayEventsByDate, allDayEventSpans, compactEventLabel, radialEventBox, radialEventHitArea, radialEventDatePosition } from '../ringEvents.js';
import { calendarName } from '../googleCalendar.js';
import { eventTitle } from '../schedule.js';

const TAU = Math.PI * 2;
const YEAR_GAP = .012;

function monthOutline(weeks, month, step, counterclockwise, januaryAtBottom, angleOffset) {
  const belongsToMonth = cell => cell?.inYear && cell.date.getUTCMonth() === month;
  const edges = [];
  const sweep = step > 0 ? 1 : 0;

  for (const cell of weeks.flat()) {
    if (!belongsToMonth(cell)) continue;
    const { week, track } = cell;
    const radialTrack = weekdayTrack(track, week, weeks.length, counterclockwise, januaryAtBottom);
    const inner = INNER + radialTrack * TRACK;
    const outer = inner + TRACK;
    const start = angleOffset + week * step;
    const end = start + step;

    const neighbor = (neighborWeek, neighborRing) => {
      if (neighborRing < 0 || neighborRing > 6 || !weeks[neighborWeek]) return undefined;
      return weeks[neighborWeek][weekdayTrack(neighborRing, neighborWeek, weeks.length, counterclockwise, januaryAtBottom)];
    };

    // Compare physical neighbors, including where weekday order flips between halves.
    if (!belongsToMonth(neighbor(week, radialTrack + 1))) {
      edges.push(`M ${point(outer, start)} A ${outer} ${outer} 0 0 ${sweep} ${point(outer, end)}`);
    }
    if (!belongsToMonth(neighbor(week, radialTrack - 1))) {
      edges.push(`M ${point(inner, start)} A ${inner} ${inner} 0 0 ${sweep} ${point(inner, end)}`);
    }
    if (!belongsToMonth(neighbor(week - 1, radialTrack))) {
      edges.push(`M ${point(inner, start)} L ${point(outer, start)}`);
    }
    if (!belongsToMonth(neighbor(week + 1, radialTrack))) {
      edges.push(`M ${point(inner, end)} L ${point(outer, end)}`);
    }
  }

  return edges.join(' ');
}

export default function OrbitCalendar({ calendar, seasons, selected, today, onSelect, januaryAtBottom, onToggleJanuaryPosition, allDayEvents, onDayEvents }) {
  const timeArrowId = useId();
  const cellRefs = useRef(new Map());
  const [zoomed, setZoomed] = useState(false);
  const [fadePast, setFadePast] = useState(true);
  const [counterclockwise, setCounterclockwise] = useState(false);
  const selectedKey = dateKey(selected);
  const todayKey = dateKey(today);
  const currentWeekStart = startOfWeek(today);
  const selectedWeek = +startOfWeek(selected);
  const direction = counterclockwise ? -1 : 1;
  const step = direction * (TAU - YEAR_GAP) / calendar.weekCount;
  const angleOffset = (januaryAtBottom ? Math.PI : 0) + direction * YEAR_GAP / 2;
  const endAngle = angleOffset + calendar.weekCount * step;
  const arrowRadius = INNER + TRACK * 7 + 12;
  const arrowStart = angleOffset + step / 2;
  const arrowEnd = arrowStart + direction * 7 * Math.PI / 180;
  const eventsByDate = useMemo(() => allDayEventsByDate(allDayEvents, calendar.year), [allDayEvents, calendar.year]);
  const eventSpans = useMemo(() => allDayEventSpans(calendar.weeks, eventsByDate), [calendar.weeks, eventsByDate]);
  const eventLayouts = eventSpans.map(span => {
    const week = span.cells[0].week, start = angleOffset + week * step;
    const rings = span.cells.map(cell => weekdayTrack(cell.track, week, calendar.weekCount, counterclockwise, januaryAtBottom));
    const inner = INNER + Math.min(...rings) * TRACK, outer = INNER + (Math.max(...rings) + 1) * TRACK;
    const outward = weekdayTrack(0, week, calendar.weekCount, counterclockwise, januaryAtBottom) < weekdayTrack(6, week, calendar.weekCount, counterclockwise, januaryAtBottom);
    return { ...span, rings, inner, outer, box: radialEventBox(inner, outer, start, start + step, outward) };
  });
  const eventPositions = new Map(eventLayouts.flatMap(({ cells, rings, box }) => cells.map((cell, index) =>
    [cell.key, radialEventDatePosition(box, INNER + (rings[index] + .5) * TRACK)])));

  function navigate(event, date) {
    const offsets = { ArrowRight: 1, ArrowLeft: -1, ArrowUp: 7, ArrowDown: -7, Home: -((date.getUTCDay() + 6) % 7), End: 6 - ((date.getUTCDay() + 6) % 7) };
    if (!(event.key in offsets)) return;
    event.preventDefault();
    const next = addDays(date, offsets[event.key]);
    if (next.getUTCFullYear() !== calendar.year) return;
    onSelect(next);
    cellRefs.current.get(dateKey(next))?.focus();
  }

  return <div className="orbit-stage">
    <div className="orbit-display-controls">
      <button className="orbit-direction-button calendar-direction-control" aria-label="Counterclockwise calendar" aria-pressed={counterclockwise} onClick={() => setCounterclockwise(value => !value)}>
        <span aria-hidden="true">{counterclockwise ? '↺' : '↻'}</span> {counterclockwise ? 'Counterclockwise' : 'Clockwise'}
      </button>
      <button className="orbit-direction-button january-position-control" aria-label="January 1 at bottom" aria-pressed={januaryAtBottom} onClick={onToggleJanuaryPosition}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 3v18m-4-4 4 4 4-4M16 21V3m-4 4 4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Jan 1 at bottom
      </button>
      <button className="orbit-direction-button fade-past-control" aria-pressed={fadePast} onClick={() => setFadePast(value => !value)}>
        <span aria-hidden="true">◐</span> Fade past weeks
      </button>
    </div>
    <div className={`orbit-viewport${zoomed ? ' is-zoomed' : ''}`}>
    <div className="calendar-canvas">
    <svg className="calendar" viewBox="-55 15 1010 870" aria-labelledby="calendar-title calendar-description">
      <title id="calendar-title">{calendar.year} orbital calendar</title>
      <desc id="calendar-description">The year moves {counterclockwise ? 'counterclockwise' : 'clockwise'} from January at the {januaryAtBottom ? 'bottom' : 'top'}. Each spoke reads Monday through Sunday from left to right: Monday is innermost on the right half and outermost on the left half. Each spoke is one week, with its ISO week number just inside the inner ring. Select a date to explore. Right arrow selects the next day; left arrow selects the previous day. Up arrow selects the same weekday seven days later; down arrow selects the same weekday seven days earlier.</desc>
      <defs>
        <marker id={timeArrowId} markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto" markerUnits="userSpaceOnUse" viewBox="0 0 9 8">
          <path className="time-direction-arrowhead" d="M 1 1 L 8 4 L 1 7" />
        </marker>
      </defs>
      {calendar.weeks.flat().map(({ date, key, track, week, inYear }) => {
        const start = angleOffset + week * step, end = start + step;
        const radialTrack = weekdayTrack(track, week, calendar.weekCount, counterclockwise, januaryAtBottom);
        const isSelected = key === selectedKey;
        const isToday = key === todayKey;
        const season = seasons.find(event => event.key === key);
        return <g key={key} className={fadePast && inYear && date < currentWeekStart && !isSelected ? 'past-week' : undefined}>
          <path
            ref={node => { if (node) cellRefs.current.set(key, node); else cellRefs.current.delete(key); }}
            d={arcCell(INNER + radialTrack * TRACK, INNER + (radialTrack + 1) * TRACK, start, end)}
            fill={isSelected ? 'var(--accent)' : inYear ? quarterFill(date) : 'var(--paper)'}
            className={`day-cell${isSelected ? ' selected' : ''}${!inYear ? ' outside' : ''}`}
            data-date={key}
            role={inYear ? 'button' : undefined}
            tabIndex={inYear && isSelected ? 0 : -1}
            aria-label={inYear ? `${formatDate(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}${isToday ? ', today' : ''}${season ? `, ${season.name}` : ''}` : undefined}
            aria-pressed={inYear ? isSelected : undefined}
            onClick={inYear ? () => onSelect(date) : undefined}
            onKeyDown={inYear ? event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(date); } else navigate(event, date); } : undefined}
          ><title>{formatDate(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}{season ? ` · ${season.name} · ${season.timeLabel}` : ''}</title></path>
        </g>;
      })}
      <g aria-hidden="true">
        {[INNER, INNER + TRACK * 7].map(radius => <path key={radius} className="calendar-rim"
          d={`M ${point(radius, angleOffset)} A ${radius} ${radius} 0 1 ${direction > 0 ? 1 : 0} ${point(radius, endAngle)}`} />)}
        <g className="weekday-grid-dividers">
          {calendar.weeks.flatMap((cells, week) => [1, 2, 4].map(day => {
            if (!cells[day].inYear || !cells[day + 1].inYear) return null;
            const before = weekdayTrack(day, week, calendar.weekCount, counterclockwise, januaryAtBottom);
            const after = weekdayTrack(day + 1, week, calendar.weekCount, counterclockwise, januaryAtBottom);
            const radius = INNER + (Math.min(before, after) + 1) * TRACK;
            const start = angleOffset + week * step, end = start + step;
            return <path key={`${week}-${day}`} className={`weekday-grid-divider${day === 4 ? ' is-weekend' : ''}`}
              data-before={cells[day].key} data-after={cells[day + 1].key}
              d={`M ${point(radius, start)} A ${radius} ${radius} 0 0 ${step > 0 ? 1 : 0} ${point(radius, end)}`} />;
          }))}
        </g>
        {Array.from({ length: 12 }, (_, month) => <path key={month} className="month-outline" d={monthOutline(calendar.weeks, month, step, counterclockwise, januaryAtBottom, angleOffset)} />)}
        <g className="active-week-outline">
          {calendar.weeks.find(week => +week[0].date === selectedWeek)?.filter(cell => cell.inYear).map(cell => {
            const ring = weekdayTrack(cell.track, cell.week, calendar.weekCount, counterclockwise, januaryAtBottom);
            const start = angleOffset + cell.week * step;
            return <path key={cell.key} d={arcCell(INNER + ring * TRACK, INNER + (ring + 1) * TRACK, start, start + step)} />;
          })}
        </g>
      </g>
      {eventLayouts.map(({ event, cells, rings, inner, outer, box }) => {
        const isSelected = cells.some(cell => cell.key === selectedKey);
        const faded = fadePast && cells[0].date < currentWeekStart && !isSelected;
        return <g key={cells[0].key} className={`ring-event-span${faded ? ' past-week' : ''}`} data-event-id={event.id} data-calendar-id={event.calendar.id}
          data-start={cells[0].key} data-end={cells.at(-1).key}>
          <path className={`ring-event-box${isSelected ? ' is-selected' : ''}`} d={box.path}
            transform={`translate(${box.x} ${box.y}) rotate(${box.rotation})`} style={{ '--event-color': event.calendar.backgroundColor || 'var(--accent)' }} />
          {cells.map((cell, index) => {
            const dayEvents = eventsByDate.get(cell.key);
            const eventLabel = dayEvents.map(item => `${eventTitle(item)} (${calendarName(item.calendar)})`).join('; ');
            const openDayEvents = () => { onSelect(cell.date); onDayEvents(cell.date, dayEvents); };
            const cellInner = INNER + rings[index] * TRACK, cellOuter = cellInner + TRACK;
            const hitInner = Math.max(cellInner, inner + 2), hitOuter = Math.min(cellOuter, outer - 2);
            return <g key={cell.key} className="ring-event-badge" data-date={cell.key} role="button" tabIndex={0}
              aria-label={`All-day events on ${formatDate(cell.date, { month: 'long', day: 'numeric', year: 'numeric' })}: ${eventLabel}`}
              onClick={openDayEvents} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDayEvents(); } else navigate(e, cell.date); }}>
              <title>{eventLabel}</title>
              <path className="ring-event-hit-area" d={radialEventHitArea(box, hitInner, hitOuter)}
                transform={`translate(${box.x} ${box.y}) rotate(${box.rotation})`} />
            </g>;
          })}
          <text className="ring-event-label" x={box.labelX} y={box.labelY} dy=".35em" style={{ fontSize: box.labelFontSize }}
            transform={`rotate(${box.labelRotation} ${box.labelX} ${box.labelY})`} aria-hidden="true">{compactEventLabel(eventTitle(event), box.labelWidth)}</text>
        </g>;
      })}
      {calendar.weeks.flat().filter(cell => cell.inYear).map(({ date, key, track, week }) => {
        const ring = weekdayTrack(track, week, calendar.weekCount, counterclockwise, januaryAtBottom);
        const [x, y] = point(INNER + TRACK * (ring + .5), angleOffset + (week + .5) * step);
        const dayEvents = eventsByDate.get(key), isSelected = key === selectedKey;
        const position = eventPositions.get(key);
        const numberX = position?.x ?? x, numberY = position?.y ?? y;
        return <g key={key} className={fadePast && date < currentWeekStart && !isSelected ? 'past-week' : undefined} aria-hidden="true">
          {seasons.some(event => event.key === key) && <circle cx={numberX} cy={numberY} r={position ? position.fontSize < 8 ? 5 : 6.5 : 9} className={`season-date-circle${isSelected && !dayEvents ? ' is-selected' : ''}`} />}
          <text x={numberX} y={numberY} dy=".35em" style={position ? { fontSize: position.fontSize } : undefined} className={`day-number${dayEvents ? ' ring-event-day-number' : ''}${isSelected ? ' selected-number' : ''}`}>{date.getUTCDate()}</text>
          {dayEvents?.length > 1 && <text className={`ring-event-count${isSelected ? ' selected-number' : ''}`} data-date={key} x={position.countX} y={position.countY} dy=".35em">+{dayEvents.length - 1}</text>}
          {key === todayKey && <circle cx={position?.todayX ?? x} cy={position?.todayY ?? y + 8} r="1.5" fill={isSelected ? 'var(--on-accent)' : 'var(--accent)'} pointerEvents="none" />}
        </g>;
      })}
      <path className="year-seam" d={`M ${point(INNER, angleOffset)} L ${point(INNER + TRACK * 7, angleOffset)} M ${point(INNER, endAngle)} L ${point(INNER + TRACK * 7, endAngle)}`} aria-hidden="true" />
      <path className="time-direction-arrow" d={`M ${point(arrowRadius, arrowStart)} A ${arrowRadius} ${arrowRadius} 0 0 ${direction > 0 ? 1 : 0} ${point(arrowRadius, arrowEnd)}`}
        markerEnd={`url(#${timeArrowId})`} aria-hidden="true" />
      {Array.from({ length: 12 }, (_, month) => {
        const cells = calendar.weeks.flat().filter(cell => cell.inYear && cell.date.getUTCMonth() === month);
        const first = cells[0], last = cells.at(-1);
        const a = (first.week + first.track / 7) * step;
        const b = (last.week + (last.track + 1) / 7) * step;
        const angle = angleOffset + (a + b) / 2;
        const side = Math.sin(angle);
        const [x, y] = point(415, angle);
        const anchor = side < -.4 ? 'end' : side > .4 ? 'start' : 'middle';
        return <g key={month} className="month-marker" aria-hidden="true">
          <text x={x} y={y} dy=".35em" style={{ textAnchor: anchor }}>{formatDate(first.date, { month: 'long' }).toUpperCase()}</text>
        </g>;
      })}
      {calendar.weeks.map((week, index) => {
        const [x, y] = point(INNER - 11, angleOffset + (index + .5) * step);
        const number = isoWeek(week[0].date);
        return <text key={week[0].key} x={x} y={y} dy=".35em"
          className={`orbit-week-number${+week[0].date === selectedWeek ? ' is-selected' : ''}`}
          aria-label={`Week ${number}`}>
          <title>Week {number}: {formatDate(week[0].date, { month: 'short', day: 'numeric', year: 'numeric' })} – {formatDate(week[6].date, { month: 'short', day: 'numeric', year: 'numeric' })}</title>
          {number}
        </text>;
      })}
      {seasons.map(season => {
        const cell = calendar.weeks.flat().find(day => day.key === season.key);
        if (!cell) return null;
        const angle = angleOffset + (cell.week + .5) * step;
        const [x, y] = point(130, angle);
        const [tickX, tickY] = point(149, angle);
        const [edgeX, edgeY] = point(154, angle);
        return <g key={season.id} className="season-marker" role="button" tabIndex={0}
          aria-label={`${season.name}, ${formatDate(season.date, { month: 'long', day: 'numeric' })}, ${season.timeLabel}`}
          onClick={() => onSelect(season.date)}
          onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(season.date); } }}>
          <title>{season.name} · {season.timeLabel} · {season.timeZone}</title>
          <circle className="season-hit-area" cx={x} cy={y} r="28" />
          <line x1={tickX} y1={tickY} x2={edgeX} y2={edgeY} />
          <text x={x} y={y - 4} className="season-date">{formatDate(season.date, { month: 'short', day: 'numeric' }).toUpperCase()}</text>
          <text x={x} y={y + 10} className="season-kind">{season.kind.toUpperCase()}</text>
        </g>;
      })}
      <Sun />
      <g aria-live="polite" aria-atomic="true">
        <text x="450" y="507" className="center-caption">{formatDate(selected, { weekday: 'long', month: 'long', day: 'numeric' })}</text>
        <text x="450" y="533" className="center-progress">Day {dayOfYear(selected)} of {calendar.dayCount} · Week {isoWeek(selected)}</text>
      </g>
    </svg>
        <div className="center-year-controls">
          <button className="icon-button" aria-label="Previous year" disabled={calendar.year <= 1900} onClick={() => onSelect(changeYear(selected, calendar.year - 1))}><Chevron direction="left" /></button>
          <div className="center-year-picker">
            <span className="center-year" aria-hidden="true">{calendar.year}</span>
            <select className="center-year-select" aria-label="Displayed year" value={calendar.year} onChange={event => onSelect(changeYear(selected, Number(event.target.value)))}>
              {Array.from({ length: 301 }, (_, index) => 1900 + index).map(year => <option key={year} value={year}>{year}</option>)}
            </select>
            <span className="year-picker-chevron" aria-hidden="true">⌄</span>
          </div>
          <button className="icon-button" aria-label="Next year" disabled={calendar.year >= 2200} onClick={() => onSelect(changeYear(selected, calendar.year + 1))}><Chevron /></button>
        </div>
    </div>
    </div>
    <button className="orbit-zoom-button" aria-pressed={zoomed} onClick={() => setZoomed(value => !value)}>{zoomed ? 'Show full orbit' : 'Enlarge dates'}</button>
    <p className="keyboard-hint">←/→ change day <span>·</span> ↑ next week <span>·</span> ↓ previous week</p>
  </div>;
}
