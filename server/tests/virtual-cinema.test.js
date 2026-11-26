// Virtual Cinema 2.0 backend: hall accessibility and doors, the admin layout
// editor, venue wayfinding, booking price snapshots and reconciled analytics.
const request = require("supertest");
const { startDb, stopDb, clearDb, createUser, createMovie, createShow, createMenu } = require("./helpers");
const Show = require("../models/Show");
const Booking = require("../models/Booking");
const { getLayout, buildCustomLayout, customLayoutError, withOrder, MULTIPLEX_CAPACITIES, generateSeatsFromLayout, seatsFitLayout, layoutForShow } = require("../utils/auditoriumLayouts");
const { bookingFigures, summarize } = require("../utils/revenue");

let app;
beforeAll(async () => {
  app = await startDb();
});
afterAll(stopDb);
afterEach(clearDb);

const PRICES = { balconyPrice: 420, firstClassPrice: 300, secondClassPrice: 180 };
const SPEC = {
  name: "Studio 7",
  rows: [
    { blocks: [3, 6, 3], section: "Second Class" },
    { blocks: [3, 6, 3], section: "Second Class" },
    { blocks: [4, 6, 4], section: "First Class" },
    { blocks: [2, 4], section: "Balcony", seatType: "recliner" },
  ],
};

describe("hall accessibility and doors", () => {
  test.each(["classic-136", ...MULTIPLEX_CAPACITIES.map((c) => `multiplex-${c}`)])("%s: every configured space is a real seat on a flat row", (id) => {
    const layout = getLayout(id);
    const seats = new Set(generateSeatsFromLayout(layout, PRICES).map((s) => s.seatNumber));
    const { wheelchair, companion } = layout.accessibility;
    expect(wheelchair.length).toBeGreaterThan(0);
    [...wheelchair, ...companion].forEach((n) => expect(seats.has(n)).toBe(true));
    // Wheelchair rows are on the floor level (no riser), next to a step-free door.
    const rowLabel = wheelchair[0].replace(/\d+$/, "");
    const row = layout.rows.find((r) => r.label === rowLabel);
    expect(row.tier).toBe("stalls");
    expect(row.riser || 0).toBe(0);
    expect(layout.doors.some((d) => d.accessible)).toBe(true);
    layout.doors.forEach((d) => {
      expect(["left", "right"]).toContain(d.side);
      expect(d.z).toBeGreaterThan(0);
      expect(d.z).toBeLessThan(layout.room.depth + 1);
    });
  });

  test("a show whose seats don't match any template gets no invented accessibility or doors", async () => {
    const show = await createShow();
    const layout = layoutForShow(show);
    expect(layout.id).toBe("derived");
    expect(layout.doors).toEqual([]);
    expect(layout.accessibility.wheelchair).toEqual([]);
  });
});

describe("custom layout builder", () => {
  test("builds rows, aisles, rake and seats from the spec", () => {
    const layout = withOrder(buildCustomLayout(SPEC, "custom-test"));
    expect(layout.totalSeats).toBe(12 + 12 + 14 + 6);
    expect(layout.rows.map((r) => r.label)).toEqual(["A", "B", "C", "D"]);
    expect(layout.rows[0].aisleAfter).toEqual([3, 9]);
    expect(layout.rows[3].aisleAfter).toEqual([2]);
    expect(layout.rows[3].seatType).toBe("recliner");
    expect(layout.rows[0].riser).toBe(0);
    expect(layout.rows[3].riser).toBeGreaterThan(0);
    const seats = generateSeatsFromLayout(layout, PRICES);
    expect(seatsFitLayout(seats, layout)).toBe(true);
    expect(layout.accessibility.wheelchair).toEqual(["A1", "A12"]);
  });

  test.each([
    [{ ...SPEC, name: "x" }, /name/],
    [{ ...SPEC, rows: [] }, /at least one row/],
    [{ ...SPEC, rows: [{ blocks: [1, 2, 3, 4], section: "First Class" }] }, /1 to 3/],
    [{ ...SPEC, rows: [{ blocks: [0], section: "First Class" }] }, /1 to 24/],
    [{ ...SPEC, rows: [{ blocks: [5], section: "VIP" }] }, /category/],
    [{ ...SPEC, rows: Array.from({ length: 26 }, () => ({ blocks: [2], section: "First Class" })) }, /25 rows/],
    [{ ...SPEC, rows: Array.from({ length: 25 }, () => ({ blocks: [24, 24], section: "First Class" })) }, /600 seats/],
  ])("rejects invalid specs (%#)", (spec, msg) => {
    expect(customLayoutError(spec)).toMatch(msg);
  });

  test("wheelchair spaces can be switched off", () => {
    const layout = buildCustomLayout({ ...SPEC, wheelchairSpaces: false });
    expect(layout.accessibility.wheelchair).toEqual([]);
  });
});

