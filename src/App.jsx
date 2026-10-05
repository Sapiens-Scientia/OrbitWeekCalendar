import { useEffect, useMemo, useRef, useState } from 'react';
import { calendarYear, changeYear, localToday } from './calendar.js';
import { seasonEvents } from './seasons.js';
import OrbitCalendar from './components/OrbitCalendar.jsx';
import { OrbitMark } from './components/Icons.jsx';
import ScheduleViews from './components/ScheduleViews.jsx';
import CalendarSettings from './components/CalendarSettings.jsx';
import EventEditor from './components/EventEditor.jsx';
import RingEventChooser from './components/RingEventChooser.jsx';
import useGoogleCalendar from './useGoogleCalendar.js';

export default function App() {
  const today = localToday();
  const [selected, setSelected] = useState(today);
  const [januaryAtBottom, setJanuaryAtBottom] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ringEditor, setRingEditor] = useState(null);
  const [ringNotice, setRingNotice] = useState('');
  const google = useGoogleCalendar(selected);
  const year = selected.getUTCFullYear();
  const calendar = useMemo(() => calendarYear(year), [year]);
  const seasons = useMemo(() => seasonEvents(year), [year]);
  const timelineRef = useRef(null);
  const nearbyYears = Array.from({ length: 11 }, (_, index) => year + index - 5);
  useEffect(() => { if (!google.connected) { setRingEditor(null); setRingNotice(''); } }, [google.connected]);
  useEffect(() => {
    const timeline = timelineRef.current;
    const centerCurrentYear = () => {
      const current = timeline.querySelector('[aria-current="date"]');
      timeline.scrollLeft = current.offsetLeft - (timeline.clientWidth - current.offsetWidth) / 2;
    };
    centerCurrentYear();
    const observer = new ResizeObserver(centerCurrentYear);
    observer.observe(timeline);
    return () => observer.disconnect();
  }, [year]);
  return <div className="app-shell">
    <header className="app-header">
      <div className="brand"><OrbitMark /><span className="brand-name">Orbit Weeks</span></div>
      <nav className="year-timeline" aria-label="Year timeline" ref={timelineRef}>
        {nearbyYears.map(value => <button key={value} aria-label={`Show ${value}`} aria-current={value === year ? 'date' : undefined}
          disabled={value < 1900 || value > 2200} onClick={() => setSelected(changeYear(selected, value))}>{value}</button>)}
      </nav>
      <nav className="year-controls" aria-label="Calendar controls">
        <button className="today-button" onClick={() => setSelected(localToday())}>Today</button>
        <button className="schedule-button settings-button" aria-label="Settings" aria-haspopup="dialog" onClick={() => setSettingsOpen(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9.3 3-.6 2.4-2.1 1.2-2.4-.6-2.1 3.6 1.8 1.8v2.4l-1.8 1.8 2.1 3.6 2.4-.6 2.1 1.2.6 2.2h4.2l.6-2.2 2.1-1.2 2.4.6 2.1-3.6-1.8-1.8v-2.4l1.8-1.8-2.1-3.6-2.4.6-2.1-1.2-.6-2.4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><circle cx="11.4" cy="12.6" r="3.2" stroke="currentColor" strokeWidth="1.4" /></svg><span>Settings</span>
        </button>
      </nav>
    </header>
    <main className="calendar-workspace">
      <ScheduleViews selected={selected} onSelect={setSelected} google={google} onSettings={() => setSettingsOpen(true)} />
      <OrbitCalendar calendar={calendar} seasons={seasons} selected={selected} today={today} onSelect={setSelected} januaryAtBottom={januaryAtBottom} onToggleJanuaryPosition={() => setJanuaryAtBottom(value => !value)}
        allDayEvents={google.yearEvents} onDayEvents={(day, events) => { setRingNotice(''); setRingEditor({ day, events, event: events.length === 1 ? events[0] : null }); }} />
      {google.loadingYearEvents && <p className="ring-event-status schedule-muted" role="status">Loading all-day events for {year}…</p>}
      {google.yearEventErrors.map(message => <p key={message} className="ring-event-status schedule-error" role="alert">Ring events · {message} <button className="schedule-text-button" onClick={google.refresh}>Retry</button></p>)}
      {ringNotice && <p className="ring-event-status schedule-notice" role="status">{ringNotice}</p>}
    </main>
    {settingsOpen && <CalendarSettings google={google} onClose={() => setSettingsOpen(false)} />}
    {ringEditor && google.connected && (ringEditor.event ? <EventEditor selected={ringEditor.day} calendars={google.calendars} selectedIds={google.selectedIds} event={ringEditor.event}
      onWrite={google.writeEvent} onClose={message => { setRingEditor(null); if (message) setRingNotice(message); }} />
      : <RingEventChooser day={ringEditor.day} events={ringEditor.events} onClose={() => setRingEditor(null)} onChoose={event => setRingEditor(previous => ({ ...previous, event }))} />)}
  </div>;
}
