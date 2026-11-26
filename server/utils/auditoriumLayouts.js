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
//   seat category that sets its price. The stored category keys are
//   "Second Class", "First Class" and "Balcony"; "Balcony" is the premium
//   (back-of-hall) category and is shown to people as "Premium". The key keeps
//   its old name so existing shows, bookings and price fields stay valid.
// - Every hall is a single level: one raked (stadium) floor, no upper tier.
//   A row may have `crossAisleBefore`, a level walkway across the hall in
//   front of it (geometry.crossAisleWidth wide).

const SECTION_PRICE_FIELDS = {
  Balcony: "balconyPrice",
  "First Class": "firstClassPrice",
  "Second Class": "secondClassPrice",
};

const DEFAULT_LAYOUT_ID = "classic-136";

// The hall every show has used so far: 136 seats, rows A–L, aisle in the middle.
// It used to have a 40-seat balcony (rows A–D); those rows now continue the
// ground-floor rake behind a cross-aisle, so every seat number, category and
// price is unchanged and existing bookings stay valid. Rows A–B are recliners.
const CLASSIC_136 = {
  id: "classic-136",
  name: "Classic hall",
  version: 2,
  // A 16:9 screen across 90 % of the front wall (19.8 × 11.14 m), so 16:9
  // trailers fill it edge to edge. The first row is half a screen-width back.
  screen: { width: 19.8, height: 11.14, bottom: 1.9, curve: 0.07 },
  room: { width: 22, height: 14.3, depth: 28.4 },
  geometry: {
    seatWidth: { standard: 0.62, recliner: 0.9 },
    rowPitch: { standard: 1.1, recliner: 1.7 },
    aisleWidth: 1.3,
    crossAisleWidth: 1.5,
    eyeHeight: 1.15, // seated eye height above the row's floor
    stalls: { firstRowDistance: 9.9, riser: 0.17 },
  },
  sections: [
    { name: "Second Class", tier: "stalls" },
    { name: "First Class", tier: "stalls" },
    { name: "Balcony", tier: "stalls" },
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
    { label: "D", section: "Balcony", tier: "stalls", seatType: "standard", seats: 10, aisleAfter: [5], crossAisleBefore: true },
    { label: "C", section: "Balcony", tier: "stalls", seatType: "standard", seats: 10, aisleAfter: [5] },
    { label: "B", section: "Balcony", tier: "stalls", seatType: "recliner", seats: 10, aisleAfter: [5] },
    { label: "A", section: "Balcony", tier: "stalls", seatType: "recliner", seats: 10, aisleAfter: [5] },
  ].map((row, i) => ({
    ...row,
    // Progressive rake: row L flat (step-free), then each row higher, rising
    // more towards the back so every seat clears the head in front.
    riser: i === 0 ? 0 : Math.round((0.2 + (0.2 * (i - 1)) / 10) * 100) / 100,
  })),
  // Doors along the side walls (z in metres from the screen). "left"/"right"
  // are as the audience sees them facing the screen. The front doors open onto
  // the flat floor in front of row L, so they are step-free.
  doors: [
    { id: "front-left", label: "Front left door", side: "left", z: 3.2, kind: "both", accessible: true },
    { id: "front-right", label: "Front right door", side: "right", z: 3.2, kind: "both", accessible: true },
    { id: "mid-left", label: "Middle left exit", side: "left", z: 18.9, kind: "exit", accessible: false },
    { id: "mid-right", label: "Middle right exit", side: "right", z: 18.9, kind: "exit", accessible: false },
    { id: "rear-left", label: "Rear left exit", side: "left", z: 25.8, kind: "exit", accessible: false },
    { id: "rear-right", label: "Rear right exit", side: "right", z: 25.8, kind: "exit", accessible: false },
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

/* Giant 16:9 cinema screens. Trailers are 16:9, so they fill the screen edge
   to edge with no bars and no distortion. The screen spans `fill` of the front
   wall; the room is made tall enough for it with 1.2 m to spare above. */
const SCREEN_ASPECT = 16 / 9;
const cinemaScreen = (width, { bottom = 2, curve = 0.06 } = {}) => ({
  width: round2(width),
  height: round2(width / SCREEN_ASPECT),
  bottom,
  curve,
});
const roomHeightFor = (screen, minimum) => round2(Math.max(minimum, screen.bottom + screen.height + 1.2));

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

  // Price categories: front ~30 % Second Class, middle First Class, back ~25 % premium ("Balcony" key).
  const secondRows = Math.round(rowCount * 0.3);
  const balconyRows = Math.round(rowCount * 0.25);
  const sectionFor = (i) => (i < secondRows ? "Second Class" : i >= rowCount - balconyRows ? "Balcony" : "First Class");

  // Rake: two flat rows at the front, then risers growing from 0.16 m to 0.42 m.
  // Rake from row B (row A stays flat for step-free wheelchair spaces); the
  // risers grow towards the back so heads in front clear the screen.
  const riserFor = (i) => (i < 1 ? 0 : round2(0.16 + (0.26 * (i - 1)) / Math.max(1, rowCount - 2)));

  const seatWidth = 0.62;
  const aisleWidth = 1.3;
  const rowPitch = 1.15;
  const widest = Math.max(...sides) * 2 + centre;
  const seatingWidth = widest * seatWidth + 2 * aisleWidth;
  // Bigger than the classic hall (22 × 13 × 30 m) and growing with capacity;
  // never narrower than the seating plus a 2 m walkway along each wall.
  const roomWidth = round2(Math.max(22 + (capacity - 300) / 50, seatingWidth + 2 * 2));
  const sideAisleWidth = round2((roomWidth - seatingWidth) / 2);
  const screen = cinemaScreen(roomWidth * 0.9, { bottom: 2.1 });
  const screenWidth = screen.width;
  // Half a screen-width back, so the front row takes in the whole screen.
  const firstRowDistance = round2(Math.max(6.5, screenWidth * 0.5));
  const depth = round2(firstRowDistance + rowCount * rowPitch + 3.5);
  const backFloor = Array.from({ length: rowCount }, (_, i) => riserFor(i)).reduce((a, b) => a + b, 0);
  const height = roomHeightFor(screen, Math.max(14, backFloor + 4.6));

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
    screen,
    room: { width: roomWidth, height, depth },
    geometry: {
      seatWidth: { standard: seatWidth, recliner: 0.9 },
      rowPitch: { standard: rowPitch, recliner: 1.7 },
      aisleWidth,
      sideAisleWidth,
      eyeHeight: 1.15,
      stalls: { firstRowDistance, riser: 0.16 },
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

/* ---------------- Grand halls (600–800 seats) ----------------
   The flagship single-level auditoriums: 25 rows on one raked floor, three
   blocks per row with straight aisles, a level cross-aisle across the middle
   of the hall (with exits at both ends), and two rows of premium recliners at
   the back. Comfort is the same as the multiplex halls (0.62 m seats, 1.15 m
   rows) and recliners get 0.90 m and 1.70 m. The room is sized from the widest
   row plus a 2.2 m walkway along each wall; the screen is 84 % of the room width. */

const GRAND_CAPACITIES = [600, 700, 800];
const GRAND = { rows: 25, reclinerRows: 2, crossBefore: 13, seatWidth: 0.62, reclinerWidth: 0.9, pitch: 1.15, reclinerPitch: 1.7, aisle: 1.3, cross: 1.6 };

const grandLayout = (capacity) => {
  const g = GRAND;
  const stdRows = g.rows - g.reclinerRows;
  const centre = 2 * Math.round(capacity / 100) + 2; // 14, 16, 18
  const reclinerCentre = Math.floor((centre * g.seatWidth) / g.reclinerWidth);
  // Side blocks of the standard rows widen towards the back; the recliner rows
  // fill the same width as the last standard row, so the aisles run straight.
  let sides = [];
  let reclinerSide = 0;
  for (let pass = 0; pass < 3; pass++) {
    const reclinerSeats = g.reclinerRows * (reclinerCentre + 2 * reclinerSide);
    const sideTotal = (capacity - reclinerSeats - stdRows * centre) / 2;
    const mean = sideTotal / stdRows;
    const front = Math.max(4, Math.round(mean - 2));
    const back = 2 * mean - front;
    sides = Array.from({ length: stdRows }, (_, i) => Math.round(front + ((back - front) * i) / (stdRows - 1)));
    let diff = Math.round(sideTotal) - sides.reduce((x, y) => x + y, 0);
    for (let i = stdRows - 1; diff !== 0; i = (i - 1 + stdRows) % stdRows) {
      const step = diff > 0 ? 1 : -1;
      if (sides[i] + step >= 3) {
        sides[i] += step;
        diff -= step;
      }
    }
    reclinerSide = Math.floor((sides[stdRows - 1] * g.seatWidth) / g.reclinerWidth);
  }
  // Hit the capacity exactly (an odd remainder goes to the centre of the front row).
  const total = () => sides.reduce((x, y) => x + 2 * y + centre, 0) + g.reclinerRows * (reclinerCentre + 2 * reclinerSide);
  let extraCentre = 0;
  let diff = capacity - total();
  for (let i = 0; diff !== 0 && i < 400; i++) {
    const k = stdRows - 1 - (i % stdRows);
    if (Math.abs(diff) >= 2) {
      const step = diff > 0 ? 1 : -1;
      if (sides[k] + step >= 3) {
        sides[k] += step;
        diff -= 2 * step;
      }
    } else {
      extraCentre += diff;
      diff = 0;
    }
  }
  const secondRows = Math.round(g.rows * 0.32);
  const riserFor = (i) => (i < 1 ? 0 : round2(0.17 + (0.24 * (i - 1)) / (g.rows - 2)));
  const rows = [];
  for (let i = 0; i < g.rows; i++) {
    const recliner = i >= stdRows;
    const side = recliner ? reclinerSide : sides[i];
    const mid = recliner ? reclinerCentre : centre + (i === 0 ? extraCentre : 0);
    rows.push({
      label: ROW_LETTERS[i],
      section: recliner ? "Balcony" : i < secondRows ? "Second Class" : "First Class",
      tier: "stalls",
      seatType: recliner ? "recliner" : "standard",
      seats: side * 2 + mid,
      aisleAfter: [side, side + mid],
      blocks: [side, mid, side],
      riser: recliner && i === stdRows ? 0.3 : riserFor(i),
      ...(i === g.crossBefore ? { crossAisleBefore: true } : {}),
    });
  }
  const rowWidth = (r) => r.seats * (r.seatType === "recliner" ? g.reclinerWidth : g.seatWidth) + 2 * g.aisle;
  const seatingWidth = Math.max(...rows.map(rowWidth));
  const roomWidth = round2(seatingWidth + 2 * 2.2);
  // A wall-to-wall screen (84 % of the room) so even the back row sees at
  // least SMPTE's 30°, mounted high enough to clear heads in front.
  // It also grows with the hall's depth: with the first row ~0.46 screen-widths
  // back, a screen of 0.76 × the seating depth gives the last row ≥ 30°.
  const seatingSpan = stdRows * g.pitch + g.reclinerRows * g.reclinerPitch + g.cross;
  const screen = cinemaScreen(Math.min(roomWidth * 0.92, Math.max(roomWidth * 0.9, seatingSpan * 0.76)), { bottom: 2.3, curve: 0.07 });
  const screenWidth = screen.width;
  // About half a screen-width back, so even the front row takes in the whole screen.
  const firstRowDistance = round2(Math.max(9, screenWidth * 0.5));
  const seatingDepth = stdRows * g.pitch + g.reclinerRows * g.reclinerPitch + g.cross;
  const crossZ = round2(firstRowDistance + g.crossBefore * g.pitch - g.pitch / 2 + g.cross / 2);
  const rearDoorZ = round2(firstRowDistance + seatingDepth + 1.0);
  const backFloor = rows.reduce((x, r) => x + r.riser, 0);
  const rowA = rows[0];
  return {
    id: `grand-${capacity}`,
    name: `Grand hall · ${capacity} seats`,
    version: 1,
    kind: "grand",
    screen,
    room: { width: roomWidth, height: roomHeightFor(screen, Math.max(15, backFloor + 4.8)), depth: round2(firstRowDistance + seatingDepth + 3.2) },
    geometry: {
      seatWidth: { standard: g.seatWidth, recliner: g.reclinerWidth },
      rowPitch: { standard: g.pitch, recliner: g.reclinerPitch },
      aisleWidth: g.aisle,
      crossAisleWidth: g.cross,
      sideAisleWidth: round2((roomWidth - seatingWidth) / 2),
      eyeHeight: 1.15,
      stalls: { firstRowDistance, riser: 0.16 },
    },
    sections: [
      { name: "Second Class", tier: "stalls" },
      { name: "First Class", tier: "stalls" },
      { name: "Balcony", tier: "stalls" },
    ],
    rows,
    doors: [
      ...standardDoors(rearDoorZ).slice(0, 2),
      { id: "mid-left", label: "Middle left exit", side: "left", z: crossZ, kind: "exit", accessible: false },
      { id: "mid-right", label: "Middle right exit", side: "right", z: crossZ, kind: "exit", accessible: false },
      ...standardDoors(rearDoorZ).slice(2),
    ],
    accessibility: {
      wheelchair: ["A1", `A${rowA.seats}`],
      companion: ["A2", `A${rowA.seats - 1}`],
      note: "Wheelchair spaces are at the outer ends of row A, on the flat floor by the step-free front doors.",
    },
  };
};

const LAYOUTS = { [CLASSIC_136.id]: CLASSIC_136 };
MULTIPLEX_CAPACITIES.forEach((c) => {
  const layout = multiplexLayout(c);
  LAYOUTS[layout.id] = layout;
});
GRAND_CAPACITIES.forEach((c) => {
  const layout = grandLayout(c);
  LAYOUTS[layout.id] = layout;
});

// The hall new showtimes get when none is chosen: the 800-seat flagship.
// (Shows stored before layouts existed keep DEFAULT_LAYOUT_ID, the classic hall.)
const NEW_SHOW_LAYOUT_ID = "grand-800";

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
const MAX_CUSTOM_SEATS = 900;

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
  if (spec.crossAisleBefore !== undefined && spec.crossAisleBefore !== null) {
    const k = spec.crossAisleBefore;
    if (!Number.isInteger(k) || k < 2 || k > spec.rows.length - 2)
      return "The cross-aisle must have at least two rows in front of it and two behind it";
  }
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
  const riserFor = (i) => (i < 1 ? 0 : round2(0.16 + (0.26 * (i - 1)) / Math.max(1, n - 2)));
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
      ...(spec.crossAisleBefore === i ? { crossAisleBefore: true } : {}),
    };
  });
  const crossWidth = 1.5;
  const hasCross = rows.some((r) => r.crossAisleBefore);
  const rowWidth = (r) => r.seats * (r.seatType === "recliner" ? reclinerWidth : seatWidth) + r.aisleAfter.length * aisleWidth;
  const seatingWidth = Math.max(...rows.map(rowWidth));
  const roomWidth = round2(Math.max(16, seatingWidth + 2 * 2));
  const screen = cinemaScreen(roomWidth * 0.9, { bottom: 2.1 });
  const screenWidth = screen.width;
  const firstRowDistance = round2(Math.max(6, screenWidth * 0.5));
  const seatingDepth = rows.reduce((d, r) => d + (r.seatType === "recliner" ? pitchRecliner : pitchStd), 0) + (hasCross ? crossWidth : 0);
  const crossIndex = rows.findIndex((r) => r.crossAisleBefore);
  const crossZ = hasCross
    ? round2(firstRowDistance + rows.slice(0, crossIndex).reduce((d, r) => d + (r.seatType === "recliner" ? pitchRecliner : pitchStd), 0) - pitchStd / 2 + crossWidth / 2)
    : null;
  const depth = round2(firstRowDistance + seatingDepth + 3.5);
  const backFloor = rows.reduce((a, r) => a + r.riser, 0);
  const height = roomHeightFor(screen, Math.max(12, backFloor + 4.6));
  const rowA = rows[0];
  const wheelchair = spec.wheelchairSpaces !== false && rowA.seats >= 4;
  return {
    id,
    name: spec.name.trim(),
    version: 1,
    kind: "custom",
    screen,
    room: { width: roomWidth, height, depth },
    geometry: {
      seatWidth: { standard: seatWidth, recliner: reclinerWidth },
      rowPitch: { standard: pitchStd, recliner: pitchRecliner },
      aisleWidth,
      crossAisleWidth: crossWidth,
      sideAisleWidth: round2((roomWidth - seatingWidth) / 2),
      eyeHeight: 1.15,
      stalls: { firstRowDistance, riser: 0.16 },
    },
    sections: [...new Set(rows.map((r) => r.section))].map((name) => ({ name, tier: "stalls" })),
    rows,
    doors: [
      ...standardDoors(round2(firstRowDistance + seatingDepth + 1.2)),
      ...(hasCross
        ? [
            { id: "mid-left", label: "Middle left exit", side: "left", z: crossZ, kind: "exit", accessible: false },
            { id: "mid-right", label: "Middle right exit", side: "right", z: crossZ, kind: "exit", accessible: false },
          ]
        : []),
    ],
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
  grandLayout,
  GRAND_CAPACITIES,
  NEW_SHOW_LAYOUT_ID,
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
