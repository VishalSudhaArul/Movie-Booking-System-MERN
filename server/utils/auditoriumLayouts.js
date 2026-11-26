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
  // Doors along the side walls (z in metres from the screen). "left"/"right"
  // are as the audience sees them facing the screen. The front doors open onto
  // the flat floor in front of row L, so they are step-free.
  doors: [
    { id: "front-left", label: "Front left door", side: "left", z: 3.2, kind: "both", accessible: true },
    { id: "front-right", label: "Front right door", side: "right", z: 3.2, kind: "both", accessible: true },
    { id: "rear-left", label: "Rear left exit", side: "left", z: 13.85, kind: "exit", accessible: false },
    { id: "rear-right", label: "Rear right exit", side: "right", z: 13.85, kind: "exit", accessible: false },
  ],
  // Row L is on the flat floor by the step-free front doors.
  accessibility: {
    wheelchair: ["L1", "L12"],
    companion: ["L2", "L11"],
    note: "Wheelchair spaces are at both ends of row L, reached step-free from the front doors.",
  },
};

/* ---------------- Multiplex halls (300–500 seats) ----------------
   A large stadium-seated hall: 20–25 rows, three blocks per row (left,
   centre, right) split by two straight aisles, side aisles along the walls,
   and a progressive rake (front rows flat, each row higher, the back rows
   rising most). Rows are labelled from the screen backwards, A nearest the
   screen, skipping I (it reads like 1). Seat 1 is at the +x end of the row.
   The centre block has the same width in every row, so the two aisles are
   straight; the side blocks widen towards the back as the hall fans out. */

const MULTIPLEX_CAPACITIES = [300, 350, 400, 450, 500];
const ROW_LETTERS = "ABCDEFGHJKLMNOPQRSTUVWXYZ"; // 25 letters, no I

const round2 = (n) => Math.round(n * 100) / 100;

const multiplexLayout = (capacity) => {
  const rowCount = Math.round(20 + (capacity - 300) / 40); // 20 … 25
  const centre = 2 * Math.round(capacity / 100); // 6 … 10, even so the total stays even
  const sideTotal = (capacity - rowCount * centre) / 2; // seats in ONE side block, all rows
  const mean = sideTotal / rowCount;
  const front = Math.max(3, Math.round(mean - 1.5));
  const back = 2 * mean - front;
  const sides = Array.from({ length: rowCount }, (_, i) => Math.round(front + ((back - front) * i) / (rowCount - 1)));
  // Hit the capacity exactly: adjust side blocks from the back row forwards.
  let diff = sideTotal - sides.reduce((a, b) => a + b, 0);
  for (let i = rowCount - 1; diff !== 0; i = (i - 1 + rowCount) % rowCount) {
    const step = diff > 0 ? 1 : -1;
    if (sides[i] + step >= 2) {
      sides[i] += step;
      diff -= step;
    }
  }

  // Price categories: front ~30 % Second Class, middle First Class, back ~25 % Balcony (premium).
  const secondRows = Math.round(rowCount * 0.3);
  const balconyRows = Math.round(rowCount * 0.25);
  const sectionFor = (i) => (i < secondRows ? "Second Class" : i >= rowCount - balconyRows ? "Balcony" : "First Class");

  // Rake: two flat rows at the front, then risers growing from 0.16 m to 0.42 m.
  const riserFor = (i) => (i < 2 ? 0 : round2(0.16 + (0.26 * (i - 2)) / Math.max(1, rowCount - 3)));

  const seatWidth = 0.62;
  const aisleWidth = 1.3;
  const rowPitch = 1.15;
  const widest = Math.max(...sides) * 2 + centre;
  const seatingWidth = widest * seatWidth + 2 * aisleWidth;
  // Bigger than the classic hall (22 × 13 × 30 m) and growing with capacity;
  // never narrower than the seating plus a 2 m walkway along each wall.
  const roomWidth = round2(Math.max(22 + (capacity - 300) / 50, seatingWidth + 2 * 2));
  const sideAisleWidth = round2((roomWidth - seatingWidth) / 2);
  const screenWidth = round2(roomWidth * 0.8);
  const screenHeight = round2(screenWidth / 2.35); // scope ratio
  const screenBottom = 1.9;
  const firstRowDistance = round2(Math.max(6.5, screenWidth * 0.42));
  const depth = round2(firstRowDistance + rowCount * rowPitch + 3.5);
  const backFloor = Array.from({ length: rowCount }, (_, i) => riserFor(i)).reduce((a, b) => a + b, 0);
  const height = round2(Math.max(14, screenBottom + screenHeight + 2.4, backFloor + 4.6));

  const rows = sides.map((side, i) => ({
    label: ROW_LETTERS[i],
    section: sectionFor(i),
    tier: "stalls",
    seatType: "standard",
    seats: side * 2 + centre,
    aisleAfter: [side, side + centre],
    blocks: [side, centre, side],
    riser: riserFor(i),
  }));
  const rearDoorZ = round2(firstRowDistance + rowCount * rowPitch + 1.2);
  const rowA = rows[0];
  // Layouts list rows from the screen backwards (order 0 = nearest the screen).
  return {
    id: `multiplex-${capacity}`,
    name: `Multiplex hall · ${capacity} seats`,
    version: 1,
    kind: "multiplex",
    screen: { width: screenWidth, height: screenHeight, bottom: screenBottom, curve: 0.06 },
    room: { width: roomWidth, height, depth },
    geometry: {
      seatWidth: { standard: seatWidth, recliner: 0.9 },
      rowPitch: { standard: rowPitch, recliner: 1.7 },
      aisleWidth,
      sideAisleWidth,
      eyeHeight: 1.15,
      stalls: { firstRowDistance, riser: 0.16 },
      balcony: { gapBeforeFirstRow: 0, floorElevation: 0, riser: 0 },
    },
    sections: [
      { name: "Second Class", tier: "stalls" },
      { name: "First Class", tier: "stalls" },
      { name: "Balcony", tier: "stalls" },
    ],
    rows,
    doors: standardDoors(rearDoorZ),
    // Rows A and B are flat and open onto the step-free front doors.
    accessibility: {
      wheelchair: [`A1`, `A${rowA.seats}`],
      companion: [`A2`, `A${rowA.seats - 1}`],
      note: "Wheelchair spaces are at the outer ends of row A, on the flat floor by the step-free front doors.",
    },
  };
};

