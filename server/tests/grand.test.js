// Single-level Grand halls (600–800 seats): layout correctness, comfort
// dimensions, and that holds and bookings work on their seats like any other.
const request = require("supertest");
const { startDb, stopDb, clearDb, createUser, createMovie } = require("./helpers");
const Show = require("../models/Show");
const {
  getLayout,
  listLayouts,
  generateSeatsFromLayout,
  seatsFitLayout,
  GRAND_CAPACITIES,
  NEW_SHOW_LAYOUT_ID,
  buildCustomLayout,
  customLayoutError,
} = require("../utils/auditoriumLayouts");

const PRICES = { balconyPrice: 520, firstClassPrice: 340, secondClassPrice: 220 };
const SEAT_NUMBER_RE = /^[A-Z]{1,2}\d{1,3}$/;

test("no hall has a balcony or upper tier", () => {
  listLayouts().forEach(({ id }) => {
    const layout = getLayout(id);
    layout.rows.forEach((r) => expect(r.tier).toBe("stalls"));
    expect(layout.geometry.balcony).toBeUndefined();
    expect(layout.name).not.toMatch(/balcony/i);
  });
});

test("new showtimes default to the largest hall", () => {
  expect(NEW_SHOW_LAYOUT_ID).toBe(`grand-${Math.max(...GRAND_CAPACITIES)}`);
});

describe.each(GRAND_CAPACITIES)("grand-%i", (capacity) => {
  const layout = getLayout(`grand-${capacity}`);
  const seats = generateSeatsFromLayout(layout, PRICES);

  test("exact capacity; every seat has a unique, bookable id and matches the layout", () => {
    expect(layout.totalSeats).toBe(capacity);
    expect(seats).toHaveLength(capacity);
    expect(new Set(seats.map((s) => s.seatNumber)).size).toBe(capacity);
    seats.forEach((s) => expect(s.seatNumber).toMatch(SEAT_NUMBER_RE));
    expect(seatsFitLayout(seats, layout)).toBe(true);
  });

  test("25 rows, three blocks with straight aisles, premium recliners at the back", () => {
    expect(layout.rows).toHaveLength(25);
    expect(layout.rows.map((r) => r.label)).not.toContain("I");
    const std = layout.rows.filter((r) => r.seatType === "standard");
    expect(new Set(std.slice(1).map((r) => r.blocks[1])).size).toBe(1); // same centre block width
    layout.rows.forEach((r) => {
      expect(r.blocks).toHaveLength(3);
      expect(r.blocks[0]).toBe(r.blocks[2]); // symmetric
      expect(r.blocks.reduce((a, b) => a + b, 0)).toBe(r.seats);
    });
    const back = layout.rows.slice(-2);
    back.forEach((r) => expect(r).toMatchObject({ seatType: "recliner", section: "Balcony" }));
  });

  test("realistic comfort and space: seat widths, row pitch, walkways, screen and first-row distance", () => {
    const g = layout.geometry;
    expect(g.seatWidth.standard).toBeGreaterThanOrEqual(0.6);
    expect(g.rowPitch.standard).toBeGreaterThanOrEqual(1.1);
    expect(g.rowPitch.recliner).toBeGreaterThanOrEqual(1.6);
    expect(g.sideAisleWidth).toBeGreaterThanOrEqual(2);
    expect(g.aisleWidth).toBeGreaterThanOrEqual(1.2);
    const ratio = layout.screen.width / layout.room.width;
    expect(ratio).toBeGreaterThanOrEqual(0.84 - 0.005);
    expect(ratio).toBeLessThanOrEqual(0.92 + 0.005);
    // First row at least ~0.4 screen widths back, so the screen fits the view.
    expect(g.stalls.firstRowDistance).toBeGreaterThanOrEqual(layout.screen.width * 0.4);
  });

  test("a level cross-aisle mid-hall with exits at both ends, plus step-free front doors and wheelchair spaces", () => {
    const crossRows = layout.rows.filter((r) => r.crossAisleBefore);
    expect(crossRows).toHaveLength(1);
    expect(layout.doors.filter((d) => d.id.startsWith("mid"))).toHaveLength(2);
    expect(layout.doors).toHaveLength(6);
    expect(layout.doors.filter((d) => d.accessible).length).toBeGreaterThan(0);
    const ids = new Set(seats.map((s) => s.seatNumber));
    [...layout.accessibility.wheelchair, ...layout.accessibility.companion].forEach((n) => expect(ids.has(n)).toBe(true));
    expect(layout.rows[0].riser).toBe(0);
  });
});

