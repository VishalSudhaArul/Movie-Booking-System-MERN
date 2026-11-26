// walkway.js
// Where a visitor can stand in walk-through mode, worked out from the hall's
// real layout. Every hall is a single raked floor. Walkable: the open floor in
// front of the first row, the level cross-aisles (between rows, and behind the
// last row), the aisles between seat blocks and the walkways along the walls.
// Everything else (seats, walls, the stage) is blocked.
//
// Coordinates match lib/auditorium.js: metres, screen at z = 0, audience at z > 0.

export const STANDING_EYE = 1.6; // eye height of a standing adult, metres
const BODY = 0.22; // clearance kept from walls and seat ends
const STAGE_FRONT = 2.4; // the stage in front of the screen ends here (see HallScene)

const pitchOf = (hall, row) => hall.geometry.rowPitch[row.seatType] || hall.geometry.rowPitch.standard;

/** Walkable areas of a hall built with buildAuditorium(). */
export function walkArea(hall) {
  const g = hall.geometry;
  const halfW = hall.room.width / 2;
  const rows = hall.rows;
  const sideAisle = g.sideAisleWidth || 0.9;
  const wallX = halfW - sideAisle / 2;
  const wallHalf = Math.max(0.2, sideAisle / 2 - BODY);

  const bands = rows.map((r) => ({
    label: r.label,
    zMin: r.z - pitchOf(hall, r) / 2,
    zMax: r.z + pitchOf(hall, r) / 2,
    floorY: r.floorY,
    corridors: [
      ...r.aisleXs.map((x) => ({ x, half: Math.max(0.2, g.aisleWidth / 2 - BODY), kind: "aisle" })),
      { x: wallX, half: wallHalf, kind: "wall" },
      { x: -wallX, half: wallHalf, kind: "wall" },
    ],
  }));

  // Open, level areas you can cross from side to side.
  const front = { zMin: STAGE_FRONT + BODY, zMax: bands[0].zMin - 0.05, floorY: 0, name: "Front of the hall, by the screen" };
  const cross = (hall.crossAisles || []).map((c) => ({ zMin: c.zMin + 0.02, zMax: c.zMax - 0.02, floorY: c.floorY, name: `Cross-aisle before row ${c.beforeRow}` }));
  const backWall = Math.max(hall.room.depth, rows[rows.length - 1].z + 3);
  const lastBand = bands[bands.length - 1];
  const rearLimit = backWall - BODY - 0.1;
  const rear = rearLimit - lastBand.zMax > 0.8 ? { zMin: lastBand.zMax + 0.05, zMax: rearLimit, floorY: lastBand.floorY, name: "Rear cross-aisle" } : null;

  return {
    halfW,
    xLimit: halfW - BODY - 0.1,
    front,
    rear,
    zones: [front, ...cross, ...(rear ? [rear] : [])],
    bands,
    firstRow: rows[0].label,
  };
}

const bandAt = (area, z) => area.bands.find((b) => z >= b.zMin && z < b.zMax) || null;
const zoneAt = (area, z) => area.zones.find((zn) => z >= zn.zMin && z <= zn.zMax) || null;

/** Floor height under a point (0 in front of the seats). */
export function floorAt(area, z) {
  const zone = zoneAt(area, z);
  if (zone) return zone.floorY;
  const band = bandAt(area, z);
  if (band) return band.floorY;
  // Between areas (e.g. a step edge): the last row starting in front of z.
  return area.bands.reduce((y, b) => (b.zMin <= z ? b.floorY : y), 0);
}

/** True if a visitor can stand at (x, z). */
export function isWalkable(area, x, z) {
  if (Math.abs(x) > area.xLimit) return false;
  if (zoneAt(area, z)) return true;
  const band = bandAt(area, z);
  if (!band) return false;
  return band.corridors.some((c) => Math.abs(x - c.x) <= c.half);
}

/**
 * Moves from (x, z) by (dx, dz), sliding along walls and seat rows instead of
 * passing through them. Returns the new { x, z }.
 */
export function step(area, x, z, dx, dz) {
  if (isWalkable(area, x + dx, z + dz)) return { x: x + dx, z: z + dz };
  if (dx && isWalkable(area, x + dx, z)) return { x: x + dx, z };
  if (dz && isWalkable(area, x, z + dz)) return { x, z: z + dz };
  return { x, z };
}

/** Where walk mode starts: the rear cross-aisle facing the screen, else the front facing the seats. */
export function startPoint(area) {
  const centreAisle = area.bands[0].corridors.find((c) => c.kind === "aisle") || area.bands[0].corridors[0];
  if (area.rear) return { x: centreAisle.x, z: (area.rear.zMin + area.rear.zMax) / 2, yaw: 0 };
  return { x: 0, z: (area.front.zMin + area.front.zMax) / 2, yaw: Math.PI };
}

/** Plain-language position, e.g. "Row H · centre aisle" or "Front of the hall". */
export function describePosition(area, x, z) {
  const zone = zoneAt(area, z);
  if (zone) return zone.name;
  if (z < area.front.zMin) return area.front.name;
  const band = bandAt(area, z);
  if (!band) return "Auditorium";
  const c = band.corridors.reduce((best, k) => (Math.abs(x - k.x) < Math.abs(x - best.x) ? k : best), band.corridors[0]);
  // Facing the screen (-z), +x is house right.
  const side = c.x > 0.3 ? "right" : c.x < -0.3 ? "left" : "centre";
  const where = c.kind === "wall" ? `${side} wall walkway` : side === "centre" ? "centre aisle" : `${side} aisle`;
  return `Row ${band.label} · ${where}`;
}

/**
 * Waypoints from (x, z) to the aisle beside a seat, changing aisle only in an
 * open cross-aisle (front, middle or rear). The last point is in the aisle
 * level with the seat.
 */
export function routeToSeat(area, from, seat) {
  const band = bandAt(area, seat.z);
  if (!band) return [];
  const aisle = band.corridors.reduce((best, c) => (Math.abs(c.x - seat.x) < Math.abs(best.x - seat.x) ? c : best), band.corridors[0]);
  // Stand just inside the aisle, on the seat's side.
  const side = Math.sign(seat.x - aisle.x) || 1;
  const target = { x: aisle.x + side * Math.min(aisle.half * 0.6, 0.25), z: seat.z };

  if (zoneAt(area, from.z)) return [{ x: aisle.x, z: from.z }, { x: aisle.x, z: seat.z }, target];

  const here = bandAt(area, from.z);
  const myCorridor = here && here.corridors.find((c) => Math.abs(from.x - c.x) <= c.half + 0.05);
  if (myCorridor && Math.abs(myCorridor.x - aisle.x) < 0.3) return [{ x: aisle.x, z: from.z }, { x: aisle.x, z: seat.z }, target];

  const x0 = myCorridor ? myCorridor.x : from.x;
  const mids = area.zones.map((zn) => (zn.zMin + zn.zMax) / 2);
  const cost = (zz) => Math.abs(from.z - zz) + Math.abs(x0 - aisle.x) + Math.abs(zz - seat.z);
  const via = mids.reduce((best, zz) => (cost(zz) < cost(best) ? zz : best), mids[0]);
  return [{ x: x0, z: via }, { x: aisle.x, z: via }, { x: aisle.x, z: seat.z }, target];
}
