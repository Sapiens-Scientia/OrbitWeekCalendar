import { addDays, COLORS, dateKey, dayOfYear, daysInYear, formatDate, isoWeek, startOfWeek, WEEKDAYS, weekday } from '../calendar.js';

export default function DateDetail({ selected, onSelect }) {
  const start = startOfWeek(selected);
  const week = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  return <aside className="date-detail" aria-label="Selected date">
    <div className="selected-date" aria-live="polite" aria-atomic="true">
      <p className="weekday-title">{WEEKDAYS[weekday(selected)]}</p>
      <h1>{formatDate(selected, { month: 'long', day: 'numeric' })}</h1>
      <p className="date-meta">Day {dayOfYear(selected)} of {daysInYear(selected.getUTCFullYear())} <span>·</span> Week {isoWeek(selected)}</p>
    </div>
    <section className="week-section">
      <h2>Your week</h2>
      <div className="week-list">{week.map((date, i) => <button key={dateKey(date)} className={`week-day${dateKey(date) === dateKey(selected) ? ' is-selected' : ''}`} onClick={() => onSelect(date)} aria-label={formatDate(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} aria-pressed={dateKey(date) === dateKey(selected)}>
        <span className="color-dot" style={{ background: COLORS[i] }} /><span>{WEEKDAYS[i].slice(0, 3)}</span><span className="week-day-number">{date.getUTCDate()}</span><span className="week-month">{date.getUTCDate() === 1 || date.getUTCFullYear() !== selected.getUTCFullYear() ? formatDate(date, { month: 'short' }) : ''}</span>
      </button>)}</div>
    </section>
    <section className="reading-section">
      <h2>Reading the orbit</h2>
      <p>Each spoke is a week. Move inward from Monday to Sunday, and clockwise through the year.</p>
      <div className="track-legend">{WEEKDAYS.map((day, i) => <div key={day} title={`${day}: track ${i + 1}`}><span className="color-dot" style={{ background: COLORS[i] }} /><span>{day[0]}</span></div>)}</div>
      <div className="track-direction"><span>Outer</span><svg viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden="true"><path d="M0 6H198m-5-5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1" /></svg><span>Inner</span></div>
    </section>
  </aside>;
}
