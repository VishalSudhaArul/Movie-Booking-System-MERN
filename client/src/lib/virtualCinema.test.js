// Seat insights, walk-through geometry and speaker layout, checked against the
// real layouts the server sends (so the 2D map, 3D hall and server agree).
import { buildAuditorium, nearestDoor } from "./auditorium";
import { seatMetrics, recommendSeats, heatmap, compareSeats, describeView, IDEAL_SCREEN_ANGLE } from "./seatInsights";
import { walkArea, isWalkable, step, startPoint, routeToSeat, describePosition, floorAt } from "./walkway";
import { speakerLayout } from "./speakers";

const { getLayout, generateSeatsFromLayout, MULTIPLEX_CAPACITIES, GRAND_CAPACITIES } = require("../../../server/utils/auditoriumLayouts");

const PRICES = { balconyPrice: 420, firstClassPrice: 300, secondClassPrice: 180 };
const hallFor = (id, booked = []) => {
  const layout = getLayout(id);
  const seats = generateSeatsFromLayout(layout, PRICES).map((s) => ({ ...s, isBooked: booked.includes(s.seatNumber) }));
  return buildAuditorium(layout, seats);
};
const IDS = ["classic-136", ...MULTIPLEX_CAPACITIES.map((c) => `multiplex-${c}`), ...GRAND_CAPACITIES.map((c) => `grand-${c}`)];

describe.each(IDS)("%s", (id) => {
  const hall = hallFor(id);
  const metrics = seatMetrics(hall);

  test("every seat gets a score between 0 and 100 from its geometry", () => {
    expect(metrics.size).toBe(hall.seatCount);
    metrics.forEach((m) => {
      expect(m.score).toBeGreaterThanOrEqual(0);
      expect(m.score).toBeLessThanOrEqual(100);
      expect(m.distance).toBeGreaterThan(0);
    });
  });

  test("the rake clears the head in front for every seat (no blocked sightlines)", () => {
    const blocked = [...metrics.entries()].filter(([, m]) => m.clearance < 0).map(([n]) => n);
    expect(blocked).toEqual([]);
  });

  test("a central seat scores better than the corner seat of the same row", () => {
    const row = hall.rows[Math.floor(hall.rows.length / 2)];
    const centre = row.seats.reduce((b, s) => (Math.abs(s.x) < Math.abs(b.x) ? s : b));
    const corner = row.seats[0];
    expect(metrics.get(centre.seatNumber).score).toBeGreaterThan(metrics.get(corner.seatNumber).score);
  });

  test("accessibility comes from the layout and marks real seats", () => {
    expect(hall.accessibility.configured).toBe(true);
    const wc = hall.accessibility.wheelchair.map((n) => hall.seatIndex.get(n));
    wc.forEach((s) => {
      expect(s.wheelchair).toBe(true);
      expect(s.aisleSeat).toBe(true);
    });
    const door = nearestDoor(hall, wc[0], { accessibleOnly: true });
    expect(door.door.accessible).toBe(true);
  });

  test("walk mode: start is walkable, seats and walls are blocked, and a route reaches any seat's aisle", () => {
    const area = walkArea(hall);
    const start = startPoint(area);
    expect(isWalkable(area, start.x, start.z)).toBe(true);
    // Standing on a seat or outside the walls is not allowed.
    const seat = hall.rows[Math.floor(hall.rows.length / 2)].seats[2];
    expect(isWalkable(area, seat.x, seat.z)).toBe(false);
    expect(isWalkable(area, hall.room.width, start.z)).toBe(false);
    // Walking sideways into a seat row from an aisle is stopped.
    const band = area.bands[3];
    const aisle = band.corridors[0];
    const moved = step(area, aisle.x, (band.zMin + band.zMax) / 2, 3, 0);
    expect(Math.abs(moved.x - aisle.x)).toBeLessThan(aisle.half + 0.01);
    // Every waypoint of a route to a far seat is walkable.
    // The back row (behind any cross-aisle) is reachable on the single floor.
    const target = hall.rows[hall.rows.length - 1].seats[0];
    const route = routeToSeat(area, start, target);
    expect(route.length).toBeGreaterThan(0);
    route.forEach((p) => expect(isWalkable(area, p.x, p.z)).toBe(true));
    expect(Math.abs(route[route.length - 1].z - target.z)).toBeLessThan(0.01);
    expect(describePosition(area, route[route.length - 1].x, target.z)).toMatch(/^Row /);
    expect(floorAt(area, target.z)).toBeCloseTo(target.floorY);
    // Every seat in the hall has a walkable route to its aisle.
    hall.rows.forEach((r) => expect(routeToSeat(area, start, r.seats[Math.floor(r.seats.length / 2)]).length).toBeGreaterThan(0));
    // Cross-aisles are walkable from wall to wall, at the floor height of the row in front.
    (hall.crossAisles || []).forEach((c) => {
      const z = (c.zMin + c.zMax) / 2;
      expect(isWalkable(area, area.xLimit - 0.1, z)).toBe(true);
      expect(isWalkable(area, 0, z)).toBe(true);
      expect(floorAt(area, z)).toBeCloseTo(c.floorY);
    });
  });

  test("speaker layout stays inside the room", () => {
    const { speakers, sweetSpot } = speakerLayout(hall);
    expect(speakers.filter((s) => s.kind === "centre")).toHaveLength(1);
    speakers.forEach(({ position: [x, y, z] }) => {
      expect(Math.abs(x)).toBeLessThanOrEqual(hall.room.width / 2);
      expect(y).toBeLessThanOrEqual(hall.room.height);
      expect(z).toBeLessThanOrEqual(Math.max(hall.room.depth, hall.rows[hall.rows.length - 1].z + 3));
    });
    expect(sweetSpot.z).toBeGreaterThan(hall.rows[0].z);
  });
});

