// Password-only admin access: sign-in, lockout, sessions, expiry and sign-out.
const request = require("supertest");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { startDb, stopDb, clearDb, createUser, createShow } = require("./helpers");
const {
  resetAdminAccessState,
  passwordWeakness,
  describeAdminConfig,
} = require("../utils/adminAccess");

// Test-only values; real ones live in the server environment.
const STRONG = "Test-Admin-Access-9f3K!";
const DEMO = "123456";

const ENV_KEYS = [
  "NODE_ENV", "RENDER", "ADMIN_ACCESS_PASSWORD", "ADMIN_DEMO_PASSWORD",
  "ADMIN_SESSION_TTL_MINUTES", "ADMIN_LOGIN_MAX_FAILURES", "ADMIN_LOGIN_GLOBAL_MAX_FAILURES",
];
const savedEnv = {};

let app;
beforeAll(async () => {
  ENV_KEYS.forEach((k) => (savedEnv[k] = process.env[k]));
  app = await startDb();
});
afterAll(async () => {
  ENV_KEYS.forEach((k) => (savedEnv[k] === undefined ? delete process.env[k] : (process.env[k] = savedEnv[k])));
  await stopDb();
});
beforeEach(() => {
  ENV_KEYS.forEach((k) => delete process.env[k]);
  process.env.NODE_ENV = "test";
  process.env.ADMIN_ACCESS_PASSWORD = STRONG;
  resetAdminAccessState();
});
afterEach(async () => {
  jest.restoreAllMocks();
  await clearDb();
});

// Each test client gets its own address (the app trusts one proxy hop).
let ipCounter = 0;
const nextIp = () => `203.0.113.${(ipCounter += 1) % 250}`;
const signIn = (password, ip = nextIp()) =>
  request(app).post("/api/auth/admin/login").set("X-Forwarded-For", ip).send(password === undefined ? {} : { password });
const bearer = (token) => ({ Authorization: `Bearer ${token}` });

const STAFF_READS = ["/api/bookings/all", "/api/bookings/parking-revenue", "/api/analytics", "/api/parking/all", "/api/snack-orders/all"];

describe("signing in", () => {
  test("the right password gives an expiring admin session that opens every admin API", async () => {
    const res = await signIn(STRONG);
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.body).toEqual({ role: "admin", token: expect.any(String), expiresAt: expect.any(String) });
    const minutes = (new Date(res.body.expiresAt) - Date.now()) / 60000;
    expect(minutes).toBeGreaterThan(115);
    expect(minutes).toBeLessThanOrEqual(120);
    const decoded = jwt.decode(res.body.token);
    expect(decoded.exp - decoded.iat).toBe(120 * 60);

    for (const path of STAFF_READS) {
      expect((await request(app).get(path).set(bearer(res.body.token))).status).toBe(200);
    }
    const movie = await request(app)
      .post("/api/movies")
      .set(bearer(res.body.token))
      .send({ title: "Admin Film", description: "d", duration: 100, poster: "/p.png", genre: "Drama" });
    expect(movie.status).toBe(201);
    const show = await createShow();
    expect((await request(app).put(`/api/shows/${show._id}`).set(bearer(res.body.token)).send({ time: "20:00" })).status).toBe(200);
    expect((await request(app).delete(`/api/shows/${show._id}`).set(bearer(res.body.token))).status).toBe(200);

    const check = await request(app).get("/api/auth/admin/session").set(bearer(res.body.token));
    expect(check.status).toBe(200);
    expect(check.body).toEqual({ role: "admin", expiresAt: res.body.expiresAt });
  });

  test("no email or username is needed, and extra fields are ignored", async () => {
    const res = await request(app).post("/api/auth/admin/login").send({ password: STRONG, email: "x@y.z", role: "superuser" });
    expect(res.status).toBe(200);
    expect(jwt.decode(res.body.token).role).toBe("admin");
  });

  test("a wrong password is refused with 'Incorrect admin password' and no token", async () => {
    for (const guess of ["wrong", STRONG.toLowerCase(), `${STRONG} `, DEMO]) {
      const res = await signIn(guess);
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: "Incorrect admin password" });
    }
  });

  test("an empty or missing password is a 400 and doesn't count as a failed attempt", async () => {
    const ip = nextIp();
    for (const body of [undefined, ""]) expect((await signIn(body, ip)).status).toBe(400);
    for (const bad of [{ password: 123456 }, { password: ["x"] }, { password: { $ne: null } }, { password: null }]) {
      const res = await request(app).post("/api/auth/admin/login").set("X-Forwarded-For", ip).send(bad);
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Enter the admin password.");
    }
    expect((await signIn(STRONG, ip)).status).toBe(200);
  });

  test("an overlong password is refused without being compared", async () => {
    expect((await signIn("x".repeat(5000))).status).toBe(401);
  });

  test("the password never appears in a response or in the logs", async () => {
    const logged = [];
    for (const level of ["log", "info", "warn", "error"]) {
      jest.spyOn(console, level).mockImplementation((...args) => logged.push(args.join(" ")));
    }
    process.env.ADMIN_LOGIN_MAX_FAILURES = "2";
    const bodies = [];
    for (const guess of ["Guess-One-1", "Guess-Two-2", STRONG]) bodies.push(JSON.stringify((await signIn(guess, "198.51.100.9")).body));
    bodies.push(JSON.stringify((await signIn(STRONG)).body));
    const everything = [...bodies, ...logged].join("\n");
    for (const secret of [STRONG, "Guess-One-1", "Guess-Two-2"]) expect(everything).not.toContain(secret);
  });

  test("with no admin password configured, admin sign-in is off", async () => {
    delete process.env.ADMIN_ACCESS_PASSWORD;
    const res = await signIn("anything");
    expect(res.status).toBe(503);
    expect(res.body.token).toBeUndefined();
  });
});

