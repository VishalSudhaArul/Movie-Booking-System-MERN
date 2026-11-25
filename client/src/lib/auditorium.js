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
const placeRows = (layout) => {
  const g = layout.geometry;
  const placed = [];
  let z = g.stalls.firstRowDistance;
  let stallsCount = 0;
  let balconyCount = 0;
  let stallsFloor = 0;
  let enteredBalcony = false;

  [...layout.rows]
    .sort((a, b) => a.order - b.order)
    .forEach((row) => {
      let floorY;
      if (row.tier === "balcony") {
        if (!enteredBalcony) {
          z += g.balcony.gapBeforeFirstRow;
          enteredBalcony = true;
        }
        floorY = g.balcony.floorElevation + balconyCount * g.balcony.riser;
        balconyCount += 1;
      } else if (typeof row.riser === "number") {
        // Stadium rake: each row states how much higher it is than the one in front.
        stallsFloor += row.riser;
        floorY = stallsFloor;
        stallsCount += 1;
      } else {
        floorY = stallsCount * g.stalls.riser;
        stallsCount += 1;
      }
      placed.push({ ...row, z, floorY });
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

  const rows = placeRows(layout).map((row) => {
    const width = seatWidthFor(g, row.seatType);
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
          aisleBefore: (row.aisleAfter || []).includes(index - 1),
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

  return {
    id: layout.id,
    name: layout.name,
    kind: layout.kind || "classic",
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
