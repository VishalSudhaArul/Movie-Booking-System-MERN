// Shared test helpers: an in-memory MongoDB, the app, and data factories.

const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { createApp } = require("../app");
const User = require("../models/User");
const Movie = require("../models/Movie");
const Show = require("../models/Show");
const Snack = require("../models/Snack");
const Parking = require("../models/Parking");

let mongod;

const startDb = async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  return createApp();
};

const stopDb = async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
};

const clearDb = async () => {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
};

let counter = 0;
const createUser = async (role = "user", overrides = {}) => {
  counter += 1;
  const password = "Password123!";
  const user = await User.create({
    name: `Test ${role} ${counter}`,
    email: `${role}${counter}@example.test`,
    password: await bcrypt.hash(password, 4),
    role,
    ...overrides,
  });
  return { user, password, token: tokenFor(user), auth: `Bearer ${tokenFor(user)}` };
};

const tokenFor = (user, { secret = process.env.JWT_SECRET, ...opts } = {}) =>
  jwt.sign({ id: String(user._id), role: user.role }, secret, { algorithm: "HS256", expiresIn: "1h", ...opts });

const createMovie = () =>
  Movie.create({ title: "Test Movie", description: "A test film", duration: 120, poster: "/p.png", genre: "Drama" });

const createShow = async ({ theatre = "IMAX", movie } = {}) => {
  const m = movie || (await createMovie());
  const seats = [];
  ["A", "B"].forEach((row) => {
    for (let i = 1; i <= 5; i++) seats.push({ seatNumber: `${row}${i}`, category: "Balcony", price: 300, isBooked: false });
  });
  ["E"].forEach((row) => {
    for (let i = 1; i <= 5; i++) seats.push({ seatNumber: `${row}${i}`, category: "First Class", price: 200, isBooked: false });
  });
  return Show.create({
    movieId: m._id,
    theatre,
    date: "2027-01-15",
    time: "18:30",
    balconyPrice: 300,
    firstClassPrice: 200,
    secondClassPrice: 150,
    seats,
  });
};

const createMenu = async (theatre = "IMAX") => {
  const popcorn = await Snack.create({ name: "Popcorn", price: 250, theatre });
  const cola = await Snack.create({ name: "Cola", price: 120, theatre });
  const parking = await Parking.create({ theatre, priceBike: 20, priceCar: 60 });
  return { popcorn, cola, parking };
};

module.exports = { startDb, stopDb, clearDb, createUser, tokenFor, createMovie, createShow, createMenu };
