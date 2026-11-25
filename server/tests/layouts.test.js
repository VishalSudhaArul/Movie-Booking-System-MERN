const request = require("supertest");
const { startDb, stopDb, clearDb, createUser, createMovie, createShow } = require("./helpers");
const Show = require("../models/Show");
const {
  getLayout,
  generateSeatsFromLayout,
  layoutForShow,
  seatsFitLayout,
  deriveLayout,
} = require("../utils/auditoriumLayouts");

// Exact copy of the seat generator used before layouts existed. New shows must
// get identical seats so existing data, prices and bookings stay compatible.
const legacyGenerateSeats = (balconyPrice, firstPrice, secondPrice) => {
  const seats = [];
  ["A", "B", "C", "D"].forEach((row) => {
    for (let i = 1; i <= 10; i++) seats.push({ seatNumber: `${row}${i}`, category: "Balcony", price: Number(balconyPrice), isBooked: false });
  });
  ["E", "F", "G", "H"].forEach((row) => {
    for (let i = 1; i <= 12; i++) seats.push({ seatNumber: `${row}${i}`, category: "First Class", price: Number(firstPrice), isBooked: false });
  });
  ["I", "J", "K", "L"].forEach((row) => {
    for (let i = 1; i <= 12; i++) seats.push({ seatNumber: `${row}${i}`, category: "Second Class", price: Number(secondPrice), isBooked: false });
  });
  return seats;
};

const PRICES = { balconyPrice: 350, firstClassPrice: 220, secondClassPrice: 150 };

describe("classic-136 template", () => {
  const layout = getLayout("classic-136");

  test("generates exactly the seats the old generator did, in the same order", () => {
    expect(generateSeatsFromLayout(layout, PRICES)).toEqual(legacyGenerateSeats(350, 220, 150));
  });

  test("is internally consistent", () => {
    expect(layout.totalSeats).toBe(136);
    expect(layout.rows.map((r) => r.order)).toEqual(layout.rows.map((_, i) => i));
    expect(new Set(layout.rows.map((r) => r.label)).size).toBe(layout.rows.length);
    const sectionNames = layout.sections.map((s) => s.name);
    layout.rows.forEach((r) => {
      expect(sectionNames).toContain(r.section);
      expect(["stalls", "balcony"]).toContain(r.tier);
      expect(["standard", "recliner"]).toContain(r.seatType);
      r.aisleAfter.forEach((a) => expect(a > 0 && a < r.seats).toBe(true));
    });
    // Nearest row first; the balcony is at the back.
    expect(layout.rows[0].label).toBe("L");
    expect(layout.rows.at(-1)).toMatchObject({ label: "A", tier: "balcony" });
  });

  test("every live-style show (no layoutId) maps to the classic template", () => {
    const show = { seats: legacyGenerateSeats(1, 1, 1) };
    expect(layoutForShow(show).id).toBe("classic-136");
  });
});

describe("fallback layouts", () => {
  test("seats that don't fit the template get a layout derived from the seats", () => {
    const seats = [
      ...["P1", "P2", "P3", "P4", "P5", "P6"].map((n) => ({ seatNumber: n, category: "First Class" })),
      ...["Q1", "Q2"].map((n) => ({ seatNumber: n, category: "Second Class" })),
    ];
    expect(seatsFitLayout(seats, getLayout("classic-136"))).toBe(false);
    const layout = layoutForShow({ seats });
    expect(layout.id).toBe("derived");
    expect(layout.rows.map((r) => [r.label, r.seats, r.order])).toEqual([
      ["Q", 2, 0],
      ["P", 6, 1],
    ]);
    expect(layout.rows[1].aisleAfter).toEqual([3]);
    expect(layout.totalSeats).toBe(8);
  });

  test("a show with only some of the template's seats doesn't get phantom seats", () => {
    const partial = legacyGenerateSeats(1, 1, 1).filter((s) => s.seatNumber !== "L12");
    const layout = layoutForShow({ seats: partial });
    expect(layout.id).toBe("derived");
    expect(layout.totalSeats).toBe(135);
  });

  test("a wrong category for a row also falls back instead of mislabelling", () => {
    const seats = legacyGenerateSeats(1, 1, 1).map((s) => (s.seatNumber === "A1" ? { ...s, category: "Second Class" } : s));
    expect(layoutForShow({ seats }).id).toBe("derived");
  });

  test("double-letter rows sort after single letters", () => {
    const layout = deriveLayout([
      { seatNumber: "AA1", category: "Balcony" },
      { seatNumber: "Z1", category: "Balcony" },
      { seatNumber: "A1", category: "Balcony" },
    ]);
    expect(layout.rows.map((r) => r.label)).toEqual(["Z", "A", "AA"]);
  });
});