describe("failed-attempt protection", () => {
  test("five wrong passwords lock that client out for 15 minutes, even with the right password", async () => {
    const ip = "198.51.100.20";
    const statuses = [];
    for (let i = 0; i < 5; i++) statuses.push((await signIn(`wrong-${i}`, ip)).status);
    expect(statuses).toEqual([401, 401, 401, 401, 429]);

    const locked = await signIn(STRONG, ip);
    expect(locked.status).toBe(429);
    expect(locked.body.token).toBeUndefined();
    expect(locked.body.message).toMatch(/Too many incorrect attempts\. Try again in 15 minutes/);
    expect(Number(locked.headers["retry-after"])).toBeGreaterThan(800);

    // Another client is not affected.
    expect((await signIn(STRONG, "198.51.100.21")).status).toBe(200);

    // After the lock runs out, the right password works again.
    const later = Date.now() + 16 * 60 * 1000;
    jest.spyOn(Date, "now").mockReturnValue(later);
    expect((await signIn(STRONG, ip)).status).toBe(200);
  });

  test("a successful sign-in resets the count", async () => {
    const ip = "198.51.100.30";
    for (let i = 0; i < 4; i++) expect((await signIn("nope", ip)).status).toBe(401);
    expect((await signIn(STRONG, ip)).status).toBe(200);
    for (let i = 0; i < 4; i++) expect((await signIn("nope", ip)).status).toBe(401);
  });

  test("many wrong passwords from many clients pause all admin sign-ins", async () => {
    process.env.ADMIN_LOGIN_GLOBAL_MAX_FAILURES = "6";
    for (let i = 0; i < 5; i++) expect((await signIn("nope", `192.0.2.${i + 1}`)).status).toBe(401);
    expect((await signIn("nope", "192.0.2.50")).status).toBe(429);
    expect((await signIn(STRONG, "192.0.2.99")).status).toBe(429);
  });
});

