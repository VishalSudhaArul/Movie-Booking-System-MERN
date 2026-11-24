// holdController.js
// Temporary seat holds: a signed-in user reserves seats for a few minutes while
// they check out, so nobody else can take them in the meantime.

const Show = require("../models/Show");
const { isObjectId } = require("../utils/validate");
const { HOLD_MS, HOLD_MINUTES, toObjectId, seatsFreeFor, unavailableSeats } = require("../utils/seatHolds");
const { MAX_SEATS_PER_BOOKING } = require("./bookingController");

const SEAT_NUMBER_RE = /^[A-Z]{1,2}\d{1,3}$/;

// POST /api/shows/:showId/holds  { seats: ["A1", "A2"] }
// Replaces this user's hold on the show with exactly these seats and restarts
// the timer. Sending an empty list releases the hold.
exports.holdSeats = async (req, res, next) => {
  try {
    const { showId } = req.params;
    if (!isObjectId(showId)) return res.status(400).json({ message: "Invalid show ID" });
    if (!Array.isArray(req.body.seats) || req.body.seats.length > MAX_SEATS_PER_BOOKING * 2) {
      return res.status(400).json({ message: `Choose up to ${MAX_SEATS_PER_BOOKING} seats` });
    }

    const seats = [...new Set(req.body.seats.map((s) => String(s).trim().toUpperCase()))];
    if (seats.some((s) => !SEAT_NUMBER_RE.test(s))) return res.status(400).json({ message: "Invalid seat number" });
    if (seats.length > MAX_SEATS_PER_BOOKING) {
      return res.status(400).json({ message: `You can hold up to ${MAX_SEATS_PER_BOOKING} seats at a time` });
    }

    if (seats.length === 0) return exports.releaseSeats(req, res, next);

    const show = await Show.findById(showId).select("seats.seatNumber");
    if (!show) return res.status(404).json({ message: "Show not found" });
    const existing = new Set(show.seats.map((s) => s.seatNumber));
    if (seats.some((s) => !existing.has(s))) {
      return res.status(400).json({ message: "One or more seats do not exist for this show" });
    }

    const userId = toObjectId(req.user.id);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + HOLD_MS);

    // One atomic update: only succeeds if every requested seat is free for this
    // user; holds the requested seats and releases this user's other holds here.
    const updated = await Show.findOneAndUpdate(
      { _id: showId, seats: seatsFreeFor(seats, req.user.id, now) },
      {
        $set: {
          "seats.$[pick].heldBy": userId,
          "seats.$[pick].holdExpiresAt": expiresAt,
          "seats.$[drop].heldBy": null,
          "seats.$[drop].holdExpiresAt": null,
        },
      },
      {
        new: true,
        arrayFilters: [
          { "pick.seatNumber": { $in: seats } },
          { "drop.heldBy": userId, "drop.seatNumber": { $nin: seats } },
        ],
      }
    );

    if (!updated) {
      const latest = await Show.findById(showId).select("seats").lean();
      return res.status(409).json({
        message: "Some of those seats were just taken by someone else",
        seats: unavailableSeats(latest, seats, req.user.id, now),
      });
    }

    return res.json({ seats, expiresAt, holdMinutes: HOLD_MINUTES });
  } catch (err) {
    return next(err);
  }
};

// DELETE /api/shows/:showId/holds — releases all of this user's holds on the show.
exports.releaseSeats = async (req, res, next) => {
  try {
    const { showId } = req.params;
    if (!isObjectId(showId)) return res.status(400).json({ message: "Invalid show ID" });
    const userId = toObjectId(req.user.id);
    const result = await Show.updateOne(
      { _id: showId },
      { $set: { "seats.$[mine].heldBy": null, "seats.$[mine].holdExpiresAt": null } },
      { arrayFilters: [{ "mine.heldBy": userId }] }
    );
    if (result.matchedCount === 0) return res.status(404).json({ message: "Show not found" });
    return res.json({ seats: [], expiresAt: null });
  } catch (err) {
    return next(err);
  }
};
