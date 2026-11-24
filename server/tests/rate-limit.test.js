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
