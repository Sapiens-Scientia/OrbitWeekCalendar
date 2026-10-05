import { useEffect, useRef } from 'react';
import { calendarName, canWriteCalendar } from '../googleCalendar.js';

export default function CalendarSettings({ google, onClose }) {
  const dialogRef = useRef(null);
  const primary = google.calendars.find(calendar => calendar.primary);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return <dialog className="event-dialog settings-dialog" ref={dialogRef} aria-labelledby="settings-title" onCancel={e => { e.preventDefault(); onClose(); }}>
    <div className="schedule-section-heading"><h2 id="settings-title">Settings</h2><button className="schedule-text-button" onClick={onClose}>Done</button></div>
    <section className="settings-connection" aria-label="Google Calendar connection">
      <div className="schedule-section-heading"><h3>Google Calendar</h3>{google.connected && <button className="schedule-text-button" onClick={google.disconnect}>Disconnect</button>}</div>
      {google.connected ? <>
        {primary && <p className="schedule-account">{primary.id}</p>}
        <fieldset className="settings-calendars"><legend>Calendars <span>{google.selectedIds.length} selected</span></legend>
          <p className="schedule-muted">Choose the calendars shown in your day and week views.</p>
          {google.loadingCalendars && <p className="schedule-muted" role="status">Loading calendars…</p>}
          {google.calendars.map(calendar => <label key={calendar.id} className="calendar-choice">
            <input type="checkbox" checked={google.selectedIds.includes(calendar.id)} onChange={() => google.toggleCalendar(calendar.id)} />
            <span className="calendar-color" style={{ backgroundColor: calendar.backgroundColor || 'var(--accent)' }} />
            <span>{calendarName(calendar)}{!canWriteCalendar(calendar) && <small>Read only</small>}</span>
          </label>)}
          {!google.loadingCalendars && !google.calendars.length && !google.calendarError && <p className="schedule-muted">No calendars are available for this account.</p>}
        </fieldset>
      </> : <>
        <p className="schedule-muted">Connect Google Calendar to see and edit events in your day and week views.</p>
        {google.configured ? <button className="schedule-button connect-button" disabled={!google.ready || google.connecting} onClick={google.connect}>{google.connecting ? 'Connecting…' : google.ready ? 'Connect Google Calendar' : 'Loading Google sign-in…'}</button>
          : <p className="schedule-muted">Google Calendar connection is awaiting configuration.</p>}
      </>}
      {google.authError && <><p className="schedule-error" role="alert">{google.authError}</p>{!google.ready && <button className="schedule-text-button" onClick={google.retrySignIn}>Retry sign-in loading</button>}</>}
      {google.calendarError && <p className="schedule-error" role="alert">{google.calendarError} <button className="schedule-text-button" onClick={google.refresh}>Retry</button></p>}
    </section>
  </dialog>;
}
