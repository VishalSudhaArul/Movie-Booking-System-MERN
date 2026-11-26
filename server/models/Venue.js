// Venue.js
// Wayfinding details a theatre publishes: address, entry instructions and the
// places inside the building (entrances, food counter, restrooms, exits...).
// `name` matches the `theatre` text on shows. Nothing here is invented by the
// app: a venue only has the points an admin entered.

const mongoose = require("mongoose");

const POINT_KINDS = ["entrance", "auditorium", "food", "restroom", "exit", "accessible", "parking", "info"];

const pointSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: POINT_KINDS, required: true },
    label: { type: String, required: true, maxlength: 60 },
    directions: { type: String, default: "", maxlength: 300 },
  },
  { _id: false }
);

const venueSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 120 },
    // Lower-cased name, so lookups from a show's theatre text ignore case.
    key: { type: String, required: true, unique: true },
    address: { type: String, default: "", maxlength: 200 },
    mapUrl: { type: String, default: "" },
    entryInstructions: { type: String, default: "", maxlength: 500 },
    points: { type: [pointSchema], default: [] },
  },
  { timestamps: true }
);

venueSchema.statics.POINT_KINDS = POINT_KINDS;

module.exports = mongoose.model("Venue", venueSchema);
