import { useRef, useState } from 'react';
import { addDays, arcCell, dateKey, dayOfYear, FILLS, formatDate, isoWeek, point, startOfWeek, weekdayTrack } from '../calendar.js';
import { Sun } from './Icons.jsx';

const INNER = 175;
const TRACK = 30;
const TAU = Math.PI * 2;

function monthOutline(weeks, month, step, counterclockwise) {
  const belongsToMonth = cell => cell?.inYear && cell.date.getUTCMonth() === month;
  const edges = [];
  const sweep = step > 0 ? 1 : 0;

  for (const cell of weeks.flat()) {
    if (!belongsToMonth(cell)) continue;
    const { week, track } = cell;
    const radialTrack = weekdayTrack(track, week, weeks.length, counterclockwise);
    const inner = INNER + radialTrack * TRACK;
    const outer = inner + TRACK;
    const start = week * step;
    const end = start + step;

    const neighbor = (neighborWeek, neighborRing) => {
      if (neighborRing < 0 || neighborRing > 6 || !weeks[neighborWeek]) return undefined;
      return weeks[neighborWeek][weekdayTrack(neighborRing, neighborWeek, weeks.length, counterclockwise)];
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

export default function OrbitCalendar({ calendar, seasons, selected, today, onSelect }) {
  const cellRefs = useRef(new Map());
  const [zoomed, setZoomed] = useState(false);
  const [fadePast, setFadePast] = useState(false);
  const [counterclockwise, setCounterclockwise] = useState(true);
  const selectedKey = dateKey(selected);
  const todayKey = dateKey(today);
  const selectedWeek = +startOfWeek(selected);
  const step = (counterclockwise ? -1 : 1) * TAU / calendar.weekCount;

  function navigate(event, date) {
    const offsets = { ArrowRight: 7, ArrowLeft: -7, ArrowUp: -1, ArrowDown: 1, Home: -((date.getUTCDay() + 6) % 7), End: 6 - ((date.getUTCDay() + 6) % 7) };
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
      <button className="orbit-direction-button fade-past-control" aria-pressed={fadePast} onClick={() => setFadePast(value => !value)}>
        <span aria-hidden="true">◐</span> Fade past days
      </button>
    </div>
    <div className={`orbit-viewport${zoomed ? ' is-zoomed' : ''}`}>
    <svg className="calendar" viewBox="-55 -10 1010 920" aria-labelledby="calendar-title calendar-description">
      <title id="calendar-title">{calendar.year} orbital calendar</title>
      <desc id="calendar-description">The year moves {counterclockwise ? 'counterclockwise' : 'clockwise'} from January at the top. Each spoke reads Monday through Sunday from left to right: Monday is innermost on the right half and outermost on the left half. Each spoke is one week, with its ISO week number just inside the inner ring. Select a date to explore. Arrow left and right move one week; up and down move one day.</desc>
      {calendar.weeks.flat().map(({ date, key, track, week, inYear }) => {
        const start = week * step, end = start + step;
        const radialTrack = weekdayTrack(track, week, calendar.weekCount, counterclockwise);
        const [x, y] = point(INNER + TRACK * (radialTrack + .5), start + step / 2);
        const isSelected = key === selectedKey;
        const isToday = key === todayKey;
        const season = seasons.find(event => event.key === key);
        return <g key={key} className={fadePast && inYear && date < today && !isSelected ? 'past-day' : undefined}>
          <path
            ref={node => { if (node) cellRefs.current.set(key, node); else cellRefs.current.delete(key); }}
            d={arcCell(INNER + radialTrack * TRACK, INNER + (radialTrack + 1) * TRACK, start, end)}
            fill={isSelected ? '#35594d' : inYear ? FILLS[track] : '#f6f4ed'}
            className={`day-cell${isSelected ? ' selected' : ''}${!inYear ? ' outside' : ''}`}
            role={inYear ? 'button' : undefined}
            tabIndex={inYear && isSelected ? 0 : -1}
            aria-label={inYear ? `${formatDate(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}${isToday ? ', today' : ''}${season ? `, ${season.name}` : ''}` : undefined}
            aria-pressed={inYear ? isSelected : undefined}
            onClick={inYear ? () => onSelect(date) : undefined}
            onKeyDown={inYear ? event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(date); } else navigate(event, date); } : undefined}
          ><title>{formatDate(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}{season ? ` · ${season.name} · ${season.timeLabel}` : ''}</title></path>
          {season && inYear && <circle cx={x} cy={y} r="9" className={`season-date-circle${isSelected ? ' is-selected' : ''}`} aria-hidden="true" />}
          {inYear && <text x={x} y={y} dy=".35em" className={`day-number${isSelected ? ' selected-number' : ''}`} aria-hidden="true">{date.getUTCDate()}</text>}
          {isToday && inYear && <circle cx={x} cy={y + 8} r="1.5" fill={isSelected ? '#fff' : '#35594d'} pointerEvents="none" />}
        </g>;
      })}
      {Array.from({ length: 12 }, (_, month) => {
        const cells = calendar.weeks.flat().filter(cell => cell.inYear && cell.date.getUTCMonth() === month);
        const first = cells[0], last = cells.at(-1);
        const a = (first.week + first.track / 7) * step;
        const b = (last.week + (last.track + 1) / 7) * step;
        const angle = (a + b) / 2;
        const side = Math.sin(angle);
        const [x, y] = point(415, angle);
        const anchor = side < -.4 ? 'end' : side > .4 ? 'start' : 'middle';
        return <g key={month} className="month-marker" aria-hidden="true">
          <path className="month-outline" d={monthOutline(calendar.weeks, month, step, counterclockwise)} />
          <text x={x} y={y} dy=".35em" style={{ textAnchor: anchor }}>{formatDate(first.date, { month: 'long' }).toUpperCase()}</text>
        </g>;
      })}
      {calendar.weeks.map((week, index) => {
        const [x, y] = point(INNER - 11, (index + .5) * step);
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
        const angle = (cell.week + .5) * step;
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
      <text x="450" y="475" className="center-year">{calendar.year}</text>
      <g aria-live="polite" aria-atomic="true">
        <text x="450" y="507" className="center-caption">{formatDate(selected, { weekday: 'long', month: 'long', day: 'numeric' })}</text>
        <text x="450" y="533" className="center-progress">Day {dayOfYear(selected)} of {calendar.dayCount} · Week {isoWeek(selected)}</text>
      </g>
      <g className="active-week-outline" aria-hidden="true">
        {calendar.weeks.find(week => +week[0].date === selectedWeek)?.filter(cell => cell.inYear).map(cell => {
          const ring = weekdayTrack(cell.track, cell.week, calendar.weekCount, counterclockwise);
          const start = cell.week * step;
          return <path key={cell.key} d={arcCell(INNER + ring * TRACK, INNER + (ring + 1) * TRACK, start, start + step)} />;
        })}
      </g>
    </svg>
    </div>
    <button className="orbit-zoom-button" aria-pressed={zoomed} onClick={() => setZoomed(value => !value)}>{zoomed ? 'Show full orbit' : 'Enlarge dates'}</button>
    <p className="keyboard-hint">Select a day to explore <span>·</span> Use arrow keys to move through time</p>
  </div>;
}
