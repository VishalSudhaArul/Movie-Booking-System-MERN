// Multiplex halls (300–500 seats): the layouts, and that their seats work with
// shows, holds and bookings exactly like the classic hall's.
const request = require("supertest");
const { startDb, stopDb, clearDb, createUser, createMovie, createShow } = require("./helpers");
const Show = require("../models/Show");
const Booking = require("../models/Booking");
const {
  getLayout,
  generateSeatsFromLayout,
  seatsFitLayout,
  layoutForShow,
  MULTIPLEX_CAPACITIES,
} = require("../utils/auditoriumLayouts");

const PRICES = { balconyPrice: 420, firstClassPrice: 300, secondClassPrice: 180 };
const SEAT_NUMBER_RE = /^[A-Z]{1,2}\d{1,3}$/; // what holds and bookings accept

describe.each(MULTIPLEX_CAPACITIES)("multiplex-%i layout", (capacity) => {
  const layout = getLayout(`multiplex-${capacity}`);
  const seats = generateSeatsFromLayout(layout, PRICES);

  test("has exactly the configured number of seats, each with a unique, bookable id", () => {
    expect(layout.totalSeats).toBe(capacity);
    expect(seats).toHaveLength(capacity);
    expect(new Set(seats.map((s) => s.seatNumber)).size).toBe(capacity);
    seats.forEach((s) => expect(s.seatNumber).toMatch(SEAT_NUMBER_RE));
    expect(seatsFitLayout(seats, layout)).toBe(true);
  });

  test("20–25 rows, labelled from the screen back, without the letter I", () => {
    expect(layout.rows.length).toBeGreaterThanOrEqual(20);
    expect(layout.rows.length).toBeLessThanOrEqual(25);
    expect(layout.rows[0].label).toBe("A");
    expect(layout.rows.map((r) => r.label)).not.toContain("I");
    expect(layout.rows.map((r) => r.order)).toEqual(layout.rows.map((_, i) => i));
  });

  test("three blocks per row with two straight aisles", () => {
    const centres = new Set();
    layout.rows.forEach((r) => {
      const [right, centre, left] = r.blocks;
      expect(right).toBe(left);
      expect(right).toBeGreaterThanOrEqual(2);
      expect(right + centre + left).toBe(r.seats);
      expect(r.aisleAfter).toEqual([right, right + centre]);
      centres.add(centre);
    });
    // A constant centre block keeps both aisles on the same line in every row.
    expect(centres.size).toBe(1);
    // The hall fans out: back rows are at least as wide as front rows.
    expect(layout.rows[layout.rows.length - 1].seats).toBeGreaterThanOrEqual(layout.rows[0].seats);
  });

  test("stadium rake: flat front row (step-free), then every row higher, the back rising most", () => {
    const risers = layout.rows.map((r) => r.riser);
    expect(risers[0]).toBe(0);
    risers.slice(1).forEach((r, i, list) => {
      expect(r).toBeGreaterThan(0);
      if (i > 0) expect(r).toBeGreaterThanOrEqual(list[i - 1]);
    });
    expect(risers[risers.length - 1]).toBeGreaterThan(risers[1] * 2);
    const backFloor = risers.reduce((a, b) => a + b, 0);
    expect(backFloor + 2.5).toBeLessThan(layout.room.height); // headroom over the back row
  });

  test("bigger than the classic hall, with a screen to match", () => {
    const classic = getLayout("classic-136");
    expect(layout.room.width).toBeGreaterThanOrEqual(classic.room.width);
    expect(layout.room.height).toBeGreaterThan(classic.room.height);
    expect(layout.room.depth).toBeGreaterThan(classic.room.depth);
    expect(layout.screen.width).toBeGreaterThan(classic.screen.width);
    expect(layout.screen.width).toBeLessThan(layout.room.width);
    // Every row fits inside the room with a walkway along each wall.
    layout.rows.forEach((r) => {
      const width = r.seats * layout.geometry.seatWidth.standard + r.aisleAfter.length * layout.geometry.aisleWidth;
      expect(width + 2).toBeLessThan(layout.room.width);
    });
  });

  test("prices: front Second Class, middle First Class, back Balcony", () => {
    const sections = layout.rows.map((r) => r.section);
    expect(sections[0]).toBe("Second Class");
    expect(sections[sections.length - 1]).toBe("Balcony");
    expect(new Set(sections)).toEqual(new Set(["Second Class", "First Class", "Balcony"]));
    seats.forEach((s) => expect(s.price).toBe(PRICES[{ Balcony: "balconyPrice", "First Class": "firstClassPrice", "Second Class": "secondClassPrice" }[s.category]]));
  });
});