describe("layout editor API", () => {
  test("only staff can list, preview, save or remove layouts", async () => {
    const { auth } = await createUser("user");
    expect((await request(app).get("/api/layouts")).status).toBe(401);
    expect((await request(app).get("/api/layouts").set("Authorization", auth)).status).toBe(403);
    expect((await request(app).post("/api/layouts/preview").set("Authorization", auth).send(SPEC)).status).toBe(403);
    expect((await request(app).post("/api/layouts").set("Authorization", auth).send(SPEC)).status).toBe(403);
  });

  test("preview builds without saving; save, schedule a show, then removal is blocked", async () => {
    const { auth } = await createUser("admin");
    const preview = await request(app).post("/api/layouts/preview").set("Authorization", auth).send(SPEC);
    expect(preview.status).toBe(200);
    expect(preview.body.totalSeats).toBe(44);
    let list = await request(app).get("/api/layouts").set("Authorization", auth);
    expect(list.body.some((l) => l.custom)).toBe(false);

    const bad = await request(app).post("/api/layouts/preview").set("Authorization", auth).send({ ...SPEC, rows: [{ blocks: [99], section: "First Class" }] });
    expect(bad.status).toBe(400);

    const saved = await request(app).post("/api/layouts").set("Authorization", auth).send(SPEC);
    expect(saved.status).toBe(201);
    const id = saved.body.id;
    expect(id).toMatch(/^custom-studio-7-[0-9a-f]{6}$/);
    list = await request(app).get("/api/layouts").set("Authorization", auth);
    expect(list.body.find((l) => l.id === id)).toMatchObject({ custom: true, totalSeats: 44, shows: 0 });
    expect((await request(app).get(`/api/layouts/${id}`)).body.rows).toHaveLength(4);

    const movie = await createMovie();
    const show = await request(app)
      .post("/api/shows")
      .set("Authorization", auth)
      .send({ movieId: String(movie._id), theatre: "Studio Cinemas", date: "2027-05-01", time: "19:00", screenName: "Audi 7", layoutId: id, ...PRICES });
    expect(show.status).toBe(201);
    expect(show.body.seats).toHaveLength(44);
    expect(show.body.screenName).toBe("Audi 7");
    // After a server restart the in-memory registry is empty: the hall is read back from the database.
    require("../utils/auditoriumLayouts").setCustomLayouts([]);
    const single = await request(app).get(`/api/shows/single/${show.body._id}`);
    expect(single.body.layout.id).toBe(id);
    expect(single.body.layout.accessibility.wheelchair).toEqual(["A1", "A12"]);

    const blocked = await request(app).delete(`/api/layouts/${id}`).set("Authorization", auth);
    expect(blocked.status).toBe(409);
    await Show.deleteMany({});
    expect((await request(app).delete(`/api/layouts/${id}`).set("Authorization", auth)).status).toBe(200);
    expect((await request(app).get(`/api/layouts/${id}`)).status).toBe(404);
  });

  test("built-in halls can't be removed", async () => {
    const { auth } = await createUser("admin");
    expect((await request(app).delete("/api/layouts/multiplex-300").set("Authorization", auth)).status).toBe(400);
  });
});

