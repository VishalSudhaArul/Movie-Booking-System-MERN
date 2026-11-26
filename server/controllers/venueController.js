// venueController.js
// Venue wayfinding published by admins. Customers read it on their tickets;
// only the places an admin entered are ever shown.

const Venue = require("../models/Venue");
const { cleanString, isObjectId } = require("../utils/validate");

const MAX_POINTS = 30;

// Optional text: "" when absent, null when present but too long or not text.
const optionalText = (v, max) => (v === undefined || v === null || v === "" ? "" : cleanString(v, { min: 0, max }));

const readVenue = (body) => {
  const name = cleanString(body && body.name, { max: 120 });
  if (!name) return { error: "Enter the theatre name exactly as it appears on showtimes" };
  const address = optionalText(body.address, 200);
  const entryInstructions = optionalText(body.entryInstructions, 500);
  if (address === null) return { error: "The address can be up to 200 characters" };
  if (entryInstructions === null) return { error: "Entry instructions can be up to 500 characters" };
  let mapUrl = optionalText(body.mapUrl, 500);
  if (mapUrl === null) return { error: "The map link is too long" };
  if (mapUrl) {
    try {
      const u = new URL(mapUrl);
      if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("protocol");
      mapUrl = u.toString();
    } catch (e) {
      return { error: "The map link must be a web address (https://...)" };
    }
  }
  const rawPoints = body.points === undefined ? [] : body.points;
  if (!Array.isArray(rawPoints) || rawPoints.length > MAX_POINTS) return { error: `Add up to ${MAX_POINTS} places` };
  const points = [];
  for (const p of rawPoints) {
    if (!p || !Venue.POINT_KINDS.includes(p.kind)) return { error: "Each place needs a valid type" };
    const label = cleanString(p.label, { max: 60 });
    if (!label) return { error: "Each place needs a name of up to 60 characters" };
    const directions = optionalText(p.directions, 300);
    if (directions === null) return { error: "Directions can be up to 300 characters" };
    points.push({ kind: p.kind, label, directions });
  }
  return { values: { name, key: name.toLowerCase(), address, mapUrl, entryInstructions, points } };
};

exports.list = async (req, res, next) => {
  try {
    return res.json(await Venue.find().sort({ name: 1 }).lean());
  } catch (err) {
    return next(err);
  }
};

/* GET /api/venues/lookup?theatre=... — public, for tickets and the food page. */
exports.lookup = async (req, res, next) => {
  try {
    const theatre = cleanString(req.query.theatre, { max: 120 });
    if (!theatre) return res.status(400).json({ message: "Which theatre?" });
    // No directions published is a normal answer, not an error: { venue: null }.
    const venue = await Venue.findOne({ key: theatre.toLowerCase() }).select("-key -__v").lean();
    return res.json({ venue: venue || null });
  } catch (err) {
    return next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { values, error } = readVenue(req.body);
    if (error) return res.status(400).json({ message: error });
    if (await Venue.exists({ key: values.key })) return res.status(409).json({ message: "This theatre already has venue details" });
    return res.status(201).json(await Venue.create(values));
  } catch (err) {
    return next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid venue ID" });
    const { values, error } = readVenue(req.body);
    if (error) return res.status(400).json({ message: error });
    const clash = await Venue.findOne({ key: values.key, _id: { $ne: req.params.id } }).select("_id").lean();
    if (clash) return res.status(409).json({ message: "Another venue already uses this theatre name" });
    const updated = await Venue.findByIdAndUpdate(req.params.id, { $set: values }, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: "Venue not found" });
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid venue ID" });
    const deleted = await Venue.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Venue not found" });
    return res.json({ message: "Venue removed" });
  } catch (err) {
    return next(err);
  }
};
