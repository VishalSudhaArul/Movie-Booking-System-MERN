// e2e/stack.js
// Starts a throwaway full stack for browser tests:
//   - an in-memory MongoDB (nothing touches a real database)
//   - the real Express API on :5000
//   - the production build of the client on :3000
// Run `npm run build` in client/ first. Data below is test fixture data only.

const path = require("path");
const fs = require("fs");

const SERVER = path.resolve(__dirname, "../../server");
const BUILD = path.resolve(__dirname, "../build");
const req = (m) => require(path.join(SERVER, "node_modules", m));

process.env.NODE_ENV = "development";
process.env.JWT_SECRET = "e2e-only-secret-0123456789-abcdefghijklmnopqrstuvwxyz";
process.env.DISABLE_RATE_LIMIT = "true";
const LOCAL_MONGOD = "C:/Program Files/MongoDB/Server/8.2/bin/mongod.exe";
if (!process.env.MONGOMS_SYSTEM_BINARY && fs.existsSync(LOCAL_MONGOD)) process.env.MONGOMS_SYSTEM_BINARY = LOCAL_MONGOD;

const mongoose = req("mongoose");
const bcrypt = req("bcrypt");
const express = req("express");
const { MongoMemoryServer } = req("mongodb-memory-server");

const model = (name) => require(path.join(SERVER, "models", name));
const { getLayout, generateSeatsFromLayout } = require(path.join(SERVER, "utils/auditoriumLayouts"));

const dayFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

async function seed() {
  const User = model("User");
  const Movie = model("Movie");
  const Show = model("Show");
  const Snack = model("Snack");
  const Parking = model("Parking");
  const Booking = model("Booking");
  const Review = model("Review");

  const hash = (p) => bcrypt.hash(p, 4);
  await User.create({ name: "Staff Admin", email: "admin@e2e.test", password: await hash("AdminPass123"), role: "admin" });
  const user = await User.create({ name: "Riya Sharma", email: "user@e2e.test", password: await hash("UserPass123"), role: "user" });

  const movies = await Movie.create([
    {
      title: "Neon Skyline",
      description: "A courier in a rain-soaked megacity uncovers a conspiracy written into the city's lights.",
      duration: 132, poster: "/posters/neon_skyline.png", genre: "Sci-Fi, Thriller",
      language: "English", releaseDate: dayFromNow(-10), cast: "Ava Cole, Jon Reyes", director: "M. Ortega",
    },
    {
      title: "Chronos Rift",
      description: "Two physicists race to close a tear in time before tomorrow erases today.",
      duration: 118, poster: "/posters/chronos_rift.png", genre: "Sci-Fi, Adventure",
      language: "Hindi", releaseDate: dayFromNow(-3), cast: "Kabir Rao, Meera Iyer", director: "S. Menon",
    },
    {
      title: "Cyber Genesis",
      description: "An AI wakes up inside an abandoned arcade and must decide what it wants to become.",
      duration: 104, poster: "/posters/cyber_genesis.png", genre: "Animation, Drama",
      language: "Tamil", releaseDate: dayFromNow(20), cast: "Voice cast", director: "L. Park",
    },
  ]);

  const layout = getLayout("classic-136");
  const prices = { balconyPrice: 320, firstClassPrice: 220, secondClassPrice: 160 };
  const shows = [];
  for (const [i, movie] of movies.slice(0, 2).entries()) {
    for (const [theatre, time] of [["IMAX", "18:30"], ["KS Cinemas", "21:15"]]) {
      shows.push(
        await Show.create({
          movieId: movie._id, theatre, date: dayFromNow(2 + i), time, ...prices,
          layoutId: layout.id, seats: generateSeatsFromLayout(layout, prices),
        })
      );
    }
  }

  // Some seats already booked so the seat map shows every state.
  const first = shows[0];
  await Show.updateOne(
    { _id: first._id },
    { $set: { "seats.$[s].isBooked": true } },
    { arrayFilters: [{ "s.seatNumber": { $in: ["H5", "H6", "G7", "C3", "C4"] } }] }
  );
  await Booking.create({
    userId: user._id, showId: first._id, seats: ["H5", "H6"], totalPrice: 440,
    paymentStatus: "Demo", paymentMode: "DEMO",
  });

  for (const theatre of ["IMAX", "KS Cinemas"]) {
    await Snack.create([
      { name: "Salted Popcorn", price: 220, theatre },
      { name: "Loaded Nachos", price: 260, theatre },
      { name: "Cold Brew Cola", price: 140, theatre },
    ]);
    await Parking.create({ theatre, priceBike: 30, priceCar: 80 });
  }

  await Review.create([
    { movieId: movies[0]._id, userId: user._id, userName: "Riya Sharma", rating: 5, comment: "Stunning visuals and a great score." },
    { movieId: movies[1]._id, userId: user._id, userName: "Riya Sharma", rating: 4, comment: "Clever twists, a bit long." },
  ]);
}

(async () => {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await seed();

  const { createApp } = require(path.join(SERVER, "app"));
  createApp().listen(5000, () => console.log("API on 5000"));

  if (!fs.existsSync(path.join(BUILD, "index.html"))) {
    console.error("client/build is missing: run `npm run build` first.");
    process.exit(1);
  }
  const web = express();
  web.use(express.static(BUILD));
  web.get("*", (q, r) => r.sendFile(path.join(BUILD, "index.html")));
  web.listen(3000, () => console.log("SPA on 3000"));
})();
