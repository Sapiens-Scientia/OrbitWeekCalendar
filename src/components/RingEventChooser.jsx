import { useEffect, useRef } from 'react';
import { formatDate } from '../calendar.js';
import { calendarName, canWriteCalendar } from '../googleCalendar.js';
import { eventTitle } from '../schedule.js';

export default function RingEventChooser({ day, events, onChoose, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return <dialog className="event-dialog" ref={ref} aria-labelledby="ring-chooser-title" onCancel={e => { e.preventDefault(); onClose(); }}>
    <div className="schedule-section-heading"><h2 id="ring-chooser-title">{formatDate(day, { month: 'long', day: 'numeric' })}</h2><button className="schedule-text-button" onClick={onClose}>Close</button></div>
    <p className="schedule-muted">All-day events</p>
    <div className="ring-event-choices">{events.map(event => <button key={`${event.calendar.id}:${event.id}`} className="ring-event-choice" onClick={() => onChoose(event)}>
      <span className="calendar-color" style={{ background: event.calendar.backgroundColor || 'var(--accent)' }} />
      <span>{eventTitle(event)}<small>{calendarName(event.calendar)}{!canWriteCalendar(event.calendar) ? ' · Read only' : ''}</small></span>
    </button>)}</div>
  </dialog>;
}
