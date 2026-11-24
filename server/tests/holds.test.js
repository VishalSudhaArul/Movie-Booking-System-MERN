const request = require("supertest");
const { startDb, stopDb, clearDb, createUser, createShow } = require("./helpers");
const Show = require("../models/Show");
const Booking = require("../models/Booking");

let app;
beforeAll(async () => {
  app = await startDb();
});
afterAll(stopDb);
afterEach(clearDb);

const hold = (auth, showId, seats) =>
  request(app).post(`/api/shows/${showId}/holds`).set("Authorization", auth).send({ seats });
const book = (auth, showId, seats) =>
  request(app).post("/api/bookings").set("Authorization", auth).send({ showId: String(showId), seats });
const seatMap = async (showId, auth) => {
  const r = request(app).get(`/api/shows/single/${showId}`);
  if (auth) r.set("Authorization", auth);
  const res = await r;
  return Object.fromEntries(res.body.seats.map((s) => [s.seatNumber, s]));
};

// Makes an existing hold look expired, as if its minutes had passed.
const expireHolds = (showId) =>
  Show.updateOne(
    { _id: showId },
    { $set: { "seats.$[h].holdExpiresAt": new Date(Date.now() - 1000) } },
    { arrayFilters: [{ "h.heldBy": { $ne: null } }] }
  );

describe("placing holds", () => {
  test("requires sign-in", async () => {
    const show = await createShow();
    const res = await request(app).post(`/api/shows/${show._id}/holds`).send({ seats: ["A1"] });
    expect(res.status).toBe(401);
  });

  test("holds seats and returns an expiry about 8 minutes away", async () => {
    const show = await createShow();
    const { auth } = await createUser();
    const res = await hold(auth, show._id, ["A1", "a2"]);
    expect(res.status).toBe(200);
    expect(res.body.seats).toEqual(["A1", "A2"]);
    const minutes = (new Date(res.body.expiresAt) - Date.now()) / 60000;
    expect(minutes).toBeGreaterThan(7.5);
    expect(minutes).toBeLessThanOrEqual(8);
  });

  test("rejects bad input", async () => {
    const show = await createShow();
    const { auth } = await createUser();
    expect((await hold(auth, show._id, ["Z99"])).status).toBe(400);
    expect((await hold(auth, show._id, ["A1; drop"])).status).toBe(400);
    expect((await hold(auth, show._id, "A1")).status).toBe(400);
    expect((await hold(auth, show._id, Array.from({ length: 11 }, (_, i) => `A${i + 1}`))).status).toBe(400);
    expect((await hold(auth, "not-an-id", ["A1"])).status).toBe(400);
  });

  test("a seat held by someone else can't be held or booked", async () => {
    const show = await createShow();
    const a = await createUser();
    const b = await createUser();
    expect((await hold(a.auth, show._id, ["A1"])).status).toBe(200);

    const holdTry = await hold(b.auth, show._id, ["A1", "A2"]);
    expect(holdTry.status).toBe(409);
    expect(holdTry.body.seats).toEqual(["A1"]);

    const bookTry = await book(b.auth, show._id, ["A1"]);
    expect(bookTry.status).toBe(409);
    expect(bookTry.body.seats).toEqual(["A1"]);

    // The failed attempt did not leave A2 held.
    const map = await seatMap(show._id);
    expect(map.A2.isHeld).toBe(false);
  });

  test("a booked seat can't be held", async () => {
    const show = await createShow();
    const a = await createUser();
    const b = await createUser();
    expect((await book(a.auth, show._id, ["E1"])).status).toBe(201);
    expect((await hold(b.auth, show._id, ["E1"])).status).toBe(409);
  });

  test("holding again replaces the previous hold and restarts the timer", async () => {
    const show = await createShow();
    const a = await createUser();
    const b = await createUser();
    await hold(a.auth, show._id, ["A1", "A2"]);
    const again = await hold(a.auth, show._id, ["A2", "A3"]);
    expect(again.status).toBe(200);

    // A1 was released, so someone else can take it now.
    expect((await hold(b.auth, show._id, ["A1"])).status).toBe(200);
    const fresh = await Show.findById(show._id);
    const heldByA = fresh.seats.filter((s) => String(s.heldBy) === String(a.user._id)).map((s) => s.seatNumber);
    expect(heldByA.sort()).toEqual(["A2", "A3"]);
  });

  test("an empty list or DELETE releases the user's hold", async () => {
    const show = await createShow();
    const a = await createUser();
    const b = await createUser();
    await hold(a.auth, show._id, ["B1"]);
    expect((await hold(a.auth, show._id, [])).status).toBe(200);
    expect((await hold(b.auth, show._id, ["B1"])).status).toBe(200);

    const del = await request(app).delete(`/api/shows/${show._id}/holds`).set("Authorization", b.auth);
    expect(del.status).toBe(200);
    expect((await hold(a.auth, show._id, ["B1"])).status).toBe(200);
  });

  test("a user can't release someone else's hold", async () => {
    const show = await createShow();
    const a = await createUser();
    const b = await createUser();
    await hold(a.auth, show._id, ["B2"]);
    await request(app).delete(`/api/shows/${show._id}/holds`).set("Authorization", b.auth);
    expect((await hold(b.auth, show._id, ["B2"])).status).toBe(409);
  });
});

