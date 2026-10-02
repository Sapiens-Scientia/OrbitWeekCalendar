import { useMemo, useState } from 'react';
import { calendarYear, changeYear, localToday } from './calendar.js';
import { seasonEvents } from './seasons.js';
import OrbitCalendar from './components/OrbitCalendar.jsx';
import { Chevron, OrbitMark } from './components/Icons.jsx';

export default function App() {
  const today = localToday();
  const [selected, setSelected] = useState(today);
  const year = selected.getUTCFullYear();
  const calendar = useMemo(() => calendarYear(year), [year]);
  const seasons = useMemo(() => seasonEvents(year), [year]);
  return <div className="app-shell">
    <header className="app-header">
      <div className="brand"><OrbitMark /><span className="brand-name">Orbit Weeks</span></div>
      <nav className="year-controls" aria-label="Calendar year">
        <button className="icon-button" aria-label="Previous year" disabled={year <= 1900} onClick={() => setSelected(changeYear(selected, year - 1))}><Chevron direction="left" /></button>
        <span className="header-year" aria-live="polite">{year}</span>
        <button className="icon-button" aria-label="Next year" disabled={year >= 2200} onClick={() => setSelected(changeYear(selected, year + 1))}><Chevron /></button>
        <button className="today-button" onClick={() => setSelected(localToday())}>Today</button>
      </nav>
    </header>
    <main><OrbitCalendar calendar={calendar} seasons={seasons} selected={selected} today={today} onSelect={setSelected} /></main>
  </div>;
}