describe.each(GRAND_CAPACITIES)("grand-%i viewing geometry", (capacity) => {
  const hall = hallFor(`grand-${capacity}`);
  const m = [...seatMetrics(hall).values()];
  test("every seat can see the screen comfortably", () => {
    const report = {
      distance: [Math.min(...m.map((x) => x.distance)), Math.max(...m.map((x) => x.distance))],
      maxOffCentre: Math.max(...m.map((x) => x.offCentre)),
      screenFills: [Math.min(...m.map((x) => x.screenWidthAngle)), Math.max(...m.map((x) => x.screenWidthAngle))],
      maxLookUp: Math.max(...m.map((x) => x.verticalAngle)),
      blockedSightlines: m.filter((x) => x.clearance < 0).length,
      goodSeats: m.filter((x) => x.score >= 60).length,
    };
    console.log(`grand-${capacity} ${JSON.stringify(report)}`);
    expect(report.maxOffCentre).toBeLessThanOrEqual(45);
    expect(report.screenFills[0]).toBeGreaterThanOrEqual(30); // SMPTE minimum, even from the back
    expect(report.maxLookUp).toBeLessThanOrEqual(35);
    expect(report.blockedSightlines).toBe(0); // the rake clears the head in front everywhere
    expect(report.goodSeats / m.length).toBeGreaterThan(0.6);
  });
});

describe("recommendations", () => {
  test("best overall picks adjacent free seats in one block, with a geometry-based explanation", () => {
    const hall = hallFor("multiplex-400");
    const { options } = recommendSeats(hall, { mode: "best", count: 3 });
    expect(options.length).toBe(3);
    const [best] = options;
    expect(best.seats).toHaveLength(3);
    best.seats.forEach((s, i) => {
      if (i) {
        expect(s.index).toBe(best.seats[i - 1].index + 1);
        expect(s.aisleBefore).toBe(false);
      }
    });
    expect(best.explanation).toMatch(/^Row [A-Z], Seats \d+–\d+ — /);
    expect(best.explanation).not.toMatch(/AI/);
    // Options don't share seats.
    const all = options.flatMap((o) => o.seatNumbers);
    expect(new Set(all).size).toBe(all.length);
  });

  test("never recommends a booked or held seat", () => {
    const clean = hallFor("multiplex-300");
    const top = recommendSeats(clean, { mode: "best", count: 2 }).options[0].seatNumbers;
    const hall = hallFor("multiplex-300", top);
    const again = recommendSeats(hall, { mode: "best", count: 2 }).options;
    again.forEach((o) => o.seats.forEach((s) => expect(s.isBooked).toBe(false)));
    expect(again[0].seatNumbers).not.toEqual(top);
  });

  test("closest and further sort by real distance; value prefers cheaper seats", () => {
    const hall = hallFor("multiplex-350");
    const m = seatMetrics(hall);
    const near = recommendSeats(hall, { mode: "closest", count: 1 }).options[0];
    const far = recommendSeats(hall, { mode: "further", count: 1 }).options[0];
    expect(m.get(near.seatNumbers[0]).distance).toBeLessThan(m.get(far.seatNumbers[0]).distance);
    const value = recommendSeats(hall, { mode: "value", count: 2 }).options[0];
    const best = recommendSeats(hall, { mode: "best", count: 2 }).options[0];
    expect(value.price).toBeLessThanOrEqual(best.price);
  });

  test("premium only returns premium seats; accessible returns wheelchair spaces with companions", () => {
    const hall = hallFor("classic-136");
    const premium = recommendSeats(hall, { mode: "premium", count: 2, premiumCategory: "Balcony" }).options;
    premium.forEach((o) => o.seats.forEach((s) => expect(s.category === "Balcony" || s.seatType === "recliner").toBe(true)));
    const acc = recommendSeats(hall, { mode: "accessible", count: 2 }).options;
    expect(acc[0].seats[0].wheelchair || acc[0].seats[1].wheelchair).toBe(true);
    expect(acc[0].seats.some((s) => s.companion)).toBe(true);
  });

  test("a group too large for any block gets a clear message", () => {
    const hall = hallFor("classic-136");
    const r = recommendSeats(hall, { mode: "best", count: 10 });
    expect(r.options).toHaveLength(0);
    expect(r.message).toMatch(/aren't 10 free seats together/);
  });
});

describe("heatmaps and comparison", () => {
  const hall = hallFor("multiplex-450", ["A1"]);
  test.each(["score", "angle", "distance", "price", "sound", "category"])("%s colours every seat and has a legend", (mode) => {
    const { colors, legend } = heatmap(hall, mode);
    expect(colors.size).toBe(hall.seatCount);
    expect(legend.label).toBeTruthy();
    colors.forEach((c) => expect(c).toMatch(/^#[0-9a-f]{6}$/i));
  });
  test("availability mode leaves the normal seat states alone", () => {
    expect(heatmap(hall, "availability").colors).toBeNull();
  });
  test("compare returns up to three seats with real numbers", () => {
    const rows = compareSeats(hall, ["A1", "M10", "Y2", "B3"]);
    expect(rows).toHaveLength(3);
    expect(rows[0].available).toBe(false);
    rows.forEach((r) => expect(r.distance).toBeGreaterThan(0));
    expect(rows[0].clearance).toBeNull(); // front row: nobody in front
  });
  test("describeView mentions the screen size relative to the ideal", () => {
    const m = { screenWidthAngle: IDEAL_SCREEN_ANGLE, offCentre: 2, clearance: 0.2, verticalAngle: 5 };
    expect(describeView(m)).toEqual(["a balanced screen size", "central screen alignment", "a clear sightline over the row in front"]);
  });
});
