// security.js
// Rate limits and request sanitising shared by the app.

const { rateLimit } = require("express-rate-limit");

const jsonLimit = (max, windowMinutes, message) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message },
    // Tests set this so the suite is not throttled by its own requests.
    skip: () => process.env.DISABLE_RATE_LIMIT === "true",
  });

// Every API request from one IP.
const apiLimiter = jsonLimit(600, 15, "Too many requests. Please slow down and try again shortly.");

// Sign-in and sign-up attempts, to slow down password guessing.
const authLimiter = jsonLimit(20, 15, "Too many sign-in attempts. Please wait a few minutes and try again.");

// Placing or changing seat holds (each "Continue" on the seat map).
const holdLimiter = jsonLimit(120, 15, "Too many seat changes. Please wait a few minutes and try again.");

// Bookings and orders.
const bookingLimiter = jsonLimit(40, 15, "Too many booking attempts. Please wait a few minutes and try again.");

// Removes keys that MongoDB treats as operators ("$gt", "a.b") from user input,
// so a body like { "email": { "$ne": null } } cannot change a query.
const stripOperators = (value, depth = 0) => {
  if (depth > 10 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => stripOperators(v, depth + 1));
  const out = {};
  Object.keys(value).forEach((key) => {
    if (key.startsWith("$") || key.includes(".")) return;
    out[key] = stripOperators(value[key], depth + 1);
  });
  return out;
};

const sanitizeRequest = (req, res, next) => {
  if (req.body && typeof req.body === "object") req.body = stripOperators(req.body);
  if (req.params && typeof req.params === "object") {
    Object.keys(req.params).forEach((k) => {
      if (typeof req.params[k] !== "string") delete req.params[k];
    });
  }
  // req.query is a getter in some Express versions; clean its values in place.
  if (req.query && typeof req.query === "object") {
    Object.keys(req.query).forEach((k) => {
      if (k.startsWith("$") || (req.query[k] !== null && typeof req.query[k] === "object")) {
        delete req.query[k];
      }
    });
  }
  next();
};

module.exports = { apiLimiter, authLimiter, bookingLimiter, holdLimiter, sanitizeRequest, stripOperators };
