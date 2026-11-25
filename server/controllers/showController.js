const Show = require("../models/Show");
const Movie = require("../models/Movie");
const Parking = require("../models/Parking");
const { isObjectId, cleanString, cleanNumber, exactInsensitive } = require("../utils/validate");
const { showForUser } = require("../utils/seatHolds");
const {
  DEFAULT_LAYOUT_ID,
  getLayout,
  listLayouts,
  generateSeatsFromLayout,
  layoutForShow,
} = require("../utils/auditoriumLayouts");

const MAX_PRICE = 100000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// 24-hour "18:30", or 12-hour "6:30 PM" (hour 1-12). Something like "23:00 PM"
// would turn into hour 35, which can't be read, so the show would never count
// as started and would stay bookable for ever.
const TIME_RE = /^(?:([01]?\d|2[0-3]):[0-5]\d|(0?[1-9]|1[0-2]):[0-5]\d\s?[AaPp][Mm])$/;

const CATEGORY_PRICE_FIELDS = {
  Balcony: "balconyPrice",
  "First Class": "firstClassPrice",
  "Second Class": "secondClassPrice",
};

// Validates show fields. With `partial`, only fields that are present are checked.
const readShowInput = (body, { partial = false } = {}) => {
  const out = {};
  const errors = [];
  const has = (k) => body[k] !== undefined;

  if (!partial || has("movieId")) {
    if (!isObjectId(body.movieId)) errors.push("Choose a valid movie");
    else out.movieId = body.movieId;
  }
  if (!partial || has("theatre")) {
    const theatre = cleanString(body.theatre, { max: 120 });
    if (!theatre) errors.push("Enter a theatre name");
    else out.theatre = theatre;
  }
  if (!partial || has("date")) {
    const date = cleanString(body.date, { max: 10 });
    if (!date || !DATE_RE.test(date)) errors.push("Enter the date as YYYY-MM-DD");
    else out.date = date;
  }
  if (!partial || has("time")) {
    const time = cleanString(body.time, { max: 8 });
    if (!time || !TIME_RE.test(time)) errors.push("Enter a valid show time");
    else out.time = time;
  }
  Object.values(CATEGORY_PRICE_FIELDS).forEach((field) => {
    if (!partial || has(field)) {
      const price = cleanNumber(body[field], { min: 0, max: MAX_PRICE });
      if (price === null) errors.push("Seat prices must be numbers between 0 and 100000");
      else out[field] = price;
    }
  });

  return { values: out, error: errors[0] };
};

/* ---------- ADD SHOW ---------- */
exports.addShow = async (req, res, next) => {
  try {
    const { values, error } = readShowInput(req.body);
    if (error) return res.status(400).json({ message: error });

    if (!(await Movie.exists({ _id: values.movieId }))) {
      return res.status(400).json({ message: "That movie doesn't exist" });
    }

    const layoutId = req.body.layoutId === undefined ? DEFAULT_LAYOUT_ID : req.body.layoutId;
    const layout = typeof layoutId === "string" ? getLayout(layoutId) : null;
    if (!layout) return res.status(400).json({ message: "Unknown auditorium layout" });

    const seats = generateSeatsFromLayout(layout, values);
    const show = await Show.create({ ...values, layoutId: layout.id, seats });

    // Auto create parking if not exists
    const exists = await Parking.findOne({ theatre: exactInsensitive(values.theatre) });
    if (!exists) {
      await Parking.create({ theatre: values.theatre, priceBike: 20, priceCar: 50 });
    }

    return res.status(201).json(show);
  } catch (err) {
    return next(err);
  }
};

/* ---------- GET SHOW BY ID ---------- */
exports.getShowById = async (req, res, next) => {
  try {
    if (!isObjectId(req.params.showId)) return res.status(400).json({ message: "Invalid show ID" });
    // ?expand=movie embeds the movie document in place of its id.
    const query = Show.findById(req.params.showId);
    if (req.query.expand === "movie") query.populate("movieId");
    const show = await query;
    if (!show) return res.status(404).json({ message: "Show not found" });
    // The seat map and the 3D auditorium are both drawn from `layout`.
    return res.json({ ...showForUser(show, req.user?.id), layout: layoutForShow(show) });
  } catch (err) {
    return next(err);
  }
};

/* ---------- GET SHOWS BY MOVIE ---------- */
exports.getShowsByMovie = async (req, res, next) => {
  try {
    if (!isObjectId(req.params.movieId)) return res.status(400).json({ message: "Invalid movie ID" });
    const shows = await Show.find({ movieId: req.params.movieId }).sort({ date: 1, time: 1 });
    return res.json(shows);
  } catch (err) {
    return next(err);
  }
};

/* ---------- GET ALL SHOWS ---------- */
exports.getAllShows = async (req, res, next) => {
  try {
    // ?lite=1 skips the seat arrays, which listing pages do not need.
    const query = Show.find().sort({ date: 1, time: 1 });
    if (req.query.lite) query.select("-seats");
    else query.populate("movieId");
    const shows = await query;
    return res.json(shows);
  } catch (err) {
    return next(err);
  }
};

/* ---------- DELETE SHOW ---------- */
exports.deleteShow = async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid show ID" });
    const deleted = await Show.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Show not found" });
    return res.json({ message: "Deleted" });
  } catch (err) {
    return next(err);
  }
};

/* ---------- UPDATE SHOW ---------- */
// Only the listed fields can change. The seat list (and which seats are booked)
// can never be overwritten from the request body.
exports.updateShow = async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid show ID" });

    const { values, error } = readShowInput(req.body, { partial: true });
    if (error) return res.status(400).json({ message: error });
    if (Object.keys(values).length === 0) return res.status(400).json({ message: "Nothing to update" });

    if (values.movieId && !(await Movie.exists({ _id: values.movieId }))) {
      return res.status(400).json({ message: "That movie doesn't exist" });
    }

    const update = { $set: { ...values } };
    const arrayFilters = [];

    // Keep each seat's price in line with its category price, since bookings
    // are priced from the seats. Existing bookings keep the price they paid.
    Object.entries(CATEGORY_PRICE_FIELDS).forEach(([category, field], i) => {
      if (values[field] !== undefined) {
        update.$set[`seats.$[c${i}].price`] = values[field];
        arrayFilters.push({ [`c${i}.category`]: category });
      }
    });

    const updated = await Show.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
      ...(arrayFilters.length ? { arrayFilters } : {}),
    });
    if (!updated) return res.status(404).json({ message: "Show not found" });
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
};

/* ---------- AVAILABLE LAYOUTS ---------- */
exports.getLayouts = (req, res) => res.json(listLayouts());
