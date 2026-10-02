// UTC civil dates keep calendar arithmetic independent of daylight saving changes.
export const DAY = 86_400_000;
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const COLORS = ['#e5ddca', '#e5ddca', '#e5ddca', '#e5ddca', '#e5ddca', '#dfbf6c', '#dfbf6c'];
export const FILLS = ['#f1ecdf', '#f1ecdf', '#f1ecdf', '#f1ecdf', '#f1ecdf', '#efe4c1', '#efe4c1'];
export const QUARTER_PALETTES = [
  { weekday: '#e0e9ed', weekend: '#afc8d5' }, // Winter: frost and blue slate.
  { weekday: '#e3ead8', weekend: '#bdd09f' }, // Spring: young leaves and sage.
  { weekday: '#f2e4bc', weekend: '#dfc579' }, // Summer: sunlight and golden fields.
  { weekday: '#efdbcb', weekend: '#d5a980' }, // Autumn: warm clay and fallen leaves.
];
export const quarterFill = date => {
  const palette = QUARTER_PALETTES[Math.floor(date.getUTCMonth() / 3)];
  return weekday(date) < 5 ? palette.weekday : palette.weekend;
};
export const civilDate = (year, month, day) => new Date(Date.UTC(year, month, day));
export const dateKey = (date) => date.toISOString().slice(0, 10);
export const weekday = (date) => (date.getUTCDay() + 6) % 7;
export const addDays = (date, days) => new Date(date.getTime() + days * DAY);
export const startOfWeek = (date) => addDays(date, -weekday(date));
export const formatDate = (date, options) => new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(date);
export const dayOfYear = (date) => Math.round((date - civilDate(date.getUTCFullYear(), 0, 1)) / DAY) + 1;
export const daysInYear = (year) => Math.round((civilDate(year + 1, 0, 1) - civilDate(year, 0, 1)) / DAY);
export const localToday = () => {
  const date = new Date();
  return civilDate(date.getFullYear(), date.getMonth(), date.getDate());
};

export function isoWeek(date) {
  const thursday = addDays(date, 3 - weekday(date));
  return Math.floor((thursday - startOfWeek(civilDate(thursday.getUTCFullYear(), 0, 4))) / (7 * DAY)) + 1;
}

export function calendarYear(year) {
  const start = startOfWeek(civilDate(year, 0, 1));
  const end = civilDate(year, 11, 31);
  const weekCount = Math.floor((end - start) / (7 * DAY)) + 1;
  const weeks = Array.from({ length: weekCount }, (_, week) =>
    Array.from({ length: 7 }, (_, track) => {
      const date = addDays(start, week * 7 + track);
      return { date, key: dateKey(date), week, track, inYear: date.getUTCFullYear() === year };
    }),
  );
  return { year, start, weeks, weekCount, dayCount: daysInYear(year) };
}

export function changeYear(date, year) {
  const lastDay = civilDate(year, date.getUTCMonth() + 1, 0).getUTCDate();
  return civilDate(year, date.getUTCMonth(), Math.min(date.getUTCDate(), lastDay));
}

export function point(radius, angle) {
  return [450 + radius * Math.sin(angle), 450 - radius * Math.cos(angle)];
}

// Reading each spoke from left to right gives Monday through Sunday on both halves.
// This reversal is its own inverse, so it also maps a radial ring back to a weekday.
export function weekdayTrack(track, week, weekCount, counterclockwise = false) {
  const secondHalf = week >= Math.floor(weekCount / 2);
  return secondHalf !== counterclockwise ? 6 - track : track;
}

export function arcCell(inner, outer, start, end) {
  const a = point(inner, start), b = point(outer, start);
  const c = point(outer, end), d = point(inner, end);
  const sweep = end > start ? 1 : 0;
  return `M ${a} L ${b} A ${outer} ${outer} 0 0 ${sweep} ${c} L ${d} A ${inner} ${inner} 0 0 ${1 - sweep} ${a} Z`;
}