describe("venue wayfinding", () => {
  const VENUE = {
    name: "IMAX",
    address: "1 Cinema Road",
    mapUrl: "https://maps.example.com/imax",
    entryInstructions: "Show your QR code at the main gate.",
    points: [
      { kind: "entrance", label: "Main gate", directions: "Ground floor, facing the car park" },
      { kind: "food", label: "Snack counter", directions: "Level 1, opposite Audi 2" },
    ],
  };

  test("staff create and edit; anyone can look up by theatre name (case-insensitive)", async () => {
    const { auth } = await createUser("admin");
    const created = await request(app).post("/api/venues").set("Authorization", auth).send(VENUE);
    expect(created.status).toBe(201);
    expect((await request(app).post("/api/venues").set("Authorization", auth).send(VENUE)).status).toBe(409);

    const found = await request(app).get("/api/venues/lookup").query({ theatre: "imax" });
    expect(found.status).toBe(200);
    expect(found.body.venue.points).toHaveLength(2);
    expect(found.body.venue.key).toBeUndefined();

    const edited = await request(app)
      .put(`/api/venues/${created.body._id}`)
      .set("Authorization", auth)
      .send({ ...VENUE, points: [...VENUE.points, { kind: "restroom", label: "Restrooms" }] });
    expect(edited.status).toBe(200);
    expect(edited.body.points).toHaveLength(3);
    expect((await request(app).delete(`/api/venues/${created.body._id}`).set("Authorization", auth)).status).toBe(200);
    expect((await request(app).get("/api/venues/lookup").query({ theatre: "IMAX" })).body).toEqual({ venue: null });
  });

  test("customers can't write venues, and input is validated", async () => {
    const user = await createUser("user");
    expect((await request(app).post("/api/venues").set("Authorization", user.auth).send(VENUE)).status).toBe(403);
    const { auth } = await createUser("admin");
    const bad = async (body) => (await request(app).post("/api/venues").set("Authorization", auth).send(body)).status;
    expect(await bad({ ...VENUE, mapUrl: "javascript:alert(1)" })).toBe(400);
    expect(await bad({ ...VENUE, points: [{ kind: "secret-room", label: "X" }] })).toBe(400);
    expect(await bad({ ...VENUE, points: [{ kind: "food", label: "" }] })).toBe(400);
    expect(await bad({ ...VENUE, name: "" })).toBe(400);
    expect(await bad({ ...VENUE, name: { $gt: "" } })).toBe(400);
  });
});

describe("booking price snapshot and reconciled analytics", () => {
  test("a booking stores what was charged; later price changes don't alter analytics", async () => {
    const customer = await createUser("user");
    const admin = await createUser("admin");
    const show = await createShow();
    const { popcorn } = await createMenu();

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", customer.auth)
      .send({ showId: String(show._id), seats: ["A1", "E2"], snacks: [{ snackId: String(popcorn._id), qty: 2 }], couponCode: "CINE50" });
    expect(res.status).toBe(201);
    const booking = await Booking.findById(res.body._id).lean();
    expect(booking.pricing).toMatchObject({ seatTotal: 500, snacksTotal: 500, parkingTotal: 0, subtotal: 1000, discount: 50, total: 950 });
    expect(booking.pricing.seats).toEqual([
      { seatNumber: "A1", category: "Balcony", price: 300 },
      { seatNumber: "E2", category: "First Class", price: 200 },
    ]);

    // The admin doubles the prices afterwards.
    expect((await request(app).put(`/api/shows/${show._id}`).set("Authorization", admin.auth).send({ balconyPrice: 600, firstClassPrice: 400 })).status).toBe(200);

    const a = (await request(app).get("/api/analytics").set("Authorization", admin.auth)).body;
    expect(a.finance).toMatchObject({ gross: 1000, discounts: 50, refunds: 0, net: 950, demo: 950, collected: 0, refundsSupported: false });
    expect(a.finance.reconciliation).toMatchObject({ checked: 1, matched: 1, estimated: 0 });
    expect(a.finance.breakdown).toEqual({ tickets: 475, food: 475, parking: 0 });
    expect(a.movieStats[0]).toMatchObject({ ticketsSold: 2, ticketRevenue: 500, netTicketRevenue: 475 });
    expect(a.summary).toMatchObject({ totalTickets: 2, totalBookings: 1, totalRevenue: 950 });
    expect(a.categories.find((c) => c.category === "Balcony")).toMatchObject({ ticketsSold: 1, gross: 300 });
    expect(a.occupancy).toMatchObject({ shows: 1, seats: 15, booked: 2 });
    expect(a.food.items[0]).toMatchObject({ name: "Popcorn", qty: 2, withTickets: 2 });
    expect(a.trend).toHaveLength(1);
  });

  test("legacy bookings without a snapshot are estimated from the show; pending ones aren't revenue", () => {
    const show = { _id: "s1", movieId: "m1", theatre: "IMAX", seats: [{ seatNumber: "A1", category: "Balcony", price: 300 }] };
    const legacy = { _id: "b1", showId: "s1", seats: ["A1"], snacks: [], totalPrice: 300, discountAmount: 0, paymentStatus: "Success", createdAt: new Date("2026-01-02") };
    const pending = { _id: "b2", showId: "s1", seats: ["A1"], totalPrice: 300, paymentStatus: "Pending", createdAt: new Date("2026-01-02") };
    const f = bookingFigures(legacy, show);
    expect(f).toMatchObject({ estimated: true, seatTotal: 300, gross: 300, net: 300, reconciled: true });
    const r = summarize([legacy, pending], new Map([["s1", show]]), new Map([["m1", { title: "Film" }]]));
    expect(r.finance).toMatchObject({ gross: 300, net: 300, collected: 300, demo: 0 });
    expect(r.finance.bookings).toMatchObject({ revenue: 1, paid: 1, pending: 1 });
    expect(r.finance.reconciliation.estimated).toBe(1);
  });

  test("a booking whose totals don't add up is reported as a mismatch", () => {
    const b = { _id: "b9", showId: "x", seats: ["A1"], totalPrice: 999, paymentStatus: "Demo", pricing: { seats: [{ seatNumber: "A1", category: "Balcony", price: 300 }], seatTotal: 300, snacksTotal: 0, parkingTotal: 0, subtotal: 300, discount: 0, total: 999 }, createdAt: new Date() };
    const r = summarize([b], new Map(), new Map());
    expect(r.finance.reconciliation).toMatchObject({ checked: 1, matched: 0, mismatched: ["b9"] });
  });
});

