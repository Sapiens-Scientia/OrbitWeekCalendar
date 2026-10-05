import { changeYear } from '../calendar.js';
import { Chevron } from './Icons.jsx';

const YEARS = Array.from({ length: 301 }, (_, index) => 1900 + index);

export default function YearNavigation({ selected, onSelect, inRing = false }) {
  const year = selected.getUTCFullYear();
  return <nav className={inRing ? 'center-year-controls' : 'timeline-title-navigation year-header-navigation'} aria-label={inRing ? 'Calendar ring year navigation' : 'Schedule year'}>
    <button className="icon-button" aria-label={inRing ? 'Previous year on ring' : 'Previous year'} disabled={year <= 1900} onClick={() => onSelect(changeYear(selected, year - 1))}><Chevron direction="left" /></button>
    <div className={inRing ? 'center-year-picker' : 'header-year-picker'}>
      <span className={inRing ? 'center-year' : 'header-year-value'} aria-hidden="true">{year}</span>
      <select className="year-picker-select" aria-label={inRing ? 'Calendar ring year' : 'Displayed year'} value={year} onChange={event => onSelect(changeYear(selected, Number(event.target.value)))}>
        {YEARS.map(value => <option key={value} value={value}>{value}</option>)}
      </select>
      <span className="year-picker-chevron" aria-hidden="true">⌄</span>
    </div>
    <button className="icon-button" aria-label={inRing ? 'Next year on ring' : 'Next year'} disabled={year >= 2200} onClick={() => onSelect(changeYear(selected, year + 1))}><Chevron /></button>
  </nav>;
}