// Two step-free doors at the front of the hall and two exits on the rear
// cross-aisle, behind the last row.
function standardDoors(rearZ) {
  return [
    { id: "front-left", label: "Front left door", side: "left", z: 3.2, kind: "both", accessible: true },
    { id: "front-right", label: "Front right door", side: "right", z: 3.2, kind: "both", accessible: true },
    { id: "rear-left", label: "Rear left exit", side: "left", z: rearZ, kind: "exit", accessible: false },
    { id: "rear-right", label: "Rear right exit", side: "right", z: rearZ, kind: "exit", accessible: false },
  ];
}

const LAYOUTS = { [CLASSIC_136.id]: CLASSIC_136 };
MULTIPLEX_CAPACITIES.forEach((c) => {
  const layout = multiplexLayout(c);
  LAYOUTS[layout.id] = layout;
});

/* ---------------- Custom halls (admin layout editor) ----------------
   An admin describes a hall row by row: the seats in each block (1–3 blocks
   split by aisles), the price category and the chair type. Everything else —
   row letters, rake, room size, screen, doors — is worked out here, the same
   way as for the multiplex halls, so a custom hall can't be drawn with seats
   that overlap or float. Saved custom layouts never change (shows' seats were
   made from them); a new version is a new layout. */

const SECTIONS = Object.keys(SECTION_PRICE_FIELDS);
const MAX_CUSTOM_ROWS = ROW_LETTERS.length; // 25
const MAX_BLOCK_SEATS = 24;
const MAX_CUSTOM_SEATS = 600;

const customLayoutError = (spec) => {
  if (!spec || typeof spec !== "object") return "Describe the hall's rows";
  const name = typeof spec.name === "string" ? spec.name.trim() : "";
  if (name.length < 3 || name.length > 60) return "Give the hall a name of 3 to 60 characters";
  if (!Array.isArray(spec.rows) || spec.rows.length < 1) return "Add at least one row";
  if (spec.rows.length > MAX_CUSTOM_ROWS) return `A hall can have up to ${MAX_CUSTOM_ROWS} rows`;
  let total = 0;
  for (let i = 0; i < spec.rows.length; i++) {
    const r = spec.rows[i];
    const where = `Row ${ROW_LETTERS[i]}`;
    if (!r || typeof r !== "object") return `${where} is not valid`;
    if (!Array.isArray(r.blocks) || r.blocks.length < 1 || r.blocks.length > 3) return `${where} needs 1 to 3 seat blocks`;
    if (!r.blocks.every((n) => Number.isInteger(n) && n >= 1 && n <= MAX_BLOCK_SEATS))
      return `${where}: each block needs 1 to ${MAX_BLOCK_SEATS} seats`;
    if (!SECTIONS.includes(r.section)) return `${where}: choose a price category`;
    if (r.seatType !== undefined && r.seatType !== "standard" && r.seatType !== "recliner")
      return `${where}: the chair type must be standard or recliner`;
    total += r.blocks.reduce((a, b) => a + b, 0);
  }
  if (total > MAX_CUSTOM_SEATS) return `A hall can have up to ${MAX_CUSTOM_SEATS} seats (this one has ${total})`;
  if (spec.wheelchairSpaces !== undefined && typeof spec.wheelchairSpaces !== "boolean")
    return "Wheelchair spaces must be on or off";
  return null;
};

