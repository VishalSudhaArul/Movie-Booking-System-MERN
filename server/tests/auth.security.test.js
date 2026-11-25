const request = require("supertest");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { startDb, stopDb, clearDb, createUser, tokenFor, createShow } = require("./helpers");
const { validateEnv } = require("../config/env");
const User = require("../models/User");

let app;
beforeAll(async () => {
  app = await startDb();
});
afterAll(stopDb);
afterEach(clearDb);

describe("JWT verification", () => {
  test("a token signed with a different secret is rejected", async () => {
    const { user } = await createUser("admin");
    const forged = tokenFor(user, { secret: "attacker-chosen-secret-that-is-long-enough-123" });
    const res = await request(app).get("/api/bookings/all").set("Authorization", `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  test("an unsigned (alg: none) token is rejected", async () => {
    const { user } = await createUser("admin");
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const unsigned = `${b64({ alg: "none", typ: "JWT" })}.${b64({ id: String(user._id), role: "admin" })}.`;
    const res = await request(app).get("/api/users/me").set("Authorization", `Bearer ${unsigned}`);
    expect(res.status).toBe(401);
  });

  test("a tampered payload with the original signature is rejected", async () => {
    const victim = await createUser("user");
    const attacker = await createUser("user");
    const [h, , s] = attacker.token.split(".");
    const payload = Buffer.from(JSON.stringify({ id: String(victim.user._id), role: "admin" })).toString("base64url");
    const res = await request(app).get("/api/users/me").set("Authorization", `Bearer ${h}.${payload}.${s}`);
    expect(res.status).toBe(401);
  });

  test("an expired token is rejected", async () => {
    const { user } = await createUser("user");
    const expired = tokenFor(user, { expiresIn: -10 });
    const res = await request(app).get("/api/users/me").set("Authorization", `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });

  test("a valid token for a deleted account is rejected", async () => {
    const { user, auth } = await createUser("user");
    await User.deleteOne({ _id: user._id });
    const res = await request(app).get("/api/users/me").set("Authorization", auth);
    expect(res.status).toBe(401);
  });

  test("/api/users/me reports the role stored in the database, not the one in the token", async () => {
    // The browser uses this to decide whether to show the admin link.
    const { user, auth } = await createUser("user");
    expect((await request(app).get("/api/users/me").set("Authorization", auth)).body.role).toBe("user");

    // A token that claims "admin" for a normal account still reports "user".
    const claimsAdmin = jwt.sign({ id: String(user._id), role: "admin" }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "1h" });
    expect((await request(app).get("/api/users/me").set("Authorization", `Bearer ${claimsAdmin}`)).body.role).toBe("user");

    // Promoting the account in the database takes effect with the same old token.
    await User.updateOne({ _id: user._id }, { $set: { role: "admin" } });
    expect((await request(app).get("/api/users/me").set("Authorization", auth)).body.role).toBe("admin");
  });

  test("a valid token works", async () => {
    const { auth, user } = await createUser("user");
    const res = await request(app).get("/api/users/me").set("Authorization", auth);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(user.email);
    expect(res.body.password).toBeUndefined();
  });
});

describe("removed bypass mechanisms", () => {
  test('"Authorization: Bypass 123456" no longer grants anything', async () => {
    for (const path of ["/api/bookings/all", "/api/analytics", "/api/parking/all"]) {
      const res = await request(app).get(path).set("Authorization", "Bypass 123456");
      expect(res.status).toBe(401);
    }
    const create = await request(app)
      .post("/api/movies")
      .set("Authorization", "Bypass 123456")
      .send({ title: "x", description: "x", duration: 90, poster: "x", genre: "x" });
    expect(create.status).toBe(401);
  });

  test("fake Google sign-in is disabled and creates no account", async () => {
    const { user } = await createUser("admin");
    const res = await request(app).post("/api/auth/google").send({ email: user.email, name: "Attacker" });
    expect(res.status).toBe(501);
    expect(res.body.token).toBeUndefined();
    expect(await User.countDocuments()).toBe(1);
  });
});

describe("admin authorization", () => {
  const adminOnly = [
    ["get", "/api/bookings/all"],
    ["get", "/api/bookings/parking-revenue"],
    ["get", "/api/analytics"],
    ["get", "/api/parking/all"],
    ["get", "/api/snack-orders/all"],
    ["post", "/api/movies"],
    ["post", "/api/shows"],
    ["post", "/api/snacks"],
    ["post", "/api/parking"],
  ];

  test.each(adminOnly)("%s %s: 401 without a token", async (method, path) => {
    const res = await request(app)[method](path).send({});
    expect(res.status).toBe(401);
  });

  test.each(adminOnly)("%s %s: 403 for a regular user", async (method, path) => {
    const { auth } = await createUser("user");
    const res = await request(app)[method](path).set("Authorization", auth).send({});
    expect(res.status).toBe(403);
  });

  test("a regular user cannot update or delete a show, snack or parking record", async () => {
    const { auth } = await createUser("user");
    const id = new mongoose.Types.ObjectId().toString();
    for (const path of [`/api/shows/${id}`, `/api/snacks/${id}`, `/api/parking/${id}`, `/api/movies/${id}`]) {
      expect((await request(app).put(path).set("Authorization", auth).send({})).status).toBe(403);
      expect((await request(app).delete(path).set("Authorization", auth)).status).toBe(403);
    }
  });

  test("the role comes from the database, not the token", async () => {
    // A user whose token claims "admin" is still a user.
    const { user } = await createUser("user");
    const claimsAdmin = jwt.sign({ id: String(user._id), role: "admin" }, process.env.JWT_SECRET, { algorithm: "HS256" });
    const res = await request(app).get("/api/analytics").set("Authorization", `Bearer ${claimsAdmin}`);
    expect(res.status).toBe(403);
  });

  test("an admin whose old token has no role field is still recognised", async () => {
    const { user } = await createUser("admin");
    const legacy = jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET, { algorithm: "HS256" });
    const res = await request(app).get("/api/analytics").set("Authorization", `Bearer ${legacy}`);
    expect(res.status).toBe(200);
  });

  test("admins and theatre owners can use admin routes", async () => {
    for (const role of ["admin", "theaterOwner"]) {
      const { auth } = await createUser(role);
      expect((await request(app).get("/api/bookings/all").set("Authorization", auth)).status).toBe(200);
    }
  });

  test("show updates cannot overwrite the seat list", async () => {
    const { auth } = await createUser("admin");
    const show = await createShow();
    const res = await request(app)
      .put(`/api/shows/${show._id}`)
      .set("Authorization", auth)
      .send({ seats: [], time: "20:00", balconyPrice: 350 });
    expect(res.status).toBe(200);
    expect(res.body.seats).toHaveLength(show.seats.length);
    expect(res.body.time).toBe("20:00");
    // Category price changes flow through to the seats bookings are priced from.
    expect(res.body.seats.filter((s) => s.category === "Balcony").every((s) => s.price === 350)).toBe(true);
  });
});

