# Orbit · Week Ring Calendar

An interactive annual calendar inspired by Earth's orbit around the Sun.

[Open Orbit](https://orbit-week-calendar.vercel.app)

- Each angular spoke is a Monday–Sunday week.
- Exactly seven tracks run from **Monday on the outside** to **Sunday on the inside**.
- The year moves clockwise from January at the top, with month labels around the rim.
- Select a date to see its week. Use the year arrows or Today to navigate.
- Focus the selected date and use left/right arrows to move by a week; up/down arrows move by a day. Home/End move to Monday/Sunday within the displayed year.
- On small screens, use Enlarge dates to explore a larger, scrollable orbit, or select dates from the week list below.
- Equinoxes and solstices are marked with ochre circles around their date numbers and labeled inside the orbit. Select a marker to see its approximate local time. Dates are recalculated for each year using [Astronomy Engine](https://github.com/cosinekitty/astronomy), in your browser's time zone; month-based names apply in either hemisphere.
- Leap years and partial weeks are supported. Adjacent-year dates are blank on the wheel and selectable from the week list.

## Deployment

Vercel project `orbit-week-calendar` is connected to `Sapiens-Scientia/OrbitWeekCalendar`. Pushes to `main` automatically build and deploy to production at https://orbit-week-calendar.vercel.app. Other branches receive preview deployments through Vercel's GitHub integration.

Build settings: Vite, repository root, `npm run build`, output directory `dist`.

## Run

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. `npm run build` produces `dist/`; `npm run preview` serves that build. `npm test` verifies date geometry over a full 400-year Gregorian cycle, leap days, and ISO week boundaries.

Built with React, Vite, CSS, and SVG. No backend or account required. Google Fonts is optional; local serif/sans-serif fallbacks work offline. The calendar uses equal angular spacing for weeks, rather than simulating astronomical orbital speed. The center progress bar describes the selected date's position in the year. Week counts in the footer count visible spokes, including partial weeks; the detail rail uses ISO week numbers.

The visual reference and implementation notes are in `docs/`.
