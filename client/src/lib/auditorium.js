// auditorium.js
// Turns a show's layout (sent by the server, see server/utils/auditoriumLayouts.js)
// into seat positions and viewing information. The 2D seat map and the 3D
// auditorium both use this, so a seat is in the same place in both.
//
// Coordinates are metres: screen at z = 0, audience at z > 0, y up.
// Seat 1 of each row is at +x (the left of the 2D map, which has the screen at
// the bottom). Only seats that actually exist are placed; the layout just says
// where they go.

export const rowLabelOf = (seatNumber) => (String(seatNumber).match(/^[A-Za-z]+/) || ["?"])[0].toUpperCase();
export const seatIndexOf = (seatNumber) => parseInt(String(seatNumber).replace(/^[A-Za-z]+/, ""), 10) || 0;

const seatWidthFor = (g, type) => g.seatWidth[type] || g.seatWidth.standard;
const rowPitchFor = (g, type) => g.rowPitch[type] || g.rowPitch.standard;

// Depth and floor height of every row, front to back.
// Every hall is a single raked floor. A row with `crossAisleBefore` has a level
// walkway in front of it (geometry.crossAisleWidth deep) at the floor height of
// the row in front.
const placeRows = (layout) => {
  const g = layout.geometry;
  const placed = [];
  let z = g.stalls.firstRowDistance;
  let count = 0;
  let floor = 0;

  [...layout.rows]
    .sort((a, b) => a.order - b.order)
    .forEach((row) => {
      if (row.crossAisleBefore && placed.length) z += g.crossAisleWidth || 1.5;
      let floorY;
      if (typeof row.riser === "number") {
        // Stadium rake: each row states how much higher it is than the one in front.
        floor += row.riser;
        floorY = floor;
      } else {
        floorY = count * g.stalls.riser;
      }
      count += 1;
      placed.push({ ...row, tier: "stalls", z, floorY });
      z += rowPitchFor(g, row.seatType);
    });

  return placed;
};

// Horizontal position of seat `index` (1-based) in a row, accounting for aisles.
const seatX = (row, index, g) => {
  const width = seatWidthFor(g, row.seatType);
  const aisles = row.aisleAfter || [];
  const rowWidth = row.seats * width + aisles.length * g.aisleWidth;
  const aislesBefore = aisles.filter((a) => index > a).length;
  return rowWidth / 2 - (index - 0.5) * width - aislesBefore * g.aisleWidth;
};

// Which block of the row a seat is in, as the audience sees it facing the
// screen ("house" left/right). Facing the screen (-z), +x is on your right, and
// seat 1 is at +x, so the low numbers are the right-hand block.
const BLOCK_NAMES = { 1: ["centre"], 2: ["right", "left"], 3: ["right", "centre", "left"] };
const blockOf = (row, index) => {
  const aisles = row.aisleAfter || [];
  const names = BLOCK_NAMES[aisles.length + 1];
  if (!names) return "centre";
  return names[aisles.filter((a) => index > a).length];
};

/**
 * Builds everything needed to draw the hall.
 * Returns rows front-to-back, each with its existing seats (sorted by number)
 * and their positions: { x, y (eye height), z, floorY, seatWidth, aisleBefore }.
 */