describe("custom halls with a cross-aisle", () => {
  const rows = Array.from({ length: 12 }, (_, i) => ({ blocks: [5, 12, 5], section: i < 4 ? "Second Class" : "First Class" }));
  test("a cross-aisle adds exits and needs rows on both sides", () => {
    const layout = buildCustomLayout({ name: "Studio X", rows, crossAisleBefore: 6 });
    expect(layout.rows[6].crossAisleBefore).toBe(true);
    expect(layout.doors.map((d) => d.id)).toEqual(expect.arrayContaining(["mid-left", "mid-right"]));
    expect(customLayoutError({ name: "Studio X", rows, crossAisleBefore: 1 })).toMatch(/cross-aisle/);
    expect(customLayoutError({ name: "Studio X", rows, crossAisleBefore: 11 })).toMatch(/cross-aisle/);
    expect(customLayoutError({ name: "Studio X", rows, crossAisleBefore: "6" })).toMatch(/cross-aisle/);
  });
  test("custom halls can now hold up to 900 seats", () => {
    const big = Array.from({ length: 25 }, () => ({ blocks: [8, 20, 8], section: "First Class" }));
    expect(customLayoutError({ name: "Huge", rows: big })).toBeNull(); // 900 seats
    const tooBig = Array.from({ length: 25 }, () => ({ blocks: [8, 21, 8], section: "First Class" }));
    expect(customLayoutError({ name: "Huge", rows: tooBig })).toMatch(/900/);
  });
});

describe("booking in the 800-seat hall", () => {
  let app;
  beforeAll(async () => {
    app = await startDb();
  });
  afterAll(stopDb);
  afterEach(clearDb);

  test("default new showtime is 800 seats; holds conflict and booking works on the back recliners", async () => {
    const admin = await createUser("admin");
    const a = await createUser("user");
    const b = await createUser("user");
    const movie = await createMovie();
    const created = await request(app)
      .post("/api/shows")
      .set("Authorization", admin.auth)
      .send({ movieId: String(movie._id), theatre: "Grand", date: "2030-06-01", time: "20:00", ...PRICES });
    expect(created.status).toBe(201);
    expect(created.body.seats).toHaveLength(800);
    const showId = created.body._id;
    const last = getLayout("grand-800").rows.at(-1);
    const seat = `${last.label}${Math.ceil(last.seats / 2)}`;

    expect((await request(app).post(`/api/shows/${showId}/holds`).set("Authorization", a.auth).send({ seats: [seat] })).status).toBe(200);
    const clash = await request(app).post(`/api/shows/${showId}/holds`).set("Authorization", b.auth).send({ seats: [seat] });
    expect(clash.status).toBe(409);

    const booked = await request(app).post("/api/bookings").set("Authorization", a.auth).send({ showId, seats: [seat] });
    expect(booked.status).toBe(201);
    expect(booked.body.totalPrice).toBe(PRICES.balconyPrice);
    const show = await Show.findById(showId).lean();
    expect(show.seats.find((s) => s.seatNumber === seat).isBooked).toBe(true);
    expect(show.seats.filter((s) => s.isBooked)).toHaveLength(1);
  });
});

describe("layout editor API with a cross-aisle", () => {
  let app;
  beforeAll(async () => {
    app = await startDb();
  });
  afterAll(stopDb);
  afterEach(clearDb);

  test("preview and save keep the cross-aisle and its exits; invalid positions are refused", async () => {
    const { auth } = await createUser("admin");
    const rows = Array.from({ length: 14 }, (_, i) => ({ blocks: [6, 14, 6], section: i < 4 ? "Second Class" : i > 11 ? "Balcony" : "First Class", seatType: i > 11 ? "recliner" : "standard" }));
    const spec = { name: "Big Studio", rows, crossAisleBefore: 7 };
    const preview = await request(app).post("/api/layouts/preview").set("Authorization", auth).send(spec);
    expect(preview.status).toBe(200);
    expect(preview.body.rows[7].crossAisleBefore).toBe(true);
    expect(preview.body.doors).toHaveLength(6);
    expect(preview.body.totalSeats).toBe(14 * 26);
    expect((await request(app).post("/api/layouts/preview").set("Authorization", auth).send({ ...spec, crossAisleBefore: 13 })).status).toBe(400);
    const saved = await request(app).post("/api/layouts").set("Authorization", auth).send(spec);
    expect(saved.status).toBe(201);
    expect((await request(app).get(`/api/layouts/${saved.body.id}`)).body.rows[7].crossAisleBefore).toBe(true);
  });
});
