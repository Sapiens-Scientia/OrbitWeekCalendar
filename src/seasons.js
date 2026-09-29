import { Seasons } from 'astronomy-engine';
import { civilDate, dateKey } from './calendar.js';

const EVENTS = [
  ['mar_equinox', 'March equinox', 'Equinox'],
  ['jun_solstice', 'June solstice', 'Solstice'],
  ['sep_equinox', 'September equinox', 'Equinox'],
  ['dec_solstice', 'December solstice', 'Solstice'],
];

// Astronomy Engine calculates the instants; civil dates follow the viewer's time zone.
export function seasonEvents(year, timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const seasons = Seasons(year);
  const dateFormatter = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric' });
  const timeFormatter = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  return EVENTS.map(([id, name, kind]) => {
    const instant = seasons[id].date;
    const parts = Object.fromEntries(dateFormatter.formatToParts(instant).map(part => [part.type, part.value]));
    const date = civilDate(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
    return { id, name, kind, instant, date, key: dateKey(date), timeLabel: `≈ ${timeFormatter.format(instant)}`, timeZone };
  });
}
