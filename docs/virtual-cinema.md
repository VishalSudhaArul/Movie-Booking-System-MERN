# Virtual Cinema 2.0

What the immersive booking features do, where they live, and what they are
built from. Everything here works against the real API and database; nothing
uses mock data.

## Phases

| Phase | Scope | Where |
| --- | --- | --- |
| 0–1 | Inspection, security hardening, seat holds | earlier commits (`2014ee1`, `608d712`) |
| 2 | Design tokens, five themes, UI components, accessibility | `docs/design-system.md` |
| 3 | 300–500-seat stadium halls, doors, cup holders, wheelchair markings | `server/utils/auditoriumLayouts.js`, `components/cinema3d/` |
| 4 | Five camera views, first-person seat view, **walk-through mode** | `Auditorium3D.jsx`, `WalkMode.jsx`, `lib/walkway.js` |
| 5 | **Recommendations, heatmaps, seat comparison** | `lib/seatInsights.js`, `components/SeatAdvisor.jsx` |
| 6 | Trailer on the screen, **speaker layout** (silent) | `ScreenTrailer.jsx`, `SoundLayout.jsx`, `lib/speakers.js` |
| 7 | **Accessible seating, nearest exits, ticket wayfinding** | layouts' `accessibility`/`doors`, `Venue` model, `VenueGuide.jsx` |
| 8 | Food search, combos, pickup instructions from venue data, price snapshots | `SnacksHub.jsx`, `bookingController.js` |
| 9 | **Layout editor, venues, promotions, review moderation, reconciled analytics** | `pages/admin/*`, `utils/revenue.js` |
| 10 | **High / Balanced / Lite quality**, device-based default, resource cleanup | `Auditorium3D.jsx`, `lib/webgl.js` |
| 11 | Regression, security and production-readiness audit | test suites, this document |

## Seat geometry and recommendations (deterministic, not AI)

`lib/seatInsights.js` computes, for every seat, from the hall's real geometry:

- **distance** from the eye to the screen centre,
- **off-centre angle** and **vertical angle** to the screen centre,
- **screen width angle** (how much of your view the screen fills; ideal ≈ 38°,
  between SMPTE's 30° minimum and THX's 36–40°),
- **sightline clearance**: how far the line from your eye to the screen's
  bottom edge passes over the head of the person in the row in front.

A 0–100 score weights these (35 % screen size, 30 % centring, 15 % vertical
angle, 20 % sightline). Recommendations rank groups of adjacent free seats
that don't cross an aisle, for "best overall", "best value" (score per price),
"closest", "further back", "most central", "premium" and "wheelchair access".
Each comes with a plain-language reason. Only seats the server reports as free
are considered; recommending never holds a seat.

Heatmaps colour free seats by score, angle, distance, price, category or
distance from the estimated sound sweet spot. Booked and held seats keep the
"unavailable" colour in every mode.

## Walk-through mode

`lib/walkway.js` derives the walkable floor from the layout: the open area in
front of the first row, the rear cross-aisle, the aisles between seat blocks
and the walkways along the walls. Seats, walls, the stage and the balcony
structure are blocked; movement slides along edges instead of passing through.
Balcony seats are reached by their own stairs, which walk mode doesn't model:
"Walk to seat" says so and offers the seat view instead. Keyboard: W A S D or
arrows, Q/E to turn, Shift to hurry, Esc to leave. Touch: joystick plus drag to
look. The orbit camera is unmounted while walking so the two can't conflict.

## Sound layout

A typical 7.1 placement drawn from the hall's dimensions (screen channels,
subwoofers, side and rear surrounds) and the estimated sweet spot (two-thirds
of the way back on the centre line). It is labelled in the UI as an approximate
layout, not the theatre's installation or a measurement. Nothing plays audio.

## Accessibility and wayfinding data

- Layouts carry `accessibility.wheelchair` / `companion` seat numbers and
  `doors` (side, depth, kind, step-free). Built-in halls put wheelchair spaces on
  the flat front row next to the step-free front doors. Halls derived from
  unknown seat lists get **no** accessibility or doors, rather than invented ones.
- Venue directions come from the `Venue` collection (admin → Venues). Tickets
  show them only for theatres that published them; otherwise the ticket says
  directions haven't been published.

## Admin layout editor

Admin → Auditoriums. A hall is described row by row (1–3 blocks, price
category, chair type). The server builds the full layout (rake, room, screen,
doors, wheelchair spaces) for a preview without saving. Saved halls are
immutable — showtimes' seats were generated from them — and can only be
removed while no showtime uses them. Limits: 25 rows, 24 seats per block, 600 seats.

## Revenue reconciliation

Bookings now store a `pricing` snapshot (each seat's category and price, food,
parking, subtotal, discount, total). `server/utils/revenue.js` reports gross,
discounts, refunds, net, the split between demo checkout and recorded payments,
and how many bookings reconcile (gross − discount = charged). Older bookings
without a snapshot are read from the show's seats and flagged "estimated".
There is no cancellation or refund flow, so refunds are reported as zero.

## API additions

| Method | Path | Access |
| --- | --- | --- |
| GET | `/api/layouts` | staff — every hall with showtime usage |
| GET | `/api/layouts/:id` | public — hall plan |
| POST | `/api/layouts/preview` | staff — build without saving |
| POST | `/api/layouts` | staff — save a custom hall |
| DELETE | `/api/layouts/:id` | staff — only unused custom halls |
| GET | `/api/venues/lookup?theatre=` | public — `{ venue }` or `{ venue: null }` |
| GET/POST/PUT/DELETE | `/api/venues` | staff |
| GET | `/api/coupons/admin` · POST `/api/coupons` · PUT `/api/coupons/:id/active` | staff |
| GET | `/api/reviews/admin/recent` · DELETE `/api/reviews/:id` | staff |
| GET | `/api/analytics` | staff — now also `finance`, `occupancy`, `categories`, `food`, `trend` |

Shows accept an optional `screenName` (e.g. "Audi 3") shown on tickets.

## Known limitations

- Checkout is a demo: no payment provider is connected.
- The sound layout is a typical placement, not venue-measured data.
- Walk mode covers the stalls; balcony stairs aren't modelled.
- Performance figures in tests are from one laptop with headless Chrome and
  are not guarantees for other devices.
- Credentials exposed in old public Git history must be rotated by the owner
  before production use (see the security audit notes in the README).