/** Builds a full layout from an admin's row description. Throws on invalid input. */
const buildCustomLayout = (spec, id = "custom-preview") => {
  const error = customLayoutError(spec);
  if (error) {
    const err = new Error(error);
    err.status = 400;
    throw err;
  }
  const seatWidth = 0.62;
  const reclinerWidth = 0.9;
  const aisleWidth = 1.3;
  const pitchStd = 1.15;
  const pitchRecliner = 1.7;
  const n = spec.rows.length;
  // Same rake as the multiplex halls: two flat rows, then risers growing towards the back.
  const riserFor = (i) => (i < 2 ? 0 : round2(0.16 + (0.26 * (i - 2)) / Math.max(1, n - 3)));
  const rows = spec.rows.map((r, i) => {
    const blocks = r.blocks.map(Number);
    const aisleAfter = [];
    blocks.slice(0, -1).reduce((acc, b) => {
      aisleAfter.push(acc + b);
      return acc + b;
    }, 0);
    return {
      label: ROW_LETTERS[i],
      section: r.section,
      tier: "stalls",
      seatType: r.seatType === "recliner" ? "recliner" : "standard",
      seats: blocks.reduce((a, b) => a + b, 0),
      aisleAfter,
      blocks,
      riser: riserFor(i),
    };
  });
  const rowWidth = (r) => r.seats * (r.seatType === "recliner" ? reclinerWidth : seatWidth) + r.aisleAfter.length * aisleWidth;
  const seatingWidth = Math.max(...rows.map(rowWidth));
  const roomWidth = round2(Math.max(16, seatingWidth + 2 * 2));
  const screenWidth = round2(roomWidth * 0.8);
  const screenHeight = round2(screenWidth / 2.35);
  const screenBottom = 1.9;
  const firstRowDistance = round2(Math.max(6, screenWidth * 0.42));
  const seatingDepth = rows.reduce((d, r) => d + (r.seatType === "recliner" ? pitchRecliner : pitchStd), 0);
  const depth = round2(firstRowDistance + seatingDepth + 3.5);
  const backFloor = rows.reduce((a, r) => a + r.riser, 0);
  const height = round2(Math.max(12, screenBottom + screenHeight + 2.4, backFloor + 4.6));
  const rowA = rows[0];
  const wheelchair = spec.wheelchairSpaces !== false && rowA.seats >= 4;
  return {
    id,
    name: spec.name.trim(),
    version: 1,
    kind: "custom",
    screen: { width: screenWidth, height: screenHeight, bottom: screenBottom, curve: 0.06 },
    room: { width: roomWidth, height, depth },
    geometry: {
      seatWidth: { standard: seatWidth, recliner: reclinerWidth },
      rowPitch: { standard: pitchStd, recliner: pitchRecliner },
      aisleWidth,
      sideAisleWidth: round2((roomWidth - seatingWidth) / 2),
      eyeHeight: 1.15,
      stalls: { firstRowDistance, riser: 0.16 },
      balcony: { gapBeforeFirstRow: 0, floorElevation: 0, riser: 0 },
    },
    sections: [...new Set(rows.map((r) => r.section))].map((name) => ({ name, tier: "stalls" })),
    rows,
    doors: standardDoors(round2(firstRowDistance + seatingDepth + 1.2)),
    accessibility: wheelchair
      ? {
          wheelchair: ["A1", `A${rowA.seats}`],
          companion: ["A2", `A${rowA.seats - 1}`],
          note: "Wheelchair spaces are at the outer ends of row A, on the flat floor by the step-free front doors.",
        }
      : { wheelchair: [], companion: [], note: "This hall has no wheelchair spaces configured." },
  };
};

// Saved custom layouts, kept in memory so getLayout stays synchronous. Loaded
// from the database at start-up and whenever one is saved or removed.
const customLayouts = new Map();
const setCustomLayouts = (list) => {
  customLayouts.clear();
  (list || []).forEach((l) => customLayouts.set(l.id, l));
};
const addCustomLayout = (layout) => customLayouts.set(layout.id, layout);
const removeCustomLayout = (id) => customLayouts.delete(id);
const isBuiltInLayout = (id) => !!LAYOUTS[id];

const withOrder = (layout) => ({
  ...layout,
  rows: layout.rows.map((r, order) => ({ ...r, order })),
  totalSeats: layout.rows.reduce((n, r) => n + r.seats, 0),
});

const getLayout = (id) => {
  const layout = LAYOUTS[id] || customLayouts.get(id);
  return layout ? withOrder(layout) : null;
};

const listLayouts = () =>
  [...Object.values(LAYOUTS), ...customLayouts.values()].map((l) => ({
    id: l.id,
    name: l.name,
    totalSeats: withOrder(l).totalSeats,
    rows: l.rows.length,
    custom: !LAYOUTS[l.id],
  }));

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
    // Nothing is known about this hall's doors or accessible spaces.
    doors: [],
    accessibility: { wheelchair: [], companion: [], note: "No accessibility details are configured for this hall." },
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
  multiplexLayout,
  MULTIPLEX_CAPACITIES,
  deriveLayout,
  layoutForShow,
  withOrder,
  customLayoutError,
  buildCustomLayout,
  setCustomLayouts,
  addCustomLayout,
  removeCustomLayout,
  isBuiltInLayout,
  MAX_CUSTOM_SEATS,
};
