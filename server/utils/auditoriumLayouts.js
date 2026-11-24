// auditoriumLayouts.js
// Describes the physical shape of an auditorium: rows, sections, aisles, seat
// types and room geometry. Both the 2D seat map and the 3D auditorium are drawn
// from this, so they always agree.
//
// Conventions (also used by client/src/lib/auditorium.js):
// - Units are metres. The screen is at z = 0 and the audience sits at z > 0.
// - Rows are listed from the screen backwards ("order" 0 = nearest the screen).
// - Seat 1 of a row is at +x. In the 2D map (screen at the bottom) that is the
//   left-hand seat, matching the current seat map.
// - Prices are NOT part of a layout: each row's `section` names the existing
//   seat category (Balcony / First Class / Second Class) that sets its price.

const SECTION_PRICE_FIELDS = {
  Balcony: "balconyPrice",
  "First Class": "firstClassPrice",
  "Second Class": "secondClassPrice",
};

const DEFAULT_LAYOUT_ID = "classic-136";

// The hall every show has used so far: 136 seats, rows A–L, aisle in the middle.
// Rows A–B are balcony recliners (a display and comfort detail; they keep the
// Balcony price).
const CLASSIC_136 = {
  id: "classic-136",
  name: "Classic hall with balcony",
  version: 1,
  screen: { width: 14, height: 6, bottom: 1.4, curve: 0.08 },
  room: { width: 22, height: 13, depth: 30 },
  geometry: {
    seatWidth: { standard: 0.62, recliner: 0.9 },
    rowPitch: { standard: 1.1, recliner: 1.7 },
    aisleWidth: 1.3,
    eyeHeight: 1.15, // seated eye height above the row's floor
    stalls: { firstRowDistance: 5.5, riser: 0.17 },
    balcony: { gapBeforeFirstRow: 1.6, floorElevation: 4.2, riser: 0.32 },
  },
  sections: [
    { name: "Second Class", tier: "stalls" },
    { name: "First Class", tier: "stalls" },
    { name: "Balcony", tier: "balcony" },
  ],
  rows: [
    { label: "L", section: "Second Class", tier: "stalls", seatType: "standard", seats: 12, aisleAfter: [6] },
    { label: "K", section: "Second Class", tier: "stalls", seatType: "standard", seats: 12, aisleAfter: [6] },
    { label: "J", section: "Second Class", tier: "stalls", seatType: "standard", seats: 12, aisleAfter: [6] },
    { label: "I", section: "Second Class", tier: "stalls", seatType: "standard", seats: 12, aisleAfter: [6] },
    { label: "H", section: "First Class", tier: "stalls", seatType: "standard", seats: 12, aisleAfter: [6] },
    { label: "G", section: "First Class", tier: "stalls", seatType: "standard", seats: 12, aisleAfter: [6] },
    { label: "F", section: "First Class", tier: "stalls", seatType: "standard", seats: 12, aisleAfter: [6] },
    { label: "E", section: "First Class", tier: "stalls", seatType: "standard", seats: 12, aisleAfter: [6] },
    { label: "D", section: "Balcony", tier: "balcony", seatType: "standard", seats: 10, aisleAfter: [5] },
    { label: "C", section: "Balcony", tier: "balcony", seatType: "standard", seats: 10, aisleAfter: [5] },
    { label: "B", section: "Balcony", tier: "balcony", seatType: "recliner", seats: 10, aisleAfter: [5] },
    { label: "A", section: "Balcony", tier: "balcony", seatType: "recliner", seats: 10, aisleAfter: [5] },
  ],
};

const LAYOUTS = { [CLASSIC_136.id]: CLASSIC_136 };

const withOrder = (layout) => ({
  ...layout,
  rows: layout.rows.map((r, order) => ({ ...r, order })),
  totalSeats: layout.rows.reduce((n, r) => n + r.seats, 0),
});

const getLayout = (id) => (LAYOUTS[id] ? withOrder(LAYOUTS[id]) : null);

const listLayouts = () =>
  Object.values(LAYOUTS).map((l) => ({ id: l.id, name: l.name, totalSeats: withOrder(l).totalSeats }));

// Creates the seat list for a new show from a layout and the three category prices.
const generateSeatsFromLayout = (layout, prices) => {
  // Seats are stored back-to-front (A first), the order shows have always used.
  const backToFront = [...layout.rows].reverse();
  const seats = [];
  backToFront.forEach((row) => {
    const price = Number(prices[SECTION_PRICE_FIELDS[row.section]]);
    for (let i = 1; i <= row.seats; i++) {
      seats.push({ seatNumber: `${row.label}${i}`, category: row.section, price, isBooked: false });
    }
  });
  return seats;
};

const rowOf = (seatNumber) => (String(seatNumber).match(/^[A-Z]+/) || [""])[0];
const numberOf = (seatNumber) => parseInt(String(seatNumber).replace(/^[A-Z]+/, ""), 10) || 0;

// True only when the show has exactly the layout's seats: every seat sits in a
// layout row with the right category, and every layout seat exists. Anything
// else would make the seat map or 3D hall show seats that don't exist.
const seatsFitLayout = (seats, layout) => {
  const rows = new Map(layout.rows.map((r) => [r.label, r]));
  const seen = new Set();
  const allInLayout = seats.every((s) => {
    const row = rows.get(rowOf(s.seatNumber));
    const n = numberOf(s.seatNumber);
    seen.add(s.seatNumber);
    return row && n >= 1 && n <= row.seats && row.section === s.category;
  });
  const total = layout.rows.reduce((sum, r) => sum + r.seats, 0);
  return allInLayout && seen.size === total && seats.length === total;
};

// For a show whose seats don't match any template: one stalls row per letter,
// with the last letter nearest the screen (as in the classic hall) and an aisle
// in the middle.
const deriveLayout = (seats) => {
  const rows = new Map();
  seats.forEach((s) => {
    const label = rowOf(s.seatNumber);
    const row = rows.get(label) || { label, section: s.category, tier: "stalls", seatType: "standard", seats: 0 };
    row.seats = Math.max(row.seats, numberOf(s.seatNumber));
    rows.set(label, row);
  });
  const ordered = [...rows.values()]
    .sort((a, b) => (a.label.length - b.label.length) || b.label.localeCompare(a.label))
    .map((r) => ({ ...r, aisleAfter: r.seats > 4 ? [Math.ceil(r.seats / 2)] : [] }));
  return withOrder({
    ...CLASSIC_136,
    id: "derived",
    name: "Auditorium",
    sections: [...new Set(ordered.map((r) => r.section))].map((name) => ({ name, tier: "stalls" })),
    rows: ordered,
  });
};

// The layout to use for a show: its template if the seats fit, otherwise one
// worked out from the seats. Shows created before layouts existed have no
// layoutId and use the classic hall.
const layoutForShow = (show) => {
  const seats = show.seats || [];
  const template = getLayout(show.layoutId || DEFAULT_LAYOUT_ID);
  if (template && seats.length > 0 && seatsFitLayout(seats, template)) return template;
  return deriveLayout(seats);
};

module.exports = {
  DEFAULT_LAYOUT_ID,
  SECTION_PRICE_FIELDS,
  getLayout,
  listLayouts,
  generateSeatsFromLayout,
  seatsFitLayout,
  deriveLayout,
  layoutForShow,
};
