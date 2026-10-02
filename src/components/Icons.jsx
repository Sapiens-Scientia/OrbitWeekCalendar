export function Chevron({ direction = 'right' }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={direction === 'left' ? 'm14 6-6 6 6 6' : 'm10 6 6 6-6 6'} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function OrbitMark() {
  return <img className="orbit-mark" width="42" height="42" src="/icon.svg" alt="" aria-hidden="true" />;
}

export function Sun() {
  return <g className="sun" aria-hidden="true"><circle cx="450" cy="450" r="17" fill="#cfa45e" />{Array.from({ length: 12 }, (_, i) => <line key={i} x1="450" y1="419" x2="450" y2="426" transform={`rotate(${i * 30} 450 450)`} stroke="#cfa45e" strokeWidth="1.7" />)}</g>;
}
