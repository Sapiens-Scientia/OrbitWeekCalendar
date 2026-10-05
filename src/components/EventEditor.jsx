import { useEffect, useRef, useState } from 'react';
import { canWriteCalendar, calendarName, draftBody, eventDraft } from '../googleCalendar.js';

const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
function safeEventLink(link) {
  try {
    const url = new URL(link);
    return url.protocol === 'https:' ? url.href : undefined;
  } catch { return undefined; }
}

export default function EventEditor({ selected, calendars, selectedIds, event, onClose, onWrite }) {
  const dialogRef = useRef(null);
  const writable = calendars.filter(canWriteCalendar);
  const defaultCalendar = writable.find(calendar => selectedIds.includes(calendar.id)) || writable[0];
  const readOnly = Boolean(event && (!canWriteCalendar(event.calendar) || (event.eventType && event.eventType !== 'default') || event.locked));
  const [draft, setDraft] = useState(() => eventDraft(selected, defaultCalendar?.id, event));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  function update(name, value) { setDraft(previous => ({ ...previous, [name]: value })); setError(''); }
  function toggleAllDay(checked) {
    setDraft(previous => ({ ...previous, allDay: checked,
      start: checked ? previous.start.slice(0, 10) : `${previous.start}T09:00`,
      end: checked ? previous.end.slice(0, 10) : `${previous.end}T10:00`,
    }));
  }
  async function save(submitEvent) {
    submitEvent.preventDefault();
    if (saving || readOnly) return;
    setError('');
    try {
      const body = draftBody(draft);
      setSaving(true);
      await onWrite(draft.calendarId, event, body);
      onClose('Event saved to Google Calendar.');
    } catch (failure) { setError(failure.message); }
    finally { setSaving(false); }
  }
  async function remove() {
    setSaving(true);
    setError('');
    try { await onWrite(event.calendar.id, event, undefined, true); onClose('Event deleted from Google Calendar.'); }
    catch (failure) { setError(failure.message); }
    finally { setSaving(false); }
  }
  return <dialog className="event-dialog" ref={dialogRef} aria-labelledby="event-editor-title" onCancel={e => { e.preventDefault(); if (!saving) onClose(); }}>
    <form onSubmit={save}>
      <div className="schedule-section-heading"><h2 id="event-editor-title">{readOnly ? 'Event details' : event ? 'Edit event' : 'New event'}</h2><button type="button" className="schedule-text-button" disabled={saving} onClick={() => onClose()}>Close</button></div>
      {event?.recurringEventId && <p className="schedule-muted">Changes apply to this occurrence only.</p>}
      {readOnly && <p className="schedule-muted">This event can be viewed here. Open Google Calendar to make any available changes.</p>}
      <fieldset disabled={saving || readOnly} className="event-fields">
        <label>Title<input autoFocus name="summary" required maxLength={1000} value={draft.summary} onChange={e => update('summary', e.target.value)} /></label>
        <label>Calendar<select value={draft.calendarId} disabled={Boolean(event)} onChange={e => update('calendarId', e.target.value)}>
          {(event ? [event.calendar] : writable).map(calendar => <option key={calendar.id} value={calendar.id}>{calendarName(calendar)}</option>)}
        </select></label>
        <label className="schedule-check"><input type="checkbox" checked={draft.allDay} onChange={e => toggleAllDay(e.target.checked)} />All day</label>
        <label>{draft.allDay ? 'Start date' : 'Starts'}<input required type={draft.allDay ? 'date' : 'datetime-local'} value={draft.start} onChange={e => update('start', e.target.value)} /></label>
        <label>{draft.allDay ? 'Last day (inclusive)' : 'Ends'}<input required type={draft.allDay ? 'date' : 'datetime-local'} value={draft.end} onChange={e => update('end', e.target.value)} /></label>
        <p className="schedule-muted">Times in {TIME_ZONE.replaceAll('_', ' ')}</p>
        <label>Location<input value={draft.location} onChange={e => update('location', e.target.value)} /></label>
        <label>Notes<textarea rows={3} value={draft.description} onChange={e => update('description', e.target.value)} /></label>
      </fieldset>
      {error && <p className="schedule-error" role="alert">{error}</p>}
      {confirmDelete ? <div key="delete-confirmation" className="delete-confirmation"><p>Delete “{event.summary || 'Untitled event'}”{event.recurringEventId ? ' for this occurrence' : ''}?</p>
        <button type="button" className="schedule-button danger-button" disabled={saving} onClick={remove}>{saving ? 'Deleting…' : 'Delete event'}</button>
        <button type="button" className="schedule-text-button" disabled={saving} onClick={e => { e.preventDefault(); setConfirmDelete(false); }}>Keep event</button>
      </div> : <div key="event-form-actions" className="event-form-actions">
        {event && !readOnly && <button type="button" className="schedule-text-button danger-text" disabled={saving} onClick={() => setConfirmDelete(true)}>Delete</button>}
        {safeEventLink(event?.htmlLink) && <a href={safeEventLink(event.htmlLink)} target="_blank" rel="noreferrer">Open in Google</a>}
        {!readOnly && <button type="submit" className="schedule-button primary-button" disabled={saving}>{saving ? 'Saving…' : 'Save event'}</button>}
      </div>}
    </form>
  </dialog>;
}
