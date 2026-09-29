# Orbit design

Reference: `orbit-concept.png`, generated with the built-in image generation tool.

## Design system

- Warm paper background `#f6f4ed`, forest ink `#293b36`, rules `#bdc4b8`.
- Display typography: Libre Caslon Display, with Georgia fallback. UI and date numerals: DM Sans, with sans-serif fallback.
- Seven track colors progress from forest/sage on Monday through straw/ochre to clay on Sunday.
- Open calendar canvas and a right detail rail, separated with a fine rule. No cards or ornamental containers.
- Header: Orbit, A different rhythm., previous/next year controls, Today.
- Calendar: month labels, seven tracks, date numerals, small sun, year, One trip around the Sun, selected date's percentage through the year.
- Rail: weekday, month/day, day of year, ISO week number, Your week, Reading the orbit, outer-to-inner legend.
- Footer: annual day/week counts and An earthly perspective on time.
- Controls: thin outlined Today button; unboxed chevrons; soft sage selected week row; dark forest selected date cell.
- Mobile: calendar above the detail rail, with week list and reading guide beside each other.

## Geometry and intentional corrections

The generated reference is a visual design, not a date source. Its repeated numerals and extra ring are corrected in the implementation: all date cells come from civil-date calculations and exactly seven tracks are drawn. Following the revised direction, Monday is the outermost track and Sunday is the innermost. Days move inward within each spoke, and weeks advance clockwise. Partial weeks leave empty cells outside the displayed year. Some years occupy 54 partial/full week spokes. The Sun is a native vector element; every date and control is native interactive UI. This is a calendar metaphor, not an astronomical ephemeris.

Keyboard guidance and month arcs are small usability additions. A month abbreviation in the week list clarifies a change of month. Progress follows the selected date, so it remains meaningful while exploring other years. Mobile adds Enlarge dates / Show full orbit, which gives the SVG a scrollable 900px canvas, and stacks the detail sections below 480px for readable text and 44px date rows.

## Verification and fidelity ledger

Verified in the Codex in-app browser at the concept's native 1536 × 1024 dimensions, the normal 1280 × 720 viewport, and 390 × 844 mobile. The final desktop screenshot is `orbit-desktop.png`. Both the concept and final screenshot were inspected with `view_image` in the same comparison pass.

| Comparison | Reference and implementation evidence | Result |
| --- | --- | --- |
| Layout | Large left orbital calendar, narrow right detail rail, header/footer rules | Preserved; reduced SVG height so the whole circle is visible. Native desktop fits in 1024px; the shorter viewport scrolls for the footer. |
| Typography | Serif brand, year and selected date; clear smaller controls | Preserved hierarchy with Libre Caslon Display and deliberate DM Sans UI typography. |
| Palette | Warm paper, forest ink, sage-to-clay tracks | Preserved, with flat colors instead of generated image texture. |
| Calendar anatomy | Reference has inaccurate numbers and an extra empty inner ring | Corrected to exactly seven tracks and real dates; revised to Monday outside, Sunday inside. |
| Selection | Dark date cell, subtle selected week row | Preserved, with the selection correctly located on its weekday track. |
| Icons/assets | Orbital brand mark, sun, chevrons, direction arrow | Native SVG; no raster interface or external image dependencies. |
| Copy | Orbit, A different rhythm., Today, Your week, Reading the orbit, center/footer copy | Retained. Intentional additions: keyboard hint, month abbreviations, mobile enlargement control. |
| Responsive behavior | Same open layout and visual system | Calendar above detail sections on mobile; enlargement supports date readability. No horizontal page overflow at tested sizes. |

The implementation was visually verified against the concept, preserving its design direction with the explicit functional corrections above. The reference's exact numeral positions and extra ring are deliberately not reproduced. No remaining material layout issues were found at the tested sizes.

Functional browser checks: date selection, week details, one-week keyboard movement, next year, Today, February 29 in 2028, changing to 2027 (February 28), mobile date selection, and mobile enlargement/restore. Production build passes. Four automated tests pass, including every civil date across a 400-year Gregorian cycle.
