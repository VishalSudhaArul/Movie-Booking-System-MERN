import { buildAuditorium, viewingInfo, rowLabelOf, seatIndexOf } from "./auditorium";

// Same shape the server sends for the classic hall (geometry trimmed to what is used).
const layout = {
  id: "classic-136",
  name: "Classic hall with balcony",
  screen: { width: 14, height: 6, bottom: 1.4 },
  geometry: {
    seatWidth: { standard: 0.62, recliner: 0.9 },
    rowPitch: { standard: 1.1, recliner: 1.7 },
    aisleWidth: 1.3,
    eyeHeight: 1.15,
    stalls: { firstRowDistance: 5.5, riser: 0.17 },
    balcony: { gapBeforeFirstRow: 1.6, floorElevation: 4.2, riser: 0.32 },
  },
  rows: [
    ...["L", "K", "J", "I"].map((label) => ({ label, section: "Second Class", tier: "stalls", seatType: "standard", seats: 12, aisleAfter: [6] })),
    ...["H", "G", "F", "E"].map((label) => ({ label, section: "First Class", tier: "stalls", seatType: "standard", seats: 12, aisleAfter: [6] })),
    { label: "D", section: "Balcony", tier: "balcony", seatType: "standard", seats: 10, aisleAfter: [5] },
    { label: "C", section: "Balcony", tier: "balcony", seatType: "standard", seats: 10, aisleAfter: [5] },
    { label: "B", section: "Balcony", tier: "balcony", seatType: "recliner", seats: 10, aisleAfter: [5] },
    { label: "A", section: "Balcony", tier: "balcony", seatType: "recliner", seats: 10, aisleAfter: [5] },
  ].map((r, order) => ({ ...r, order })),
};

const allSeats = layout.rows.flatMap((r) =>
  Array.from({ length: r.seats }, (_, i) => ({ seatNumber: `${r.label}${i + 1}`, category: r.section }))
);

test("parses seat numbers", () => {
  expect(rowLabelOf("AA12")).toBe("AA");
  expect(seatIndexOf("AA12")).toBe(12);
  expect(rowLabelOf("b3")).toBe("B");
});

test("places every existing seat exactly once", () => {
  const hall = buildAuditorium(layout, allSeats);
  expect(hall.seatIndex.size).toBe(136);
  expect(hall.rows.map((r) => r.label)).toEqual(["L", "K", "J", "I", "H", "G", "F", "E", "D", "C", "B", "A"]);
});

test("rows get further from the screen and higher; the balcony is raised", () => {
  const hall = buildAuditorium(layout, allSeats);
  for (let i = 1; i < hall.rows.length; i++) {
    expect(hall.rows[i].z).toBeGreaterThan(hall.rows[i - 1].z);
    expect(hall.rows[i].floorY).toBeGreaterThan(hall.rows[i - 1].floorY);
  }
  const E = hall.rows.find((r) => r.label === "E");
  const D = hall.rows.find((r) => r.label === "D");
  expect(D.floorY).toBeGreaterThanOrEqual(4.2);
  expect(D.z - E.z).toBeCloseTo(1.1 + 1.6); // row pitch + balcony gap
});

test("seat 1 is at +x, seats are evenly spaced and the aisle opens a gap", () => {
  const hall = buildAuditorium(layout, allSeats);
  const s = (n) => hall.seatIndex.get(n);
  expect(s("H1").x).toBeGreaterThan(0);
  expect(s("H12").x).toBeLessThan(0);
  expect(s("H1").x - s("H2").x).toBeCloseTo(0.62);
  expect(s("H6").x - s("H7").x).toBeCloseTo(0.62 + 1.3);
  expect(s("H7").aisleBefore).toBe(true);
  expect(s("H6").aisleBefore).toBe(false);
  // Rows are centred.
  expect(s("H1").x).toBeCloseTo(-s("H12").x);
  // Recliners are wider.
  expect(s("A1").seatWidth).toBe(0.9);
});

test("only existing seats are placed (no phantom seats in gaps)", () => {
  const hall = buildAuditorium(layout, allSeats.filter((s) => s.seatNumber !== "F5"));
  expect(hall.seatIndex.has("F5")).toBe(false);
  // Neighbours keep their real positions.
  const full = buildAuditorium(layout, allSeats);
  expect(hall.seatIndex.get("F6").x).toBeCloseTo(full.seatIndex.get("F6").x);
});

test("viewing info: centre seats look straight ahead; front rows see a wider screen", () => {
  const hall = buildAuditorium(layout, allSeats);
  const front = viewingInfo(hall.seatIndex.get("L6"), layout.screen);
  const back = viewingInfo(hall.seatIndex.get("E6"), layout.screen);
  const side = viewingInfo(hall.seatIndex.get("H1"), layout.screen);

  // The aisle runs down the middle, so the two seats beside it mirror each other.
  const otherSide = viewingInfo(hall.seatIndex.get("L7"), layout.screen);
  expect(front.horizontalAngle).toBeCloseTo(-otherSide.horizontalAngle);
  expect(Math.abs(front.horizontalAngle)).toBeLessThan(Math.abs(viewingInfo(hall.seatIndex.get("L1"), layout.screen).horizontalAngle));
  expect(front.screenWidthAngle).toBeGreaterThan(back.screenWidthAngle);
  expect(front.distance).toBeLessThan(back.distance);
  expect(side.horizontalAngle).toBeGreaterThan(10);
  expect(front.verticalAngle).toBeGreaterThan(0); // front row looks up
  expect(viewingInfo(hall.seatIndex.get("A5"), layout.screen).verticalAngle).toBeLessThan(0); // balcony looks down
  expect(typeof front.viewLabel).toBe("string");
});

test("returns null without a layout", () => {
  expect(buildAuditorium(null, allSeats)).toBeNull();
});
