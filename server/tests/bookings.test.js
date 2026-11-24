const request = require("supertest");
const { startDb, stopDb, clearDb, createUser, createShow, createMenu } = require("./helpers");
const Booking = require("../models/Booking");
const Show = require("../models/Show");
const SnackOrder = require("../models/SnackOrder");

let app;
beforeAll(async () => {
  app = await startDb();
});
afterAll(stopDb);
afterEach(clearDb);

const book = (auth, body) => request(app).post("/api/bookings").set("Authorization", auth).send(body);

describe("creating bookings", () => {
  test("requires sign-in", async () => {
    const show = await createShow();
    const res = await request(app).post("/api/bookings").send({ showId: String(show._id), seats: ["A1"] });
    expect(res.status).toBe(401);
  });

  test("prices are calculated on the server; tampered client prices are ignored", async () => {
    const show = await createShow();
    const { popcorn } = await createMenu();
    const { auth, user } = await createUser();
    const other = await createUser();

    const res = await book(auth, {
      showId: String(show._id),
      seats: ["A1", "E1"],
      userId: String(other.user._id), // must be ignored
      snacks: [{ snackId: String(popcorn._id), name: "Popcorn", price: 0, qty: 2 }],
      parking: { type: "Car", price: 0 },
      totalPrice: 1,
    });

    expect(res.status).toBe(201);
    // 300 (A1) + 200 (E1) + 2 × 250 popcorn + 60 car parking
    expect(res.body.totalPrice).toBe(1060);
    expect(res.body.snacks[0]).toMatchObject({ name: "Popcorn", price: 250, qty: 2 });
    expect(res.body.parking).toMatchObject({ type: "Car", price: 60 });
    expect(String(res.body.userId._id)).toBe(String(user._id));
    // Demo checkout is recorded as a demo, never as a verified payment.
    expect(res.body.paymentStatus).toBe("Demo");
    expect(res.body.paymentMode).toBe("DEMO");
  });

  test("combos are priced from the server's combo list", async () => {
    const show = await createShow();
    const { auth } = await createUser();
    const combos = await request(app).get("/api/snacks/combos");
    expect(combos.status).toBe(200);
    const duo = combos.body.find((c) => c.id === "combo-1");

    const res = await book(auth, {
      showId: String(show._id),
      seats: ["E3"],
      snacks: [{ snackId: "combo-1", name: "Movie Night Duo", price: 1, qty: 1 }],
    });
    expect(res.status).toBe(201);
    expect(res.body.totalPrice).toBe(200 + duo.comboPrice);
    expect((await book(auth, { showId: String(show._id), seats: ["E4"], snacks: [{ snackId: "combo-999", qty: 1 }] })).status).toBe(400);
  });

  test("coupons are applied by the server", async () => {
    const show = await createShow();
    const { auth } = await createUser();
    const res = await book(auth, { showId: String(show._id), seats: ["A1"], couponCode: "cine50" });
    expect(res.status).toBe(201);
    expect(res.body.totalPrice).toBe(250);
    expect(res.body.discountAmount).toBe(50);
  });

  test("rejects unknown snacks, bad quantities, bad seats and invalid coupons without reserving seats", async () => {
    const show = await createShow();
    await createMenu();
    const { auth } = await createUser();
    const id = String(show._id);

    const cases = [
      { showId: id, seats: ["A1"], snacks: [{ name: "Caviar", qty: 1 }] },
      { showId: id, seats: ["A1"], snacks: [{ name: "Popcorn", qty: -3 }] },
      { showId: id, seats: ["A1"], parking: { type: "Helicopter" } },
      { showId: id, seats: ["Z99"] },
      { showId: id, seats: ["A1'; drop"] },
      { showId: id, seats: ["A1"], couponCode: "NOT-A-CODE" },
      { showId: id, seats: [] },
      { showId: "nope", seats: ["A1"] },
    ];
    for (const body of cases) {
      const res = await book(auth, body);
      expect([400, 404]).toContain(res.status);
    }

    const fresh = await Show.findById(show._id);
    expect(fresh.seats.some((s) => s.isBooked)).toBe(false);
    expect(await Booking.countDocuments()).toBe(0);
  });

  test("an already booked seat cannot be booked again", async () => {
    const show = await createShow();
    const a = await createUser();
    const b = await createUser();
    expect((await book(a.auth, { showId: String(show._id), seats: ["A2"] })).status).toBe(201);
    const second = await book(b.auth, { showId: String(show._id), seats: ["A2", "A3"] });
    expect(second.status).toBe(409);
    expect(second.body.seats).toEqual(["A2"]);
    // A3 was not left reserved by the failed attempt.
    const fresh = await Show.findById(show._id);
    expect(fresh.seats.find((s) => s.seatNumber === "A3").isBooked).toBe(false);
  });
});

