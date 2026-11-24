// movieController.js

const Movie = require("../models/Movie");
const { isObjectId, cleanString, cleanNumber } = require("../utils/validate");

const TEXT_FIELDS = {
  title: 200,
  description: 5000,
  poster: 2000,
  genre: 100,
  trailerUrl: 2000,
  language: 100,
  releaseDate: 40,
  cast: 1000,
  director: 200,
};
const REQUIRED = ["title", "description", "poster", "genre"];

// Only known movie fields are accepted.
const readMovieInput = (body, { partial = false } = {}) => {
  const out = {};
  for (const [field, max] of Object.entries(TEXT_FIELDS)) {
    if (body[field] === undefined) {
      if (!partial && REQUIRED.includes(field)) return { error: `${field} is required` };
      continue;
    }
    const required = REQUIRED.includes(field);
    const value = cleanString(body[field], { min: required ? 1 : 0, max });
    if (value === null) return { error: `${field} is missing or too long` };
    out[field] = value;
  }
  if (!partial || body.duration !== undefined) {
    const duration = cleanNumber(body.duration, { min: 1, max: 1000, integer: true });
    if (duration === null) return { error: "Duration must be a whole number of minutes" };
    out.duration = duration;
  }
  return { values: out };
};

// ➤ Add Movie (staff)
exports.addMovie = async (req, res, next) => {
  try {
    const { values, error } = readMovieInput(req.body);
    if (error) return res.status(400).json({ message: error });
    const movie = await Movie.create(values);
    return res.status(201).json(movie);
  } catch (err) {
    return next(err);
  }
};

// ➤ Get All Movies
exports.getMovies = async (req, res, next) => {
  try {
    const movies = await Movie.find();
    return res.json(movies);
  } catch (err) {
    return next(err);
  }
};

// ➤ Get Single Movie
exports.getMovie = async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid movie ID" });
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ message: "Movie not found" });
    return res.json(movie);
  } catch (err) {
    return next(err);
  }
};

// ➤ Update Movie (staff)
exports.updateMovie = async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid movie ID" });
    const { values, error } = readMovieInput(req.body, { partial: true });
    if (error) return res.status(400).json({ message: error });
    const movie = await Movie.findByIdAndUpdate(req.params.id, { $set: values }, { new: true, runValidators: true });
    if (!movie) return res.status(404).json({ message: "Movie not found" });
    return res.json(movie);
  } catch (err) {
    return next(err);
  }
};

// ➤ Delete Movie (staff)
exports.deleteMovie = async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid movie ID" });
    const deleted = await Movie.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Movie not found" });
    return res.json({ message: "Movie deleted" });
  } catch (err) {
    return next(err);
  }
};
