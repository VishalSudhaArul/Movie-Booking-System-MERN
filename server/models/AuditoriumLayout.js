// AuditoriumLayout.js
// A hall designed in the admin layout editor. `layout` is the full layout built
// by utils/auditoriumLayouts.buildCustomLayout; `spec` is what the admin entered.
// Saved layouts are never edited: shows' seats were generated from them.

const mongoose = require("mongoose");

const auditoriumLayoutSchema = new mongoose.Schema(
  {
    layoutId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    spec: { type: mongoose.Schema.Types.Mixed, required: true },
    layout: { type: mongoose.Schema.Types.Mixed, required: true },
    totalSeats: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuditoriumLayout", auditoriumLayoutSchema);
