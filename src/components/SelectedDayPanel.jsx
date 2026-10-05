import { useMemo } from 'react';
import { dateKey, dayOfYear, daysInYear, formatDate, isoWeek } from '../calendar.js';
import { layoutDay } from '../schedule.js';
import { EventButton, TimeAxis, useCurrentTime, VerticalDayTrack } from './ScheduleTimeline.jsx';

const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone.replaceAll('_', ' ');

export default function SelectedDayPanel({ selected, seasons, google, onSettings, onEvent }) {
  const now = useCurrentTime();
  const layout = useMemo(() => layoutDay(google.events, selected), [google.events, selected]);
  const season = seasons.find(event => event.key === dateKey(selected));
  const busy = google.loadingCalendars || google.loadingEvents;
  return <aside className="selected-day-panel" aria-label="Selected day schedule" aria-busy={busy}>
    <header className="day-panel-heading">
      <div aria-live="polite" aria-atomic="true">
        <p className="day-panel-weekday">{formatDate(selected, { weekday: 'long' })}</p>
        <h3>{formatDate(selected, { month: 'long', day: 'numeric', year: 'numeric' })}</h3>
        <p className="date-meta">Day {dayOfYear(selected)} of {daysInYear(selected.getUTCFullYear())} <span>·</span> Week {isoWeek(selected)}</p>
        {season && <p className="season-detail">{season.name} <span>· {season.timeLabel}</span></p>}
      </div>
      <p className="day-panel-time-zone">{TIME_ZONE}</p>
    </header>
    <div className="schedule-status" aria-live="polite">
      {!google.connected && <p className="schedule-muted">{google.authError || 'Connect your calendars to see your schedule.'} <button className="schedule-text-button" onClick={onSettings}>Open settings</button></p>}
      {google.connected && !google.selectedIds.length && <p className="schedule-muted">Choose calendars in <button className="schedule-text-button" onClick={onSettings}>Settings</button> to see your schedule.</p>}
      {busy && <p className="schedule-muted">Loading your day…</p>}
      {google.calendarError && <p className="schedule-error" role="alert">{google.calendarError}</p>}
      {google.eventErrors.map(message => <p key={message} className="schedule-error" role="alert">{message}</p>)}
    </div>
    <div className="day-panel-schedule" role="region" aria-label="Selected day 24-hour vertical schedule">
      <div className="day-panel-all-day-caption">All day</div>
      <div className="week-all-day day-panel-all-day">
        {layout.allDay.map(event => <EventButton key={`${event.calendar.id}:${event.id}`} event={event} onClick={() => onEvent(event)} />)}
      </div>
      <TimeAxis vertical />
      <VerticalDayTrack day={selected} layout={layout} onEvent={onEvent} now={now} className="day-panel-time-column" />
    </div>
  </aside>;
}
