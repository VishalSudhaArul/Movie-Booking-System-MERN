// Backend memory check: boots the real Express app on an in-memory MongoDB,
// seeds a 500-seat show with bookings, then sends bursts of requests to the
// heaviest endpoints (500-seat show with layout, holds, analytics) and records
// the API process's memory after each burst (after a forced GC when available).
// Run from server/: node --expose-gc scripts/memory-check.js
require("../tests/setup-env");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const jwt = require("jsonwebtoken");
const { createApp } = require("../app");
const User = require("../models/User");
const Movie = require("../models/Movie");
const Show = require("../models/Show");
const Booking = require("../models/Booking");
const { getLayout, generateSeatsFromLayout } = require("../utils/auditoriumLayouts");

const mb = (n) => Math.round((n / 1048576) * 10) / 10;
const snapshot = () => {
  if (global.gc) global.gc();
  const m = process.memoryUsage();
  return { rssMb: mb(m.rss), heapUsedMb: mb(m.heapUsed), externalMb: mb(m.external) };
};

(async () => {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  const app = createApp();
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;

  const admin = await User.create({ name: "Admin", email: "a@mem.test", password: "x".repeat(60), role: "admin" });
  const users = await User.create(Array.from({ length: 20 }, (_, i) => ({ name: `U${i}`, email: `u${i}@mem.test`, password: "x".repeat(60), role: "user" })));
  const token = (u) => jwt.sign({ id: String(u._id), role: u.role }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "1h" });
  const movie = await Movie.create({ title: "Memory", description: "d", duration: 100, poster: "/p.png", genre: "Drama" });
  const layout = getLayout("multiplex-500");
  const prices = { balconyPrice: 400, firstClassPrice: 300, secondClassPrice: 200 };
  const show = await Show.create({ movieId: movie._id, theatre: "IMAX", date: "2030-01-01", time: "18:00", ...prices, layoutId: layout.id, seats: generateSeatsFromLayout(layout, prices) });
  // 200 historical bookings for analytics.
  await Booking.insertMany(Array.from({ length: 200 }, (_, i) => ({ userId: users[i % 20]._id, showId: show._id, seats: [`Z${i}`], totalPrice: 300, paymentStatus: "Demo", paymentMode: "DEMO" })));

  const get = (p, t) => fetch(base + p, { headers: t ? { Authorization: `Bearer ${t}` } : {} }).then((r) => r.arrayBuffer());
  const post = (p, t, body) => fetch(base + p, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` }, body: JSON.stringify(body) }).then((r) => r.arrayBuffer());
  const del = (p, t) => fetch(base + p, { method: "DELETE", headers: { Authorization: `Bearer ${t}` } }).then((r) => r.arrayBuffer());

  const rows = [{ phase: "idle after seeding", ...snapshot() }];
  const ROUNDS = 6;
  for (let round = 1; round <= ROUNDS; round++) {
    // 100 seat-map loads (500 seats + layout each), 40 hold/release cycles, 10 analytics reports.
    for (let i = 0; i < 100; i += 10) await Promise.all(Array.from({ length: 10 }, () => get(`/api/shows/single/${show._id}?expand=movie`)));
    for (let i = 0; i < 40; i++) {
      const u = users[i % 20];
      await post(`/api/shows/${show._id}/holds`, token(u), { seats: [`M${(i % 10) + 1}`] });
      await del(`/api/shows/${show._id}/holds`, token(u));
    }
    for (let i = 0; i < 10; i++) await get("/api/analytics", token(admin));
    rows.push({ phase: `after burst ${round} (150 requests)`, ...snapshot() });
  }
  console.table(rows);
  const first = rows[1].heapUsedMb;
  const last = rows[rows.length - 1].heapUsedMb;
  console.log(`Heap after burst 1: ${first} MB, after burst ${ROUNDS}: ${last} MB (change ${Math.round((last - first) * 10) / 10} MB); GC ${global.gc ? "forced" : "not available"}.`);
  server.close();
  await mongoose.disconnect();
  await mongod.stop();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
