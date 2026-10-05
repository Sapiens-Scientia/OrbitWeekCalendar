# Orbit · Week Ring Calendar

An interactive annual calendar inspired by Earth's orbit around the Sun.

[Open Orbit](https://orbit-week-calendar.vercel.app)

- Each angular spoke is a Monday–Sunday week.
- ISO week numbers sit just inside the innermost ring, aligned with their spokes; the selected week is emphasized.
- Exactly seven tracks show Monday–Sunday from left to right on both halves: Monday is outermost on the left and innermost on the right. Weekday order reverses halfway around the orbit and follows the direction toggle.
- Each quarter has a seasonal palette: winter blues (January–March), spring greens (April–June), summer golds (July–September), and autumn clay (October–December). Weekends use a deeper shade within each palette.
- The year moves counterclockwise by default from January at the top, with month labels around the rim.
- Use the direction button below the orbit to switch between clockwise and counterclockwise.
- Use **Jan 1 at bottom** to turn the ring by half a revolution. Month names, date numbers, and season labels stay upright, and each spoke still reads Monday to Sunday from left to right. Toggle it off to restore January to the top.
- Select a date to see its week. Use the year arrows or Today to navigate.
- Above the centered orbit, the selected day's schedule runs left to right across a 24-hour strip. A Monday–Sunday week view below it shows seven vertical 24-hour columns. Select a day heading, use the day/week arrows, or select a date on the orbit to navigate. On narrow screens the timelines scroll horizontally while the page stays within the viewport.
- Every day timeline shades midnight–6am in nighttime blue. Monday–Friday timelines also shade 9am–5pm in workday grey. Overlapping events occupy separate lanes, overnight events continue into the next day, and all-day events sit above the time axis. The axes follow the local 24-hour wall clock on daylight-saving days as well.
- Open **Settings** in the top-right corner to connect Google Calendar and choose which calendars to show. The modal opens only when requested; moving between days keeps calendar selections intact. Combine multiple calendars and create, edit, or delete events on calendars where you have write access. Event times use your device's time zone. All-day and multi-day events and recurring occurrences are supported; edits to recurring events affect that occurrence only. Use Refresh to retrieve changes made elsewhere.
- Jump to any of the five years before or after the displayed year using the header timeline, or choose a year from the dropdown (1900–2200). On narrow screens, swipe the timeline to see more years.
- Focus the selected date and use left/right arrows to move by a week; up/down arrows move by a day. Home/End move to Monday/Sunday within the displayed year.
- On small screens, use Enlarge dates to explore a larger, scrollable orbit, or select dates from the week list below.
- Equinoxes and solstices are marked with ochre circles around their date numbers and labeled inside the orbit. Select a marker to see its approximate local time. Dates are recalculated for each year using [Astronomy Engine](https://github.com/cosinekitty/astronomy), in your browser's time zone; month-based names apply in either hemisphere.
- Leap years and partial weeks are supported. Adjacent-year dates are blank on the wheel and selectable from the week list.

## Deployment

Vercel project `orbit-week-calendar` is connected to `Sapiens-Scientia/OrbitWeekCalendar`. Pushes to `main` automatically build and deploy to production at https://orbit-week-calendar.vercel.app. Other branches receive preview deployments through Vercel's GitHub integration.

Build settings: Vite, repository root, `npm run build`, output directory `dist`.

For this private repository on Vercel's Hobby plan, commits must be authored by the GitHub account connected to the Vercel owner (`Sapiens-Scientia`). Commits attributed to another account can trigger a deployment but will be blocked by Vercel's contributor check.

## Run

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. `npm run build` produces `dist/`; `npm run preview` serves that build. `npm test` verifies date geometry over a full 400-year Gregorian cycle, leap days, and ISO week boundaries.

Built with React, Vite, CSS, and SVG. The orbit requires no account; Google Calendar integration is optional and uses browser-based authorization without a backend. Google Fonts is optional; local serif/sans-serif fallbacks work offline. The calendar uses equal angular spacing for weeks, rather than simulating astronomical orbital speed. The center progress bar describes the selected date's position in the year. Week counts count visible spokes, including partial weeks; the detail rail uses ISO week numbers.

## Google Calendar setup

1. In [Google Cloud Console](https://console.cloud.google.com/), create or select a project and enable **Google Calendar API**.
2. Configure the Google Auth Platform consent screen. For an external app in Testing, add the Google accounts that will use the app as test users. Request `https://www.googleapis.com/auth/calendar.calendarlist.readonly` and `https://www.googleapis.com/auth/calendar.events`. Public use may require Google's verification process.
3. Create an OAuth client of type **Web application**. Add `http://localhost:5173` and `http://127.0.0.1:5173` as authorized JavaScript origins for development, and `https://orbit-week-calendar.vercel.app` for production. Any other development port, preview domain, or custom domain needs its exact origin added. No redirect URI is required for this popup token flow.
4. Copy `.env.example` to `.env.local` and set `VITE_GOOGLE_CLIENT_ID` to the client ID. Restart Vite after changing it. In Vercel, set the same environment variable for the desired deployment environments and rebuild. The client ID is public configuration; **never include a client secret** in the frontend.
5. Open **Settings**, click **Connect Google Calendar**, choose an account, and grant both permissions. Check the calendars you want in the settings modal. Calendar choices are remembered per primary calendar in local storage; tokens and event data are kept only in memory.

Google issues short-lived tokens. Reconnect after an expired session or page reload; there is no background access or refresh-token storage. **Disconnect** clears the local session immediately. It does not revoke existing Google consent; access can also be removed in your [Google Account connections](https://myaccount.google.com/connections).

Writes use the Google Calendar API directly and become visible to other users of shared calendars. Existing events retain fields outside the editor (such as attendees and reminders); events that changed elsewhere are protected with an ETag check. Read-only calendars and special event types can be viewed, with a link to Google Calendar for further actions. The editor supports ordinary events and individual recurring occurrences, rather than recurrence-rule or attendee management.

See Google's [browser token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model) and [OAuth client setup](https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid).

The visual reference and implementation notes are in `docs/`.
