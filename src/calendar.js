// UTC civil dates keep calendar arithmetic independent of daylight saving changes.
export const DAY = 86_400_000;
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const COLORS = ['#e5ddca', '#e5ddca', '#e5ddca', '#e5ddca', '#e5ddca', '#dfbf6c', '#dfbf6c'];
export const FILLS = ['#f1ecdf', '#f1ecdf', '#f1ecdf', '#f1ecdf', '#f1ecdf', '#efe4c1', '#efe4c1'];
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

export function arcCell(inner, outer, start, end) {
  const a = point(inner, start), b = point(outer, start);
  const c = point(outer, end), d = point(inner, end);
  return `M ${a} L ${b} A ${outer} ${outer} 0 0 1 ${c} L ${d} A ${inner} ${inner} 0 0 0 ${a} Z`;
}