describe("register and login", () => {
  test("register ignores a role in the request and returns a working token", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "New Person", email: "New@Example.test", password: "longenough1", role: "admin" });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe("user");
    const saved = await User.findOne({ email: "new@example.test" });
    expect(saved.role).toBe("user");
    expect(saved.password).not.toBe("longenough1");
    const me = await request(app).get("/api/users/me").set("Authorization", `Bearer ${res.body.token}`);
    expect(me.status).toBe(200);
  });

  test("register rejects short passwords and duplicate emails (any case)", async () => {
    expect(
      (await request(app).post("/api/auth/register").send({ name: "A", email: "a@example.test", password: "short" })).status
    ).toBe(400);
    const { user } = await createUser("user");
    const dup = await request(app)
      .post("/api/auth/register")
      .send({ name: "A", email: user.email.toUpperCase(), password: "longenough1" });
    expect(dup.status).toBe(409);
  });

  test("login returns the role, and the same error for unknown email and wrong password", async () => {
    const { user, password } = await createUser("admin");
    const ok = await request(app).post("/api/auth/login").send({ email: user.email.toUpperCase(), password });
    expect(ok.status).toBe(200);
    expect(ok.body.role).toBe("admin");
    expect(jwt.verify(ok.body.token, process.env.JWT_SECRET).role).toBe("admin");

    const wrong = await request(app).post("/api/auth/login").send({ email: user.email, password: "nope-nope" });
    const unknown = await request(app).post("/api/auth/login").send({ email: "nobody@example.test", password: "x" });
    expect(wrong.status).toBe(400);
    expect(unknown.status).toBe(400);
    expect(wrong.body.message).toBe(unknown.body.message);
  });

  test("NoSQL operator injection in login is neutralised", async () => {
    await createUser("admin");
    const res = await request(app).post("/api/auth/login").send({ email: { $ne: null }, password: { $ne: null } });
    expect(res.status).toBe(400);
    expect(res.body.token).toBeUndefined();
  });
});

describe("HTTP hardening", () => {
  test("Helmet security headers are set and x-powered-by is hidden", async () => {
    const res = await request(app).get("/");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBeDefined();
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  test("CORS allows the production frontend and refuses other origins", async () => {
    const ok = await request(app).get("/api/movies").set("Origin", "https://movie-booking-system-mern-fawn.vercel.app");
    expect(ok.headers["access-control-allow-origin"]).toBe("https://movie-booking-system-mern-fawn.vercel.app");

    const evil = await request(app).get("/api/movies").set("Origin", "https://evil-site.vercel.app");
    expect(evil.status).toBe(403);
    expect(evil.headers["access-control-allow-origin"]).toBeUndefined();
  });

  test("server errors do not leak internal details", async () => {
    const res = await request(app).post("/api/auth/login").set("Content-Type", "application/json").send("{bad json");
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toMatch(/stack|at .*\.js/);
  });

  test("invalid IDs return 400, not a server error", async () => {
    expect((await request(app).get("/api/movies/not-an-id")).status).toBe(400);
    expect((await request(app).get("/api/shows/single/not-an-id")).status).toBe(400);
  });
});

describe("environment validation", () => {
  test("refuses a missing, placeholder or short JWT_SECRET", () => {
    expect(validateEnv({ MONGO_URI: "x" })).toEqual(expect.arrayContaining([expect.stringMatching(/JWT_SECRET/)]));
    expect(validateEnv({ MONGO_URI: "x", JWT_SECRET: "secret" }).length).toBe(1);
    expect(validateEnv({ MONGO_URI: "x", JWT_SECRET: "your_super_secret_jwt_key_change_this" }).length).toBe(1);
    expect(validateEnv({ MONGO_URI: "x", JWT_SECRET: "short-secret" }).length).toBe(1);
    expect(validateEnv({ JWT_SECRET: "a".repeat(40) })).toEqual(["MONGO_URI is not set."]);
    expect(validateEnv({ MONGO_URI: "x", JWT_SECRET: "a".repeat(40) })).toEqual([]);
  });
});