describe("multiplex shows through the API", () => {
  let app;
  beforeAll(async () => {
    app = await startDb();
  });
  afterAll(stopDb);
  afterEach(clearDb);

  const createMultiplexShow = async (auth, capacity) => {
    const movie = await createMovie();
    const res = await request(app)
      .post("/api/shows")
      .set("Authorization", auth)
      .send({ movieId: String(movie._id), theatre: "Mega Screen 1", date: "2030-05-01", time: "19:00", ...PRICES, layoutId: `multiplex-${capacity}` });
    expect(res.status).toBe(201);
    return res.body;
  };

  test.each([300, 400, 500])("a %i-seat show gets exactly those seats, and the seat map gets its layout", async (capacity) => {
    const { auth } = await createUser("admin");
    const show = await createMultiplexShow(auth, capacity);
    expect(show.seats).toHaveLength(capacity);
    expect(show.layoutId).toBe(`multiplex-${capacity}`);
    const single = await request(app).get(`/api/shows/single/${show._id}`);
    expect(single.body.layout.id).toBe(`multiplex-${capacity}`);
    expect(single.body.layout.totalSeats).toBe(capacity);
    expect(single.body.seats).toHaveLength(capacity);
  });

  test("front, middle and rear seats in every block can be held and booked; others see them taken", async () => {
    const admin = await createUser("admin");
    const show = await createMultiplexShow(admin.auth, 500);
    const layout = getLayout("multiplex-500");
    const pickRows = [layout.rows[0], layout.rows[12], layout.rows[24]]; // A, N, Z
    const seats = pickRows.flatMap((r) => {
      const [right, centre] = r.blocks;
      return [`${r.label}1`, `${r.label}${right + Math.ceil(centre / 2)}`, `${r.label}${r.seats}`]; // right, centre, left
    });
    expect(seats).toContain("Z1");

    const buyer = await createUser("user");
    const other = await createUser("user");
    const hold = await request(app).post(`/api/shows/${show._id}/holds`).set("Authorization", buyer.auth).send({ seats: seats.slice(0, 6) });
    expect(hold.status).toBe(200);

    // Another customer sees those seats as held and can't take them.
    const seen = await request(app).get(`/api/shows/single/${show._id}`).set("Authorization", other.auth);
    const held = seen.body.seats.filter((s) => s.isHeld).map((s) => s.seatNumber).sort();
    expect(held).toEqual(seats.slice(0, 6).sort());
    const clash = await request(app).post(`/api/shows/${show._id}/holds`).set("Authorization", other.auth).send({ seats: [seats[0]] });
    expect(clash.status).toBe(409);

    const booked = await request(app).post("/api/bookings").set("Authorization", buyer.auth).send({ showId: show._id, seats: seats.slice(0, 6) });
    expect(booked.status).toBe(201);
    const after = await Show.findById(show._id).lean();
    const isBooked = new Map(after.seats.map((s) => [s.seatNumber, s.isBooked]));
    seats.slice(0, 6).forEach((n) => expect(isBooked.get(n)).toBe(true));
    seats.slice(6).forEach((n) => expect(isBooked.get(n)).toBe(false));
    expect(after.seats.filter((s) => s.isBooked)).toHaveLength(6);

    // The rear seats are still free for the other customer.
    const rear = await request(app).post("/api/bookings").set("Authorization", other.auth).send({ showId: show._id, seats: seats.slice(6) });
    expect(rear.status).toBe(201);
    expect(await Booking.countDocuments({ showId: show._id })).toBe(2);
  });

  test("seats that don't exist in the hall are refused", async () => {
    const admin = await createUser("admin");
    const show = await createMultiplexShow(admin.auth, 300);
    const buyer = await createUser("user");
    const last = getLayout("multiplex-300").rows.at(-1);
    for (const ghost of [`${last.label}${last.seats + 1}`, "I1", "ZZ1"]) {
      const res = await request(app).post("/api/bookings").set("Authorization", buyer.auth).send({ showId: show._id, seats: [ghost] });
      expect(res.status).toBeGreaterThanOrEqual(400);
    }
  });

  test("an existing show's hall can't be swapped; existing classic shows are untouched", async () => {
    const admin = await createUser("admin");
    const classic = await createShow();
    const before = await Show.findById(classic._id).lean();
    const res = await request(app).put(`/api/shows/${classic._id}`).set("Authorization", admin.auth).send({ layoutId: "multiplex-500" });
    expect(res.status).toBe(409);
    const after = await Show.findById(classic._id).lean();
    expect(after.seats).toEqual(before.seats);
    expect(after.layoutId ?? null).toBe(before.layoutId ?? null);

    const multi = await createMultiplexShow(admin.auth, 400);
    expect((await request(app).put(`/api/shows/${multi._id}`).set("Authorization", admin.auth).send({ layoutId: "classic-136" })).status).toBe(409);
    // Re-sending the same hall with another change is fine.
    expect((await request(app).put(`/api/shows/${multi._id}`).set("Authorization", admin.auth).send({ layoutId: "multiplex-400", time: "20:30" })).status).toBe(200);
    expect(layoutForShow(await Show.findById(multi._id).lean()).id).toBe("multiplex-400");
  });

  test("customers can't create multiplex shows", async () => {
    const { auth } = await createUser("user");
    const movie = await createMovie();
    const res = await request(app)
      .post("/api/shows")
      .set("Authorization", auth)
      .send({ movieId: String(movie._id), theatre: "X", date: "2030-05-01", time: "19:00", ...PRICES, layoutId: "multiplex-500" });
    expect(res.status).toBe(403);
  });
});
