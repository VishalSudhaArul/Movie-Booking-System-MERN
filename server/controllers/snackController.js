// snackController.js

const Snack = require("../models/Snack");
const { isObjectId, cleanString, cleanNumber, exactInsensitive } = require("../utils/validate");

const readSnackInput = (body, { partial = false } = {}) => {
  const out = {};
  const has = (k) => body[k] !== undefined;

  if (!partial || has("name")) {
    const name = cleanString(body.name, { max: 80 });
    if (!name) return { error: "Enter a snack name" };
    out.name = name;
  }
  if (!partial || has("price")) {
    const price = cleanNumber(body.price, { min: 0, max: 100000 });
    if (price === null) return { error: "Price must be a number between 0 and 100000" };
    out.price = price;
  }
  if (!partial || has("theatre")) {
    const theatre = cleanString(body.theatre, { max: 120 });
    if (!theatre) return { error: "Choose a theatre" };
    out.theatre = theatre;
  }
  if (has("image")) {
    const image = typeof body.image === "string" ? body.image.trim().slice(0, 1000) : "";
    out.image = image;
  }
  return { values: out };
};

// ➤ Add snack (staff)
exports.addSnack = async (req, res, next) => {
  try {
    const { values, error } = readSnackInput(req.body);
    if (error) return res.status(400).json({ message: error });
    const snack = await Snack.create(values);
    return res.status(201).json(snack);
  } catch (err) {
    return next(err);
  }
};

// ➤ Get snacks by theatre
exports.getSnacksByTheatre = async (req, res, next) => {
  try {
    const theatre = cleanString(req.params.theatre, { max: 120 });
    if (!theatre) return res.json([]);
    const snacks = await Snack.find({ theatre: exactInsensitive(theatre) });
    return res.json(snacks);
  } catch (err) {
    return next(err);
  }
};

// ➤ Get all snacks
exports.getAllSnacks = async (req, res, next) => {
  try {
    const snacks = await Snack.find();
    return res.json(snacks);
  } catch (err) {
    return next(err);
  }
};

// ➤ Update snack (staff)
exports.updateSnack = async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid snack ID" });
    const { values, error } = readSnackInput(req.body, { partial: true });
    if (error) return res.status(400).json({ message: error });
    const snack = await Snack.findByIdAndUpdate(req.params.id, { $set: values }, { new: true, runValidators: true });
    if (!snack) return res.status(404).json({ message: "Snack not found" });
    return res.json(snack);
  } catch (err) {
    return next(err);
  }
};

// ➤ Delete snack (staff)
exports.deleteSnack = async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid snack ID" });
    const deleted = await Snack.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Snack not found" });
    return res.json({ message: "Snack deleted" });
  } catch (err) {
    return next(err);
  }
};