describe("double-booking under concurrency", () => {
  test("simultaneous requests for the same seat: exactly one succeeds", async () => {
    const show = await createShow();
    const users = await Promise.all(Array.from({ length: 12 }, () => createUser()));

    const results = await Promise.all(
      users.map((u) => book(u.auth, { showId: String(show._id), seats: ["B3"] }))
    );
    const statuses = results.map((r) => r.status);

    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(users.length - 1);
    expect(await Booking.countDocuments({ seats: "B3" })).toBe(1);
  });

  test("simultaneous overlapping multi-seat requests never share a seat", async () => {
    const show = await createShow();
    const users = await Promise.all(Array.from({ length: 6 }, () => createUser()));
    const requests = [
      ["A1", "A2"],
      ["A2", "A3"],
      ["A3", "A4"],
      ["A4", "A5"],
      ["A5", "A1"],
      ["A1", "A3", "A5"],
    ];

    await Promise.all(users.map((u, i) => book(u.auth, { showId: String(show._id), seats: requests[i] })));

    const bookings = await Booking.find({ showId: show._id });
    const seats = bookings.flatMap((b) => b.seats);
    expect(new Set(seats).size).toBe(seats.length); // no seat appears in two bookings

    const fresh = await Show.findById(show._id);
    const bookedOnShow = fresh.seats.filter((s) => s.isBooked).map((s) => s.seatNumber).sort();
    expect(bookedOnShow).toEqual([...seats].sort());
  });
});

describe("booking and ticket access", () => {
  const setup = async () => {
    const show = await createShow();
    const owner = await createUser();
    const stranger = await createUser();
    const admin = await createUser("admin");
    const res = await book(owner.auth, { showId: String(show._id), seats: ["E2"] });
    return { owner, stranger, admin, bookingId: res.body._id };
  };

  test("users can only list their own bookings", async () => {
    const { owner, stranger, admin } = await setup();
    const path = `/api/bookings/user/${owner.user._id}`;
    expect((await request(app).get(path)).status).toBe(401);
    expect((await request(app).get(path).set("Authorization", stranger.auth)).status).toBe(403);

    const mine = await request(app).get(path).set("Authorization", owner.auth);
    expect(mine.status).toBe(200);
    expect(mine.body).toHaveLength(1);
    expect(mine.body[0].userId.password).toBeUndefined();

    expect((await request(app).get(path).set("Authorization", admin.auth)).status).toBe(200);
  });

  test("a single booking and its verify page are hidden from other users", async () => {
    const { owner, stranger, admin, bookingId } = await setup();
    for (const path of [`/api/bookings/${bookingId}`, `/api/bookings/verify/${bookingId}`]) {
      expect((await request(app).get(path)).status).toBe(401);
      expect((await request(app).get(path).set("Authorization", stranger.auth)).status).toBe(404);
      expect((await request(app).get(path).set("Authorization", owner.auth)).status).toBe(200);
      expect((await request(app).get(path).set("Authorization", admin.auth)).status).toBe(200);
    }
  });

  test("only staff can mark a ticket used, and only the first scan admits it", async () => {
    const { owner, stranger, admin, bookingId } = await setup();
    const path = `/api/bookings/use/${bookingId}`;
    expect((await request(app).put(path)).status).toBe(401);
    expect((await request(app).put(path).set("Authorization", owner.auth)).status).toBe(403);
    expect((await request(app).put(path).set("Authorization", stranger.auth)).status).toBe(403);

    const scans = await Promise.all(
      Array.from({ length: 5 }, () => request(app).put(path).set("Authorization", admin.auth))
    );
    expect(scans.every((r) => r.status === 200)).toBe(true);
    expect(scans.filter((r) => r.body.alreadyUsed === false)).toHaveLength(1);

    const saved = await Booking.findById(bookingId);
    expect(saved.used).toBe(true);
    expect(saved.status).toBe("USED");
  });
});

describe("snack orders", () => {
  test("prices come from the menu, the owner comes from the token, and others can't read the order", async () => {
    await createMenu("IMAX");
    const owner = await createUser();
    const stranger = await createUser();

    const res = await request(app)
      .post("/api/snack-orders")
      .set("Authorization", owner.auth)
      .send({
        userId: String(stranger.user._id),
        theatre: "imax",
        items: [{ name: "Cola", price: 1, qty: 3 }],
        totalPrice: 1,
      });
    expect(res.status).toBe(201);
    expect(res.body.order.totalPrice).toBe(360);
    expect(String(res.body.order.userId)).toBe(String(owner.user._id));

    const id = res.body.order._id;
    expect((await request(app).get(`/api/snack-orders/${id}`).set("Authorization", stranger.auth)).status).toBe(404);
    expect((await request(app).get(`/api/snack-orders/${id}`).set("Authorization", owner.auth)).status).toBe(200);
    expect(
      (await request(app).get(`/api/snack-orders/user/${owner.user._id}`).set("Authorization", stranger.auth)).status
    ).toBe(403);
    expect(
      (await request(app).put(`/api/snack-orders/${id}/status`).set("Authorization", owner.auth).send({ status: "COMPLETED" }))
        .status
    ).toBe(403);
    expect(await SnackOrder.countDocuments()).toBe(1);
  });

  test("an order cannot be linked to someone else's booking", async () => {
    await createMenu("IMAX");
    const show = await createShow();
    const owner = await createUser();
    const stranger = await createUser();
    const booking = await book(owner.auth, { showId: String(show._id), seats: ["A1"] });

    const res = await request(app)
      .post("/api/snack-orders")
      .set("Authorization", stranger.auth)
      .send({ theatre: "IMAX", bookingId: booking.body._id, items: [{ name: "Cola", qty: 1 }] });
    expect(res.status).toBe(400);
  });
});
