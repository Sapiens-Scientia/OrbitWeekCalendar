import { useId, useState } from 'react';
import { Chevron } from './Icons.jsx';

export default function CalendarSection({ title, className = '', headerContent, headerActions, children }) {
  const id = useId();
  const [expanded, setExpanded] = useState(true);
  return <section className={`calendar-section ${className}`} aria-labelledby={`${id}-heading`}>
    <header className={`calendar-section-header${headerContent ? ' with-navigation' : ''}`}>
      <h2 className="calendar-section-heading" id={`${id}-heading`}>
        <button className="calendar-section-toggle" aria-expanded={expanded} aria-controls={`${id}-content`} onClick={() => setExpanded(value => !value)}>
          <Chevron /><span>{title}</span>
        </button>
      </h2>
      {headerContent}
      {headerActions && <div className="calendar-section-actions">{headerActions}</div>}
    </header>
    <div id={`${id}-content`} className="calendar-section-content" hidden={!expanded}>{children}</div>
  </section>;
}