describe("what an admin session can and can't do", () => {
  test("a customer token can't use admin APIs or pass as an admin session", async () => {
    const { auth, user } = await createUser("user");
    for (const path of STAFF_READS) expect((await request(app).get(path).set("Authorization", auth)).status).toBe(403);
    expect((await request(app).post("/api/movies").set("Authorization", auth).send({})).status).toBe(403);
    expect((await request(app).get("/api/auth/admin/session").set("Authorization", auth)).status).toBe(401);
    expect((await request(app).post("/api/auth/admin/logout").set("Authorization", auth)).status).toBe(401);

    // A customer token dressed up as an admin session, signed with the customer key.
    const login = await signIn(STRONG);
    const { sid } = jwt.decode(login.body.token);
    const disguised = jwt.sign(
      { id: String(user._id), typ: "admin_access", sid, role: "admin" },
      process.env.JWT_SECRET,
      { algorithm: "HS256", expiresIn: "1h", issuer: "cinebook-api", audience: "cinebook-admin" }
    );
    expect((await request(app).get("/api/analytics").set(bearer(disguised))).status).toBe(403);
    expect((await request(app).get("/api/auth/admin/session").set(bearer(disguised))).status).toBe(401);
  });

  test("an admin session is not a customer account", async () => {
    const { body } = await signIn(STRONG);
    const show = await createShow();
    expect((await request(app).get("/api/users/me").set(bearer(body.token))).status).toBe(401);
    expect((await request(app).post("/api/bookings").set(bearer(body.token)).send({ showId: String(show._id), seats: ["A1"] })).status).toBe(401);
    expect((await request(app).post(`/api/shows/${show._id}/holds`).set(bearer(body.token)).send({ seats: ["A1"] })).status).toBe(401);
  });

  test("a tampered admin token is refused", async () => {
    const { body } = await signIn(STRONG);
    const [h, p, s] = body.token.split(".");
    const payload = JSON.parse(Buffer.from(p, "base64url").toString());
    const changed = Buffer.from(JSON.stringify({ ...payload, exp: payload.exp + 86400 })).toString("base64url");
    expect((await request(app).get("/api/analytics").set(bearer(`${h}.${changed}.${s}`))).status).toBe(401);
    const unsigned = `${Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url")}.${p}.`;
    expect((await request(app).get("/api/analytics").set(bearer(unsigned))).status).toBe(401);
  });

  test("admin URLs without any token are refused", async () => {
    for (const path of [...STAFF_READS, "/api/auth/admin/session"]) {
      expect((await request(app).get(path)).status).toBe(401);
    }
    const id = new mongoose.Types.ObjectId().toString();
    expect((await request(app).put(`/api/bookings/use/${id}`)).status).toBe(401);
  });

  test("a session expires after its lifetime", async () => {
    process.env.ADMIN_SESSION_TTL_MINUTES = "30";
    const { body } = await signIn(STRONG);
    expect((await request(app).get("/api/analytics").set(bearer(body.token))).status).toBe(200);

    jest.spyOn(Date, "now").mockReturnValue(Date.now() + 31 * 60 * 1000);
    const expired = await request(app).get("/api/analytics").set(bearer(body.token));
    expect(expired.status).toBe(401);
    const check = await request(app).get("/api/auth/admin/session").set(bearer(body.token));
    expect(check.status).toBe(401);
    expect(check.body.message).toMatch(/admin session has expired/i);
  });

  test("signing out revokes the session at once; other sessions stay", async () => {
    const first = (await signIn(STRONG)).body.token;
    const second = (await signIn(STRONG)).body.token;
    expect((await request(app).post("/api/auth/admin/logout").set(bearer(first))).status).toBe(204);
    expect((await request(app).get("/api/analytics").set(bearer(first))).status).toBe(401);
    expect((await request(app).get("/api/auth/admin/session").set(bearer(first))).status).toBe(401);
    expect((await request(app).post("/api/auth/admin/logout").set(bearer(first))).status).toBe(401);
    expect((await request(app).get("/api/analytics").set(bearer(second))).status).toBe(200);
  });

  test("staff accounts keep working, with their role read from the database", async () => {
    for (const role of ["admin", "theaterOwner"]) {
      const { auth } = await createUser(role);
      expect((await request(app).get("/api/bookings/all").set("Authorization", auth)).status).toBe(200);
    }
  });
});

describe("password configuration", () => {
  test("local development also accepts the separate demo password", async () => {
    process.env.NODE_ENV = "development";
    process.env.ADMIN_DEMO_PASSWORD = DEMO;
    expect((await signIn(DEMO)).status).toBe(200);
    expect((await signIn(STRONG)).status).toBe(200);
  });

  test("the demo password alone is enough for local development", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.ADMIN_ACCESS_PASSWORD;
    process.env.ADMIN_DEMO_PASSWORD = DEMO;
    expect((await signIn(DEMO)).status).toBe(200);
  });

  test.each([["NODE_ENV", "production"], ["RENDER", "true"]])("in production (%s=%s) the demo password is ignored", async (key, value) => {
    process.env.NODE_ENV = "development";
    process.env[key] = value;
    process.env.ADMIN_DEMO_PASSWORD = DEMO;
    expect((await signIn(DEMO)).status).toBe(401);
    expect((await signIn(STRONG)).status).toBe(200);
    expect(describeAdminConfig()).toEqual([expect.stringMatching(/ADMIN_DEMO_PASSWORD is ignored in production/)]);
  });

  test("in production a weak password keeps admin sign-in switched off", async () => {
    process.env.NODE_ENV = "production";
    for (const weak of ["123456", "admin123", "short-Pass1", "alllowercaseletters", "Password123"]) {
      process.env.ADMIN_ACCESS_PASSWORD = weak;
      const res = await signIn(weak);
      expect(res.status).toBe(503);
      expect(res.body.token).toBeUndefined();
      expect(describeAdminConfig()[0]).toMatch(/Admin sign-in is disabled/);
      expect(describeAdminConfig().join(" ")).not.toContain(weak);
    }
  });

  test("in production the admin password can't be the demo password", async () => {
    process.env.NODE_ENV = "production";
    process.env.ADMIN_DEMO_PASSWORD = STRONG;
    expect((await signIn(STRONG)).status).toBe(503);
  });

  test("password strength rules", () => {
    expect(passwordWeakness("123456")).toMatch(/common/);
    expect(passwordWeakness("Ab1!")).toMatch(/16 characters/);
    expect(passwordWeakness("abcdefghijklmnopqrst")).toMatch(/three/);
    expect(passwordWeakness("Aa1Aa1Aa1Aa1Aa1Aa1")).toMatch(/repetitive/);
    expect(passwordWeakness(STRONG)).toBeNull();
    expect(passwordWeakness(undefined)).toMatch(/not set/);
  });
});
