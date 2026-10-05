import { useEffect, useRef, useState } from 'react';
import { addDays, dateKey, startOfWeek } from './calendar.js';
import { GOOGLE_SCOPES, calendarName, calendarRequest, eventPath, listCalendars, listRangeEvents, loadGoogleIdentity, sortEvents } from './googleCalendar.js';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
const SELECTION_KEY = 'orbit.calendar-selection.v1';
function savedSelection(account) {
  try {
    const value = JSON.parse(localStorage.getItem(SELECTION_KEY) || '{}')[account];
    return Array.isArray(value) && value.every(id => typeof id === 'string') ? value : null;
  } catch { return null; }
}

export default function useGoogleCalendar(selected) {
  const [oauth, setOauth] = useState(null);
  const [token, setToken] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [calendars, setCalendars] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [events, setEvents] = useState([]);
  const [loadedWeek, setLoadedWeek] = useState(null);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [authError, setAuthError] = useState('');
  const [calendarError, setCalendarError] = useState('');
  const [eventErrors, setEventErrors] = useState([]);
  const [revision, setRevision] = useState(0);
  const [scriptRevision, setScriptRevision] = useState(0);
  const expiryRef = useRef(null);
  const sessionRef = useRef(0);
  const key = dateKey(startOfWeek(selected));

  function clearSession(message = '') {
    sessionRef.current += 1;
    clearTimeout(expiryRef.current);
    setToken(null);
    setCalendars([]);
    setSelectedIds([]);
    setEvents([]);
    setLoadedWeek(null);
    setLoadingCalendars(false);
    setLoadingEvents(false);
    setCalendarError('');
    setEventErrors([]);
    setAuthError(message);
    setConnecting(false);
  }

  useEffect(() => {
    if (!CLIENT_ID) return;
    let active = true;
    loadGoogleIdentity().then(value => { if (active) { setOauth(value); setAuthError(''); } })
      .catch(error => { if (active) setAuthError(error.message); });
    return () => { active = false; };
  }, [scriptRevision]);

  useEffect(() => () => {
    sessionRef.current += 1;
    clearTimeout(expiryRef.current);
  }, []);

  function connect() {
    if (!oauth || connecting) return;
    setAuthError('');
    setConnecting(true);
    const session = ++sessionRef.current;
    const client = oauth.initTokenClient({
      client_id: CLIENT_ID,
      scope: GOOGLE_SCOPES.join(' '),
      callback: response => {
        if (session !== sessionRef.current) return;
        setConnecting(false);
        if (response.error || !response.access_token) {
          setAuthError(response.error_description || 'Google access was not granted. Try connecting again.');
          return;
        }
        if (!oauth.hasGrantedAllScopes(response, ...GOOGLE_SCOPES)) {
          setAuthError('Allow both calendar list and event access to connect your calendars.');
          return;
        }
        clearTimeout(expiryRef.current);
        setToken(response.access_token);
        expiryRef.current = setTimeout(() => clearSession('Your Google session expired. Connect again to continue.'), Math.max(0, Number(response.expires_in) * 1000 - 30000));
      },
      error_callback: error => {
        if (session !== sessionRef.current) return;
        setConnecting(false);
        setAuthError(error.type === 'popup_closed' ? 'Sign-in was closed. Connect again when you’re ready.' : 'Google could not open sign-in. Allow popups for this site and try again.');
      },
    });
    try { client.requestAccessToken({ prompt: 'select_account' }); }
    catch { setConnecting(false); setAuthError('Google could not open sign-in. Try again.'); }
  }

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setLoadingCalendars(true);
    setCalendarError('');
    listCalendars(token, controller.signal).then(items => {
      if (controller.signal.aborted) return;
      setCalendars(items);
      const account = items.find(calendar => calendar.primary)?.id;
      const saved = account ? savedSelection(account) : null;
      setSelectedIds(saved ? saved.filter(id => items.some(calendar => calendar.id === id))
        : items.filter(calendar => calendar.primary || calendar.selected).map(calendar => calendar.id));
    }).catch(error => {
      if (controller.signal.aborted) return;
      if (error.status === 401) clearSession(error.message);
      else setCalendarError(error.message);
    }).finally(() => { if (!controller.signal.aborted) setLoadingCalendars(false); });
    return () => controller.abort();
  }, [token, revision]);

  useEffect(() => {
    const controller = new AbortController();
    setEvents([]);
    setLoadedWeek(null);
    setEventErrors([]);
    const chosen = calendars.filter(calendar => selectedIds.includes(calendar.id));
    if (!token || !chosen.length) { setLoadingEvents(false); return; }
    setLoadingEvents(true);
    // Fetch calendars concurrently and retain successful calendars on partial failure.
    const weekStart = new Date(`${key}T00:00:00Z`);
    Promise.allSettled(chosen.map(calendar => listRangeEvents(token, calendar, weekStart, addDays(weekStart, 7), controller.signal)))
      .then(results => {
        if (controller.signal.aborted) return;
        const expired = results.find(result => result.status === 'rejected' && result.reason.status === 401);
        if (expired) { clearSession(expired.reason.message); return; }
        setEvents(sortEvents(results.flatMap(result => result.status === 'fulfilled' ? result.value : [])));
        setLoadedWeek(key);
        setEventErrors(results.flatMap((result, index) => result.status === 'rejected' ? [`${calendarName(chosen[index])}: ${result.reason.message}`] : []));
        setLoadingEvents(false);
      });
    return () => controller.abort();
  }, [token, calendars, selectedIds, key, revision]);

  function toggleCalendar(id) {
    const next = selectedIds.includes(id) ? selectedIds.filter(value => value !== id) : [...selectedIds, id];
    setSelectedIds(next);
    const account = calendars.find(calendar => calendar.primary)?.id;
    if (account) {
      try {
        const saved = JSON.parse(localStorage.getItem(SELECTION_KEY) || '{}');
        localStorage.setItem(SELECTION_KEY, JSON.stringify({ ...saved, [account]: next }));
      } catch { /* Calendar selection still works when storage is unavailable. */ }
    }
  }

  async function writeEvent(calendarId, event, body, deleting = false) {
    if (!token) throw new Error('Connect Google Calendar before saving.');
    const session = sessionRef.current;
    try {
      await calendarRequest(token, eventPath(calendarId, event?.id), {
        method: deleting ? 'DELETE' : event ? 'PATCH' : 'POST', body: deleting ? undefined : body, etag: event?.etag,
      });
      if (session === sessionRef.current) setRevision(value => value + 1);
    } catch (error) {
      if (session === sessionRef.current && error.status === 401) clearSession(error.message);
      throw error;
    }
  }

  return {
    configured: Boolean(CLIENT_ID), ready: Boolean(oauth), connected: Boolean(token), connecting,
    calendars, selectedIds, events: loadedWeek === key ? events : [], loadingCalendars,
    loadingEvents: loadingEvents || Boolean(token && selectedIds.length && loadedWeek !== key),
    authError, calendarError, eventErrors, connect,
    disconnect: () => clearSession(), toggleCalendar, writeEvent,
    refresh: () => setRevision(value => value + 1),
    retrySignIn: () => { setAuthError(''); setScriptRevision(value => value + 1); },
  };
}