describe("API", () => {
  let app;
  beforeAll(async () => {
    app = await startDb();
  });
  afterAll(stopDb);
  afterEach(clearDb);

  test("the seat map response includes the layout", async () => {
    const show = await createShow(); // test helper's small custom hall
    const res = await request(app).get(`/api/shows/single/${show._id}`);
    expect(res.status).toBe(200);
    expect(res.body.layout.rows.length).toBeGreaterThan(0);
    expect(res.body.layout.totalSeats).toBe(show.seats.length);
  });

  test("admins create shows from a layout; unknown layouts are refused", async () => {
    const { auth } = await createUser("admin");
    const movie = await createMovie();
    const body = { movieId: String(movie._id), theatre: "IMAX", date: "2027-02-01", time: "18:00", ...PRICES };

    const ok = await request(app).post("/api/shows").set("Authorization", auth).send(body);
    expect(ok.status).toBe(201);
    expect(ok.body.layoutId).toBe("classic-136");
    expect(ok.body.seats).toHaveLength(136);

    const map = await request(app).get(`/api/shows/single/${ok.body._id}`);
    expect(map.body.layout.id).toBe("classic-136");

    const bad = await request(app).post("/api/shows").set("Authorization", auth).send({ ...body, layoutId: "../../etc" });
    expect(bad.status).toBe(400);
  });

  test("a show stored before layouts existed (no layoutId) is served the classic layout", async () => {
    const movie = await createMovie();
    const legacy = await Show.create({
      movieId: movie._id, theatre: "KS", date: "2026-05-15", time: "10:00", ...PRICES,
      seats: legacyGenerateSeats(350, 220, 150),
    });
    await Show.collection.updateOne({ _id: legacy._id }, { $unset: { layoutId: "" } });
    const res = await request(app).get(`/api/shows/single/${legacy._id}`);
    expect(res.body.layout.id).toBe("classic-136");
  });

  test("the layout can't be changed by a show update", async () => {
    const { auth } = await createUser("admin");
    const show = await createShow();
    const res = await request(app).put(`/api/shows/${show._id}`).set("Authorization", auth).send({ layoutId: "classic-136", time: "21:00" });
    expect(res.status).toBe(200);
    expect(res.body.layoutId ?? null).toBeNull();
  });

  test("show times must be readable, so a show can't stay bookable after it starts", async () => {
    const { auth } = await createUser("admin");
    const movie = await createMovie();
    const body = { movieId: String(movie._id), theatre: "IMAX", date: "2027-02-01", ...PRICES };
    const post = (time) => request(app).post("/api/shows").set("Authorization", auth).send({ ...body, time });

    for (const time of ["18:00", "0:15", "6:30 PM", "12:00 AM", "9:05am"]) {
      expect((await post(time)).status).toBe(201);
    }
    for (const time of ["23:00 PM", "13:30 PM", "0:30 AM", "24:00", "6:3 PM"]) {
      expect((await post(time)).status).toBe(400);
    }
    const show = await createShow();
    const update = await request(app).put(`/api/shows/${show._id}`).set("Authorization", auth).send({ time: "15:00 PM" });
    expect(update.status).toBe(400);
  });

  test("GET /api/shows/layouts lists the available layouts", async () => {
    const res = await request(app).get("/api/shows/layouts");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: "classic-136", name: "Classic hall with balcony", totalSeats: 136 }]);
  });
});