describe("expiry", () => {
  test("an expired hold no longer blocks anyone", async () => {
    const show = await createShow();
    const a = await createUser();
    const b = await createUser();
    await hold(a.auth, show._id, ["A4"]);
    await expireHolds(show._id);

    expect((await seatMap(show._id)).A4.isHeld).toBe(false);
    expect((await book(b.auth, show._id, ["A4"])).status).toBe(201);
  });

  test("the holder can still book after expiry if the seat is still free", async () => {
    const show = await createShow();
    const a = await createUser();
    await hold(a.auth, show._id, ["A5"]);
    await expireHolds(show._id);
    expect((await book(a.auth, show._id, ["A5"])).status).toBe(201);
  });
});

describe("booking with holds", () => {
  test("the holder can book their held seats, and booking clears all their holds on the show", async () => {
    const show = await createShow();
    const a = await createUser();
    await hold(a.auth, show._id, ["E2", "E3", "E4"]);
    const res = await book(a.auth, show._id, ["E2", "E3"]);
    expect(res.status).toBe(201);

    const fresh = await Show.findById(show._id);
    expect(fresh.seats.filter((s) => s.heldBy).length).toBe(0);
    expect(fresh.seats.filter((s) => s.isBooked).map((s) => s.seatNumber).sort()).toEqual(["E2", "E3"]);
  });

  test("booking responses don't leak hold details", async () => {
    const show = await createShow();
    const a = await createUser();
    const b = await createUser();
    await hold(b.auth, show._id, ["B5"]);
    const res = await book(a.auth, show._id, ["B4"]);
    const json = JSON.stringify(res.body);
    expect(json).not.toContain(String(b.user._id));
    expect(json).not.toContain("holdExpiresAt");
  });
});

describe("seat map view", () => {
  test("others see a held seat only as held; the holder sees it as theirs, with its expiry", async () => {
    const show = await createShow();
    const a = await createUser();
    const b = await createUser();
    await hold(a.auth, show._id, ["A3"]);

    const anon = await request(app).get(`/api/shows/single/${show._id}`);
    expect(JSON.stringify(anon.body)).not.toContain(String(a.user._id));
    const anonSeat = anon.body.seats.find((s) => s.seatNumber === "A3");
    expect(anonSeat).toMatchObject({ isHeld: true, isBooked: false });
    expect(anonSeat.holdExpiresAt).toBeUndefined();
    expect(anonSeat.heldBy).toBeUndefined();

    expect((await seatMap(show._id, b.auth)).A3).toMatchObject({ isHeld: true });

    const mine = (await seatMap(show._id, a.auth)).A3;
    expect(mine).toMatchObject({ isHeld: false, heldByMe: true });
    expect(new Date(mine.holdExpiresAt) > new Date()).toBe(true);
  });

  test("show listings never include hold owners", async () => {
    const show = await createShow();
    const a = await createUser();
    await hold(a.auth, show._id, ["A1"]);
    for (const path of ["/api/shows", `/api/shows/movie/${show.movieId}`]) {
      const res = await request(app).get(path);
      expect(res.status).toBe(200);
      expect(JSON.stringify(res.body)).not.toContain(String(a.user._id));
    }
  });

  test("an invalid token on the public seat map is treated as anonymous, not an error", async () => {
    const show = await createShow();
    const res = await request(app).get(`/api/shows/single/${show._id}`).set("Authorization", "Bearer not.a.token");
    expect(res.status).toBe(200);
  });
});

describe("concurrency", () => {
  test("simultaneous holds on the same seat: exactly one wins", async () => {
    const show = await createShow();
    const users = await Promise.all(Array.from({ length: 12 }, () => createUser()));
    const results = await Promise.all(users.map((u) => hold(u.auth, show._id, ["B3"])));
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(users.length - 1);
  });

  test("a hold and a booking racing for the same seat never both succeed", async () => {
    for (let round = 0; round < 5; round++) {
      const show = await createShow();
      const holder = await createUser();
      const booker = await createUser();
      const [h, b] = await Promise.all([hold(holder.auth, show._id, ["A1"]), book(booker.auth, show._id, ["A1"])]);
      const wins = [h.status === 200, b.status === 201].filter(Boolean).length;
      expect(wins).toBe(1);
      if (b.status === 201) expect(await Booking.countDocuments({ showId: show._id })).toBe(1);
    }
  });
});