describe("admin promotions and review moderation", () => {
  test("staff create, list and switch off coupons; customers can't", async () => {
    const user = await createUser("user");
    const { auth } = await createUser("admin");
    expect((await request(app).post("/api/coupons").set("Authorization", user.auth).send({ code: "X100" })).status).toBe(403);
    const bad = await request(app).post("/api/coupons").set("Authorization", auth).send({ code: "SPRING", discountType: "PERCENTAGE", discountValue: 95 });
    expect(bad.status).toBe(400);
    const made = await request(app).post("/api/coupons").set("Authorization", auth).send({ code: "spring25", discountType: "PERCENTAGE", discountValue: 25, minBookingAmount: 100 });
    expect(made.status).toBe(201);
    expect(made.body.code).toBe("SPRING25");
    expect((await request(app).post("/api/coupons").set("Authorization", auth).send({ code: "SPRING25", discountType: "FIXED", discountValue: 5 })).status).toBe(409);
    const list = await request(app).get("/api/coupons/admin").set("Authorization", auth);
    expect(list.body.saved).toHaveLength(1);
    expect(list.body.builtIn.length).toBeGreaterThan(0);
    const valid = await request(app).post("/api/coupons/validate").send({ code: "SPRING25", totalAmount: 400 });
    expect(valid.body.discountAmount).toBe(100);
    expect((await request(app).put(`/api/coupons/${made.body._id}/active`).set("Authorization", auth).send({ isActive: false })).status).toBe(200);
    expect((await request(app).post("/api/coupons/validate").send({ code: "SPRING25", totalAmount: 400 })).status).toBe(404);
  });

  test("staff can list and remove reviews; customers can't remove them", async () => {
    const customer = await createUser("user");
    const { auth } = await createUser("admin");
    const movie = await createMovie();
    const posted = await request(app).post("/api/reviews").set("Authorization", customer.auth).send({ movieId: String(movie._id), rating: 4, comment: "Great film" });
    expect(posted.status).toBeLessThan(300);
    const list = await request(app).get("/api/reviews/admin/recent").set("Authorization", auth);
    expect(list.body).toHaveLength(1);
    const id = list.body[0]._id;
    expect((await request(app).delete(`/api/reviews/${id}`).set("Authorization", customer.auth)).status).toBe(403);
    expect((await request(app).delete(`/api/reviews/${id}`).set("Authorization", auth)).status).toBe(200);
    expect((await request(app).get("/api/reviews/admin/recent").set("Authorization", auth)).body).toHaveLength(0);
  });
});
