import { useEffect, useState } from 'react';
import { formatDate, weekday } from '../calendar.js';
import { calendarName } from '../googleCalendar.js';
import { currentTimePosition, eventTimeLabel, eventTitle, HOURS, hourLabel } from '../schedule.js';

const currentClock = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

export function useCurrentTime() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer;
    const tick = () => {
      setNow(new Date());
      timer = setTimeout(tick, 60000 - Date.now() % 60000);
    };
    const resume = () => { clearTimeout(timer); tick(); };
    const onVisibility = () => { if (!document.hidden) resume(); };
    timer = setTimeout(tick, 60000 - Date.now() % 60000);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', resume);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('focus', resume); };
  }, []);
  return now;
}

export function CurrentTimeMarker({ day, now, vertical = false }) {
  const position = currentTimePosition(now, day);
  if (position === null) return null;
  const time = currentClock.format(now);
  return <div className={`current-time-marker${vertical ? ' in-week-view' : ''}${position > 90 ? ' label-before' : ''}`}
    style={{ [vertical ? 'top' : 'left']: `${position}%` }} role="img" aria-label={`Current time, ${time}`}>
    <span className="current-time-dot" /><span className="current-time-label">Now {time}</span>
  </div>;
}

export function EventButton({ event, className = '', style, onClick, children }) {
  const label = `${eventTitle(event)}, ${eventTimeLabel(event)}, ${calendarName(event.calendar)}`;
  return <button className={`timeline-event ${className}`} style={{ '--event-color': event.calendar.backgroundColor || 'var(--accent)', ...style }}
    aria-label={label} title={label} onClick={onClick}>{children || eventTitle(event)}</button>;
}

export function HourGrid({ vertical = false }) {
  return <div className={`hour-grid${vertical ? ' vertical' : ''}`} aria-hidden="true">{HOURS.slice(0, 24).map(hour => <span key={hour} />)}</div>;
}

export function TimeAxis({ vertical = false }) {
  const visible = vertical ? HOURS : HOURS.filter(hour => hour % 3 === 0);
  return <div className={`time-axis${vertical ? ' vertical' : ''}`} aria-hidden="true">{visible.map(hour => <span key={hour} style={{ [vertical ? 'top' : 'left']: `${hour / 24 * 100}%` }}>{hourLabel(hour)}</span>)}</div>;
}

export function TimeShading({ day }) {
  return <><div className="nighttime-shading" aria-hidden="true" />{weekday(day) < 5 && <div className="worktime-shading" aria-hidden="true" />}</>;
}

export function VerticalDayTrack({ day, layout, onEvent, now, className = '' }) {
  return <div className={`vertical-time-track ${className}`} role="group" aria-label={`${formatDate(day, { weekday: 'long', month: 'long', day: 'numeric' })} schedule`}>
    <TimeShading day={day} /><HourGrid vertical />
    {layout.timed.map(segment => <EventButton key={`${segment.event.calendar.id}:${segment.event.id}`} event={segment.event} className="vertical-event"
      style={{ top: `${segment.from / 1440 * 100}%`, height: `${(segment.to - segment.from) / 1440 * 100}%`, left: `calc(${segment.lane / segment.columns * 100}% + 2px)`, width: `calc(${100 / segment.columns}% - 4px)` }}
      onClick={() => onEvent(segment.event)}><span>{eventTitle(segment.event)}</span></EventButton>)}
    <CurrentTimeMarker day={day} now={now} vertical />
  </div>;
}
