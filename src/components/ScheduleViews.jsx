import { useEffect, useMemo, useState } from 'react';
import { addDays, dateKey, formatDate, startOfWeek, weekday } from '../calendar.js';
import { calendarName, canWriteCalendar } from '../googleCalendar.js';
import { eventTimeLabel, eventTitle, HOURS, hourLabel, layoutDay } from '../schedule.js';
import EventEditor from './EventEditor.jsx';
import { Chevron } from './Icons.jsx';

const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const MIN_DATE = '1900-01-01', MAX_DATE = '2200-12-31';
const inBounds = date => dateKey(date) >= MIN_DATE && dateKey(date) <= MAX_DATE;

function EventButton({ event, className = '', style, onClick, children }) {
  const label = `${eventTitle(event)}, ${eventTimeLabel(event)}, ${calendarName(event.calendar)}`;
  return <button className={`timeline-event ${className}`} style={{ '--event-color': event.calendar.backgroundColor || '#35594d', ...style }}
    aria-label={label} title={label} onClick={onClick}>{children || eventTitle(event)}</button>;
}

function HourGrid({ vertical = false }) {
  return <div className={`hour-grid${vertical ? ' vertical' : ''}`} aria-hidden="true">{HOURS.slice(0, 24).map(hour => <span key={hour} />)}</div>;
}

function TimeAxis({ vertical = false }) {
  const visible = vertical ? HOURS : HOURS.filter(hour => hour % 3 === 0);
  return <div className={`time-axis${vertical ? ' vertical' : ''}`} aria-hidden="true">{visible.map(hour => <span key={hour} style={{ [vertical ? 'top' : 'left']: `${hour / 24 * 100}%` }}>{hourLabel(hour)}</span>)}</div>;
}

function TimeShading({ day }) {
  return <><div className="nighttime-shading" aria-hidden="true" />{weekday(day) < 5 && <div className="worktime-shading" aria-hidden="true" />}</>;
}

function DayStrip({ day, layout, onEvent }) {
  return <div className="day-strip-scroll" tabIndex={0} role="region" aria-label="Selected day 24-hour timeline">
    <div className="day-strip-content">
      <TimeAxis />
      {layout.allDay.length > 0 && <div className="day-all-day"><span className="all-day-label">All day</span>{layout.allDay.map(event => <EventButton key={`${event.calendar.id}:${event.id}`} event={event} onClick={() => onEvent(event)} />)}</div>}
      <div className="day-time-track" style={{ height: `${layout.lanes * 36 + 16}px` }}>
        <TimeShading day={day} /><HourGrid />
        {layout.timed.map(segment => <EventButton key={`${segment.event.calendar.id}:${segment.event.id}`} event={segment.event} className="horizontal-event"
          style={{ left: `${segment.from / 1440 * 100}%`, width: `${(segment.to - segment.from) / 1440 * 100}%`, top: `${8 + segment.lane * 36}px` }}
          onClick={() => onEvent(segment.event)}><span>{eventTitle(segment.event)}</span></EventButton>)}
      </div>
    </div>
  </div>;
}

function WeekView({ days, layouts, selected, onSelect, onEvent }) {
  const selectedKey = dateKey(selected);
  const hasAllDay = layouts.some(layout => layout.allDay.length);
  return <div className="week-view-scroll" tabIndex={0} role="region" aria-label="Monday through Sunday 24-hour week schedule">
    <div className="week-time-grid">
      <div className="week-axis-caption">24 hours</div>
      {days.map(day => <button key={`heading:${dateKey(day)}`} className={`week-date-heading${dateKey(day) === selectedKey ? ' is-selected' : ''}`}
        aria-label={`Select ${formatDate(day, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`}
        aria-pressed={dateKey(day) === selectedKey} disabled={!inBounds(day)} onClick={() => onSelect(day)}>
        <span>{formatDate(day, { weekday: 'short' })}</span><strong>{formatDate(day, { month: 'short', day: 'numeric' })}</strong>
      </button>)}
      {hasAllDay && <><div className="week-all-day-caption">All day</div>{layouts.map((layout, index) => <div className="week-all-day" key={`all-day:${dateKey(days[index])}`}>
        {layout.allDay.map(event => <EventButton key={`${event.calendar.id}:${event.id}`} event={event} onClick={() => onEvent(event)} />)}
      </div>)}</>}
      <TimeAxis vertical />
      {days.map((day, index) => <div key={dateKey(day)} className={`week-time-column${dateKey(day) === selectedKey ? ' is-selected' : ''}`}
        role="group" aria-label={`${formatDate(day, { weekday: 'long', month: 'long', day: 'numeric' })} schedule`}>
        <TimeShading day={day} /><HourGrid vertical />
        {layouts[index].timed.map(segment => <EventButton key={`${segment.event.calendar.id}:${segment.event.id}`} event={segment.event} className="vertical-event"
          style={{ top: `${segment.from / 1440 * 100}%`, height: `${(segment.to - segment.from) / 1440 * 100}%`, left: `calc(${segment.lane / segment.columns * 100}% + 2px)`, width: `calc(${100 / segment.columns}% - 4px)` }}
          onClick={() => onEvent(segment.event)}><span>{eventTitle(segment.event)}</span></EventButton>)}
      </div>)}
    </div>
  </div>;
}