export function buildAuditorium(layout, seats) {
  if (!layout || !Array.isArray(layout.rows)) return null;
  const g = layout.geometry;
  const byRow = new Map();
  (seats || []).forEach((seat) => {
    const label = rowLabelOf(seat.seatNumber);
    if (!byRow.has(label)) byRow.set(label, []);
    byRow.get(label).push(seat);
  });

  // Accessibility comes only from the layout's own configuration.
  const access = layout.accessibility || {};
  const wheelchair = new Set(access.wheelchair || []);
  const companion = new Set(access.companion || []);

  const rows = placeRows(layout).map((row) => {
    const width = seatWidthFor(g, row.seatType);
    const aisleSet = new Set(row.aisleAfter || []);
    const rowSeats = (byRow.get(row.label) || [])
      .slice()
      .sort((a, b) => seatIndexOf(a.seatNumber) - seatIndexOf(b.seatNumber))
      .map((seat) => {
        const index = seatIndexOf(seat.seatNumber);
        return {
          block: blockOf(row, index),
          ...seat,
          index,
          seatType: row.seatType,
          tier: row.tier,
          x: seatX(row, index, g),
          y: row.floorY + g.eyeHeight,
          z: row.z,
          floorY: row.floorY,
          seatWidth: width,
          // An aisle sits just before this seat (between it and the previous number).
          aisleBefore: aisleSet.has(index - 1),
          // Next to an aisle or at the end of the row (the side walkways).
          aisleSeat: index === 1 || index === row.seats || aisleSet.has(index - 1) || aisleSet.has(index),
          wheelchair: wheelchair.has(seat.seatNumber),
          companion: companion.has(seat.seatNumber),
        };
      });
    return { ...row, seatWidth: width, seats: rowSeats };
  });

  const seatIndex = new Map();
  rows.forEach((r) => r.seats.forEach((s) => seatIndex.set(s.seatNumber, s)));

  // Where the aisles run, per row: midway between the seats either side.
  rows.forEach((row) => {
    row.aisleXs = (row.aisleAfter || [])
      .map((a) => {
        const before = row.seats.find((x) => x.index === a);
        const after = row.seats.find((x) => x.index === a + 1);
        if (before && after) return (before.x + after.x) / 2;
        return seatX(row, a, g) - (seatWidthFor(g, row.seatType) + g.aisleWidth) / 2;
      });
  });

  // Level cross-aisles between rows (walkable, with exits at their ends).
  const crossAisles = [];
  rows.forEach((r, i) => {
    if (!r.crossAisleBefore || i === 0) return;
    const prev = rows[i - 1];
    crossAisles.push({
      zMin: prev.z + rowPitchFor(g, prev.seatType) / 2,
      zMax: r.z - rowPitchFor(g, r.seatType) / 2,
      floorY: prev.floorY,
      beforeRow: r.label,
    });
  });

  // Doors on the side walls, placed in hall coordinates.
  const floorAt = (z) => rows.reduce((y, r) => (r.z - rowPitchFor(g, r.seatType) / 2 <= z ? r.floorY : y), 0);
  const doors = (layout.doors || []).map((d) => ({
    ...d,
    // Facing the screen (-z), house right is +x.
    x: (d.side === "right" ? 1 : -1) * (layout.room.width / 2),
    floorY: floorAt(d.z),
  }));

  return {
    id: layout.id,
    name: layout.name,
    kind: layout.kind || "classic",
    doors,
    crossAisles,
    accessibility: {
      wheelchair: [...wheelchair],
      companion: [...companion],
      note: access.note || "",
      configured: wheelchair.size > 0,
    },
    screen: layout.screen,
    room: layout.room,
    geometry: g,
    rows,
    seatIndex,
    seatCount: seatIndex.size,
  };
}

const deg = (rad) => (rad * 180) / Math.PI;
const round1 = (n) => Math.round(n * 10) / 10;

/**
 * What the screen looks like from a seat.
 * - distance: metres from the eye to the screen centre
 * - horizontalAngle: degrees off the screen's centre line (+ = towards seat 1's side)
 * - verticalAngle: degrees the eye looks up (+) or down (−) to the screen centre
 * - screenWidthAngle: how wide the screen appears, in degrees of your view
 * - viewLabel: a plain-language summary based on screenWidthAngle
 */
export function viewingInfo(seatPos, screen) {
  const centreY = screen.bottom + screen.height / 2;
  const dy = centreY - seatPos.y;
  const distance = Math.sqrt(seatPos.x ** 2 + dy ** 2 + seatPos.z ** 2);
  const horizontalAngle = deg(Math.atan2(seatPos.x, seatPos.z));
  const verticalAngle = deg(Math.atan2(dy, Math.hypot(seatPos.x, seatPos.z)));
  const screenWidthAngle = deg(2 * Math.atan(screen.width / 2 / Math.hypot(seatPos.x, seatPos.z)));

  let viewLabel;
  if (screenWidthAngle >= 60) viewLabel = "Very close: the screen fills your view";
  else if (screenWidthAngle >= 36) viewLabel = "Immersive";
  else if (screenWidthAngle >= 26) viewLabel = "Balanced";
  else viewLabel = "Distant: the whole screen at a glance";

  return {
    distance: round1(distance),
    horizontalAngle: round1(horizontalAngle),
    verticalAngle: round1(verticalAngle),
    screenWidthAngle: round1(screenWidthAngle),
    viewLabel,
  };
}

/**
 * The nearest door to a seat, walking along the row to the closer end and then
 * along the side walkway. Returns { door, metres } or null when the hall has no
 * doors configured. `accessibleOnly` limits it to step-free doors.
 */
export function nearestDoor(hall, seat, { accessibleOnly = false } = {}) {
  const doors = (hall?.doors || []).filter((d) => !accessibleOnly || d.accessible);
  if (!doors.length || !seat) return null;
  let best = null;
  doors.forEach((d) => {
    const metres = Math.abs(d.x - seat.x) + Math.abs(d.z - seat.z) + Math.abs((d.floorY || 0) - (seat.floorY || 0));
    if (!best || metres < best.metres) best = { door: d, metres: Math.round(metres) };
  });
  return best;
}
