// parkingController.js

const Parking = require("../models/Parking");
const { isObjectId, cleanString, cleanNumber, exactInsensitive } = require("../utils/validate");

const NUMBER_FIELDS = ["priceBike", "priceCar", "bikeSlots", "carSlots"];

const readParkingInput = (body, { partial = false } = {}) => {
  const out = {};
  if (!partial || body.theatre !== undefined) {
    const theatre = cleanString(body.theatre, { max: 120 });
    if (!theatre) return { error: "Choose a theatre" };
    out.theatre = theatre;
  }
  for (const field of NUMBER_FIELDS) {
    if (body[field] === undefined || body[field] === "") continue;
    const n = cleanNumber(body[field], { min: 0, max: 100000 });
    if (n === null) return { error: "Parking prices and slots must be numbers between 0 and 100000" };
    out[field] = n;
  }
  return { values: out };
};

// ➤ Add parking setup (staff)
exports.addParking = async (req, res, next) => {
  try {
    const { values, error } = readParkingInput(req.body);
    if (error) return res.status(400).json({ message: error });
    if (await Parking.exists({ theatre: exactInsensitive(values.theatre) })) {
      return res.status(409).json({ message: "Parking is already set up for this theatre" });
    }
    const parking = await Parking.create(values);
    return res.status(201).json(parking);
  } catch (err) {
    return next(err);
  }
};

// ➤ Get parking by theatre (public: shown at checkout)
exports.getParkingByTheatre = async (req, res, next) => {
  try {
    const theatre = cleanString(req.params.theatre, { max: 120 });
    if (!theatre) return res.json(null);
    const parking = await Parking.findOne({ theatre: exactInsensitive(theatre) });
    return res.json(parking);
  } catch (err) {
    return next(err);
  }
};

// ➤ All parking setups (staff)
exports.getAllParking = async (req, res, next) => {
  try {
    const data = await Parking.find();
    return res.json(data);
  } catch (err) {
    return next(err);
  }
};

// ➤ Update parking (staff)
exports.updateParking = async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid parking ID" });
    const { values, error } = readParkingInput(req.body, { partial: true });
    if (error) return res.status(400).json({ message: error });
    const data = await Parking.findByIdAndUpdate(req.params.id, { $set: values }, { new: true, runValidators: true });
    if (!data) return res.status(404).json({ message: "Parking setup not found" });
    return res.json(data);
  } catch (err) {
    return next(err);
  }
};

// ➤ Delete parking (staff)
exports.deleteParking = async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid parking ID" });
    const deleted = await Parking.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Parking setup not found" });
    return res.json({ message: "Deleted" });
  } catch (err) {
    return next(err);
  }
};
