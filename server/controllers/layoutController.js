// layoutController.js
// Auditorium layouts: the built-in halls plus halls designed in the admin
// layout editor. A preview builds a layout without saving anything, so an admin
// can check it before it exists. Saved custom layouts are immutable, and one
// that any showtime uses can't be removed.

const crypto = require("crypto");
const AuditoriumLayout = require("../models/AuditoriumLayout");
const Show = require("../models/Show");
const {
  getLayout,
  listLayouts,
  withOrder,
  buildCustomLayout,
  setCustomLayouts,
  addCustomLayout,
  removeCustomLayout,
  isBuiltInLayout,
} = require("../utils/auditoriumLayouts");

/** Reads every saved custom layout into the in-memory registry. */
const loadCustomLayouts = async () => {
  const saved = await AuditoriumLayout.find().select("layout").lean();
  setCustomLayouts(saved.map((d) => d.layout));
  return saved.length;
};

/** getLayout, falling back to the database for a layout saved by another server instance. */
const ensureLayout = async (id) => {
  if (typeof id !== "string") return null;
  const known = getLayout(id);
  if (known || isBuiltInLayout(id)) return known;
  const doc = await AuditoriumLayout.findOne({ layoutId: id }).select("layout").lean();
  if (!doc) return null;
  addCustomLayout(doc.layout);
  return getLayout(id);
};

const slug = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30) || "hall";

// Only the fields the builder reads, so nothing else is stored.
const cleanSpec = (body) => ({
  name: body && body.name,
  wheelchairSpaces: body && body.wheelchairSpaces,
  ...(body && body.crossAisleBefore !== undefined && body.crossAisleBefore !== null ? { crossAisleBefore: body.crossAisleBefore } : {}),
  rows:
    body && Array.isArray(body.rows)
      ? body.rows.map((r) => ({ blocks: r && r.blocks, section: r && r.section, seatType: (r && r.seatType) || "standard" }))
      : body && body.rows,
});

const usage = async () => {
  const counts = await Show.aggregate([{ $group: { _id: { $ifNull: ["$layoutId", "classic-136"] }, shows: { $sum: 1 } } }]);
  return new Map(counts.map((c) => [c._id, c.shows]));
};

/* GET /api/layouts — every layout, with how many showtimes use it (staff). */
exports.list = async (req, res, next) => {
  try {
    const used = await usage();
    return res.json(listLayouts().map((l) => ({ ...l, shows: used.get(l.id) || 0 })));
  } catch (err) {
    return next(err);
  }
};

/* GET /api/layouts/:id — the full hall plan, for previews (public, like a show's layout). */
exports.getOne = async (req, res, next) => {
  try {
    const layout = await ensureLayout(String(req.params.id));
    if (!layout) return res.status(404).json({ message: "Layout not found" });
    return res.json(layout);
  } catch (err) {
    return next(err);
  }
};

/* POST /api/layouts/preview — build without saving (staff). */
exports.preview = (req, res, next) => {
  try {
    return res.json(withOrder(buildCustomLayout(cleanSpec(req.body))));
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ message: err.message });
    return next(err);
  }
};

/* POST /api/layouts — save a new custom layout (staff). */
exports.create = async (req, res, next) => {
  try {
    const spec = cleanSpec(req.body);
    const id = `custom-${slug(String(spec.name || ""))}-${crypto.randomBytes(3).toString("hex")}`;
    const layout = buildCustomLayout(spec, id);
    const ordered = withOrder(layout);
    await AuditoriumLayout.create({ layoutId: id, name: layout.name, spec, layout, totalSeats: ordered.totalSeats });
    addCustomLayout(layout);
    return res.status(201).json(ordered);
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ message: err.message });
    return next(err);
  }
};

/* DELETE /api/layouts/:id — only unused custom layouts (staff). */
exports.remove = async (req, res, next) => {
  try {
    const id = String(req.params.id);
    if (isBuiltInLayout(id)) return res.status(400).json({ message: "Built-in halls can't be removed" });
    const doc = await AuditoriumLayout.findOne({ layoutId: id }).select("_id").lean();
    if (!doc) return res.status(404).json({ message: "Layout not found" });
    const shows = await Show.countDocuments({ layoutId: id });
    if (shows > 0) {
      return res
        .status(409)
        .json({ message: `This hall is used by ${shows} showtime${shows === 1 ? "" : "s"}, so it can't be removed.` });
    }
    await AuditoriumLayout.deleteOne({ _id: doc._id });
    removeCustomLayout(id);
    return res.json({ message: "Layout removed" });
  } catch (err) {
    return next(err);
  }
};

exports.loadCustomLayouts = loadCustomLayouts;
exports.ensureLayout = ensureLayout;
