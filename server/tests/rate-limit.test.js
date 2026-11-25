const request = require("supertest");
const { startDb, stopDb } = require("./helpers");

let app;
beforeAll(async () => {
  app = await startDb();
  process.env.DISABLE_RATE_LIMIT = "false";
});
afterAll(async () => {
  process.env.DISABLE_RATE_LIMIT = "true";
  await stopDb();
});

test("repeated sign-in attempts are rate limited", async () => {
  const statuses = [];
  for (let i = 0; i < 22; i++) {
    const res = await request(app).post("/api/auth/login").send({ email: "who@example.test", password: "guess" + i });
    statuses.push(res.status);
  }
  expect(statuses.slice(0, 20).every((s) => s === 400)).toBe(true);
  expect(statuses[21]).toBe(429);
});

test("admin sign-in requests are rate limited per client, on top of the lockout", async () => {
  // Empty passwords aren't counted by the lockout, so this hits the request limiter alone.
  const statuses = [];
  for (let i = 0; i < 22; i++) {
    const res = await request(app).post("/api/auth/admin/login").set("X-Forwarded-For", "203.0.113.200").send({ password: "" });
    statuses.push(res.status);
  }
  expect(statuses.slice(0, 20).every((s) => s === 400)).toBe(true);
  expect(statuses[21]).toBe(429);
});
