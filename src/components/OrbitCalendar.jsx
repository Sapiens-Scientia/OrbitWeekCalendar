import { useRef, useState } from 'react';
import { addDays, arcCell, dateKey, dayOfYear, FILLS, formatDate, isoWeek, point, startOfWeek } from '../calendar.js';
import { Sun } from './Icons.jsx';

const INNER = 175;
const TRACK = 30;
const TAU = Math.PI * 2;

function monthOutline(weeks, month, step) {
  const belongsToMonth = cell => cell?.inYear && cell.date.getUTCMonth() === month;
  const edges = [];

  for (const cell of weeks.flat()) {
    if (!belongsToMonth(cell)) continue;
    const { week, track } = cell;
    const inner = INNER + (6 - track) * TRACK;
    const outer = inner + TRACK;
    const start = week * step;
    const end = start + step;

    // Only draw exposed edges, so a month has one stepped outline across its tracks.
    if (!belongsToMonth(weeks[week][track - 1])) {
      edges.push(`M ${point(outer, start)} A ${outer} ${outer} 0 0 1 ${point(outer, end)}`);
    }
    if (!belongsToMonth(weeks[week][track + 1])) {
      edges.push(`M ${point(inner, start)} A ${inner} ${inner} 0 0 1 ${point(inner, end)}`);
    }
    if (!belongsToMonth(weeks[week - 1]?.[track])) {
      edges.push(`M ${point(inner, start)} L ${point(outer, start)}`);
    }
    if (!belongsToMonth(weeks[week + 1]?.[track])) {
      edges.push(`M ${point(inner, end)} L ${point(outer, end)}`);
    }
  }

  return edges.join(' ');
}

export default function OrbitCalendar({ calendar, seasons, selected, today, onSelect }) {
  const cellRefs = useRef(new Map());
  const [zoomed, setZoomed] = useState(false);
  const selectedKey = dateKey(selected);
  const todayKey = dateKey(today);
  const selectedWeek = +startOfWeek(selected);
  const step = TAU / calendar.weekCount;
  const progress = dayOfYear(selected) / calendar.dayCount;

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
    <div className={`orbit-viewport${zoomed ? ' is-zoomed' : ''}`}>
    <svg className="calendar" viewBox="0 0 900 900" aria-labelledby="calendar-title calendar-description">
      <title id="calendar-title">{calendar.year} orbital calendar</title>
      <desc id="calendar-description">Seven rings: Monday outermost to Sunday innermost. Each spoke is one week, with its ISO week number just inside the inner ring. Select a date to explore. Arrow left and right move one week; up and down move one day.</desc>
      {calendar.weeks.flat().map(({ date, key, track, week, inYear }) => {
        const start = week * step, end = start + step;
        const radialTrack = 6 - track; // Monday outside, Sunday nearest the Sun.
        const [x, y] = point(INNER + TRACK * (radialTrack + .5), start + step / 2);
        const isSelected = key === selectedKey;
        const isToday = key === todayKey;
        const season = seasons.find(event => event.key === key);
        const isWeek = +startOfWeek(date) === selectedWeek;
        return <g key={key}>
          <path
            ref={node => { if (node) cellRefs.current.set(key, node); else cellRefs.current.delete(key); }}
            d={arcCell(INNER + radialTrack * TRACK, INNER + (radialTrack + 1) * TRACK, start, end)}
            fill={isSelected ? '#35594d' : inYear ? FILLS[track] : '#f6f4ed'}
            className={`day-cell${isSelected ? ' selected' : ''}${isWeek && inYear ? ' active-week' : ''}${!inYear ? ' outside' : ''}`}
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
        const [x, y] = point(426, (a + b) / 2);
        return <g key={month} className="month-marker" aria-hidden="true">
          <path className="month-outline" d={monthOutline(calendar.weeks, month, step)} />
          <path d={`M ${point(395, a + .007)} A 395 395 0 0 1 ${point(395, b - .007)}`} fill="none" stroke="#607468" strokeWidth="1" />
          <text x={x} y={y} dy=".35em">{formatDate(first.date, { month: 'long' }).toUpperCase()}</text>
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
      <text x="450" y="507" className="center-caption">One trip around the Sun</text>
      <line x1="354" y1="534" x2="546" y2="534" stroke="#dce0d5" strokeWidth="4" strokeLinecap="round" />
      <line x1="354" y1="534" x2={354 + 192 * progress} y2="534" stroke="#35594d" strokeWidth="4" strokeLinecap="round" />
      <text x="450" y="558" className="center-progress">{Math.round(progress * 100)}% of the year</text>
    </svg>
    </div>
    <button className="orbit-zoom-button" aria-pressed={zoomed} onClick={() => setZoomed(value => !value)}>{zoomed ? 'Show full orbit' : 'Enlarge dates'}</button>
    <p className="keyboard-hint">Select a day to explore <span>·</span> Use arrow keys to move through time</p>
  </div>;
}
