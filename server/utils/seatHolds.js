// seatHolds.js
// Rules for temporary seat holds, shared by the hold endpoints and booking.
//
// A seat is unavailable to user U when it is booked, or when someone other than
// U holds it and that hold has not expired yet. Every check below is part of a
// single MongoDB update on the show document, so it can't race.

const mongoose = require("mongoose");

const HOLD_MINUTES = Number(process.env.SEAT_HOLD_MINUTES) || 8;
const HOLD_MS = HOLD_MINUTES * 60 * 1000;

const toObjectId = (id) => new mongoose.Types.ObjectId(String(id));

// Matches a seat that is held by another user right now.
const heldByOtherNow = (userId, now) => ({
  heldBy: { $nin: [null, toObjectId(userId)] },
  holdExpiresAt: { $gt: now },
});

// Filter part: "none of these seats is booked or actively held by someone else".
const seatsFreeFor = (seats, userId, now) => ({
  $not: {
    $elemMatch: {
      seatNumber: { $in: seats },
      $or: [{ isBooked: true }, heldByOtherNow(userId, now)],
    },
  },
});

// Lists which of the requested seats are unavailable to this user.
const unavailableSeats = (showDoc, seats, userId, now = new Date()) =>
  (showDoc?.seats || [])
    .filter(
      (s) =>
        seats.includes(s.seatNumber) &&
        (s.isBooked ||
          (s.heldBy && String(s.heldBy) !== String(userId) && s.holdExpiresAt && new Date(s.holdExpiresAt) > now))
    )
    .map((s) => s.seatNumber);

// Adds per-user hold details to a show's JSON: which seats this user holds and until when.
const showForUser = (showDoc, userId, now = new Date()) => {
  const json = showDoc.toJSON();
  if (!userId) return json;
  json.seats = json.seats.map((seat, i) => {
    const raw = showDoc.seats[i];
    const mine =
      !raw.isBooked &&
      raw.heldBy &&
      String(raw.heldBy) === String(userId) &&
      raw.holdExpiresAt &&
      raw.holdExpiresAt > now;
    if (!mine) return seat;
    return { ...seat, isHeld: false, heldByMe: true, holdExpiresAt: raw.holdExpiresAt };
  });
  return json;
};

module.exports = { HOLD_MINUTES, HOLD_MS, toObjectId, heldByOtherNow, seatsFreeFor, unavailableSeats, showForUser };
