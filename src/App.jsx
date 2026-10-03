import { useEffect, useMemo, useRef, useState } from 'react';
import { calendarYear, changeYear, localToday } from './calendar.js';
import { seasonEvents } from './seasons.js';
import OrbitCalendar from './components/OrbitCalendar.jsx';
import { OrbitMark } from './components/Icons.jsx';

export default function App() {
  const today = localToday();
  const [selected, setSelected] = useState(today);
  const [januaryAtBottom, setJanuaryAtBottom] = useState(false);
  const year = selected.getUTCFullYear();
  const calendar = useMemo(() => calendarYear(year), [year]);
  const seasons = useMemo(() => seasonEvents(year), [year]);
  const timelineRef = useRef(null);
  const nearbyYears = Array.from({ length: 11 }, (_, index) => year + index - 5);
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
      <nav className="year-controls" aria-label="Calendar year">
        <button className="today-button" onClick={() => setSelected(localToday())}>Today</button>
      </nav>
    </header>
    <main><OrbitCalendar calendar={calendar} seasons={seasons} selected={selected} today={today} onSelect={setSelected} januaryAtBottom={januaryAtBottom} onToggleJanuaryPosition={() => setJanuaryAtBottom(value => !value)} /></main>
  </div>;
}