export default function ScheduleViews({ selected, onSelect, google, onSettings }) {
  const [editor, setEditor] = useState(null);
  const [notice, setNotice] = useState('');
  const weekKey = dateKey(startOfWeek(selected));
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(new Date(`${weekKey}T00:00:00Z`), index)), [weekKey]);
  const layouts = useMemo(() => days.map(day => layoutDay(google.events, day)), [days, google.events]);
  const selectedLayout = layouts[weekday(selected)];
  const busy = google.loadingCalendars || google.loadingEvents;
  const writable = google.connected && google.calendars.some(canWriteCalendar);
  useEffect(() => { if (!google.connected) { setEditor(null); setNotice(''); } }, [google.connected]);
  function selectDay(day) { setNotice(''); onSelect(day); }
  const previous = addDays(selected, -1), next = addDays(selected, 1);
  const previousWeek = addDays(selected, -7), nextWeek = addDays(selected, 7);
  return <div className="schedule-views" aria-busy={busy}>
    <section className="selected-day-section" aria-labelledby="selected-day-title">
      <header className="timeline-section-header">
        <div className="timeline-title-navigation"><nav className="schedule-day-navigation" aria-label="Schedule day">
          <button className="icon-button" aria-label="Previous day" disabled={!inBounds(previous)} onClick={() => selectDay(previous)}><Chevron direction="left" /></button>
          <button className="icon-button" aria-label="Next day" disabled={!inBounds(next)} onClick={() => selectDay(next)}><Chevron /></button>
        </nav><h1 id="selected-day-title">{formatDate(selected, { weekday: 'long', month: 'long', day: 'numeric' })}</h1></div>
        <div className="schedule-actions"><span className="schedule-time-zone">{TIME_ZONE.replaceAll('_', ' ')}</span>
          {google.connected && <button className="schedule-text-button" disabled={busy} onClick={() => { setNotice(''); google.refresh(); }}>Refresh</button>}
          <button className="schedule-button" disabled={!writable || google.loadingCalendars} onClick={() => setEditor({ selected, event: null })}>Add event</button>
        </div>
      </header>
      <div className="schedule-status" aria-live="polite">
        {notice && <p className="schedule-notice">{notice}</p>}
        {!google.connected && <p className="schedule-muted">{google.authError || 'Connect your calendars to see your schedule.'} <button className="schedule-text-button" onClick={onSettings}>Open settings</button></p>}
        {google.connected && !google.selectedIds.length && <p className="schedule-muted">Choose calendars in <button className="schedule-text-button" onClick={onSettings}>Settings</button> to see your schedule.</p>}
        {busy && <p className="schedule-muted">Loading your week…</p>}
        {google.calendarError && <p className="schedule-error" role="alert">{google.calendarError}</p>}
        {google.eventErrors.map(message => <p key={message} className="schedule-error" role="alert">{message}</p>)}
      </div>
      <DayStrip day={selected} layout={selectedLayout} onEvent={event => setEditor({ selected, event })} />
    </section>
    <section className="week-schedule-section" aria-labelledby="week-schedule-title">
      <header className="timeline-section-header">
        <div className="timeline-title-navigation"><nav className="schedule-day-navigation" aria-label="Schedule week">
          <button className="icon-button" aria-label="Previous week" disabled={!inBounds(previousWeek)} onClick={() => selectDay(previousWeek)}><Chevron direction="left" /></button>
          <button className="icon-button" aria-label="Next week" disabled={!inBounds(nextWeek)} onClick={() => selectDay(nextWeek)}><Chevron /></button>
        </nav><h2 id="week-schedule-title">{formatDate(days[0], { month: 'short', day: 'numeric' })} – {formatDate(days[6], { month: 'short', day: 'numeric', year: 'numeric' })}</h2></div>
        <div className="time-shading-legend"><span><i className="night-legend" />Night · 12am–6am</span><span><i className="work-legend" />Work · Mon–Fri, 9am–5pm</span></div>
      </header>
      <WeekView days={days} layouts={layouts} selected={selected} onSelect={selectDay} onEvent={event => setEditor({ selected, event })} />
    </section>
    {editor && google.connected && <EventEditor selected={editor.selected} calendars={google.calendars} selectedIds={google.selectedIds} event={editor.event} onWrite={google.writeEvent} onClose={message => { setEditor(null); if (message) setNotice(message); }} />}
  </div>;
}
