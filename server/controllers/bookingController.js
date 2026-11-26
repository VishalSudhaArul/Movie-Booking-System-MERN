// bookingController.js

const Show = require("../models/Show");
const Booking = require("../models/Booking");
const Snack = require("../models/Snack");
const Parking = require("../models/Parking");
const { evaluateCoupon } = require("../utils/coupons");
const { findCombo } = require("../utils/combos");
const { toObjectId, seatsFreeFor, unavailableSeats } = require("../utils/seatHolds");
const { hasStarted } = require("../utils/showTime");
const { isObjectId, cleanNumber, exactInsensitive } = require("../utils/validate");
const { isStaff } = require("../middleware/adminMiddleware");

const MAX_SEATS_PER_BOOKING = 10;
const MAX_SNACK_LINES = 20;
const MAX_SNACK_QTY = 20;
const SEAT_NUMBER_RE = /^[A-Z]{1,2}\d{1,3}$/;

const populateBooking = (query) =>
  query
    // Hold details of other users' seats never leave the server.
    .populate({ path: "showId", select: "-seats.heldBy -seats.holdExpiresAt", populate: { path: "movieId" } })
    .populate("userId", "name email");

const fail = (status, message, extra = {}) => {
  const err = new Error(message);
  err.status = status;
  err.extra = extra;
  return err;
};

const ownsBooking = (user, booking) => {
  const owner = booking.userId && booking.userId._id ? booking.userId._id : booking.userId;
  return String(owner) === user.id;
};

/* ---------------- PRICING (server side only) ---------------- */

// Every price comes from the database. Prices sent by the browser are ignored.
const priceSnacks = async (rawSnacks, theatre) => {
  if (rawSnacks === undefined || rawSnacks === null) return [];
  if (!Array.isArray(rawSnacks) || rawSnacks.length > MAX_SNACK_LINES) {
    throw fail(400, "Invalid snack selection");
  }

  const menu = await Snack.find({ theatre: exactInsensitive(theatre) }).lean();
  const byId = new Map(menu.map((s) => [String(s._id), s]));
  const byName = new Map(menu.map((s) => [String(s.name).trim().toLowerCase(), s]));

  const lines = new Map();
  rawSnacks.forEach((item) => {
    if (!item || typeof item !== "object") throw fail(400, "Invalid snack selection");
    const qty = cleanNumber(item.qty, { min: 1, max: MAX_SNACK_QTY, integer: true });
    if (qty === null) throw fail(400, `Snack quantity must be between 1 and ${MAX_SNACK_QTY}`);

    const combo = typeof item.snackId === "string" ? findCombo(item.snackId) : null;
    const snack = combo
      ? { _id: combo.id, name: combo.name, price: combo.comboPrice }
      : (isObjectId(item.snackId) && byId.get(item.snackId)) ||
        (typeof item.name === "string" && byName.get(item.name.trim().toLowerCase()));
    if (!snack) throw fail(400, "One of the snacks isn't sold at this theatre");

    const key = String(snack._id);
    const existing = lines.get(key);
    const total = (existing ? existing.qty : 0) + qty;
    if (total > MAX_SNACK_QTY) throw fail(400, `Snack quantity must be between 1 and ${MAX_SNACK_QTY}`);
    lines.set(key, { name: snack.name, price: Number(snack.price) || 0, qty: total });
  });

  return [...lines.values()];
};

const PARKING_FIELDS = { bike: "priceBike", car: "priceCar" };

const priceParking = async (rawParking, theatre) => {
  if (!rawParking) return null;
  const type = typeof rawParking === "object" ? String(rawParking.type || "").toLowerCase() : "";
  const field = PARKING_FIELDS[type];
  if (!field) throw fail(400, "Invalid parking option");

  const parking = await Parking.findOne({ theatre: exactInsensitive(theatre) }).lean();
  const price = parking ? Number(parking[field]) : NaN;
  if (!Number.isFinite(price) || price < 0) throw fail(400, "Parking isn't available at this theatre");

  return { type: type === "bike" ? "Bike" : "Car", price, theatre };
};

/* ---------------- BOOK SEATS ---------------- */

exports.bookSeats = async (req, res, next) => {
  try {
    const { showId, snacks, parking, couponCode } = req.body;
    // The booking always belongs to the signed-in user; any userId in the body is ignored.
    const userId = req.user.id;

    if (!isObjectId(showId)) return res.status(400).json({ message: "Invalid show ID" });

    if (!Array.isArray(req.body.seats) || req.body.seats.length === 0)
      return res.status(400).json({ message: "No seats selected" });

    if (req.body.seats.length > MAX_SEATS_PER_BOOKING * 2)
      return res.status(400).json({ message: `You can book up to ${MAX_SEATS_PER_BOOKING} seats at a time` });

    const seats = [...new Set(req.body.seats.map((s) => String(s).trim().toUpperCase()))];

    if (seats.some((s) => !SEAT_NUMBER_RE.test(s)))
      return res.status(400).json({ message: "Invalid seat number" });

    if (seats.length > MAX_SEATS_PER_BOOKING)
      return res.status(400).json({ message: `You can book up to ${MAX_SEATS_PER_BOOKING} seats at a time` });

    const show = await Show.findById(showId);
    if (!show) return res.status(404).json({ message: "Show not found" });
    if (hasStarted(show)) return res.status(400).json({ message: "This showtime has already started, so it can't be booked" });

    const selectedSeatObjects = show.seats.filter((s) => seats.includes(s.seatNumber));
    if (selectedSeatObjects.length !== seats.length)
      return res.status(400).json({ message: "One or more seats do not exist for this show" });

    /* ----------- Price everything before touching seats ----------- */

    const cleanSnacks = await priceSnacks(snacks, show.theatre);
    const cleanParking = await priceParking(parking, show.theatre);

    const seatTotal = selectedSeatObjects.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
    const snacksTotal = cleanSnacks.reduce((sum, s) => sum + s.price * s.qty, 0);
    const subtotal = seatTotal + snacksTotal + (cleanParking ? cleanParking.price : 0);

    let discount = 0;
    let appliedCoupon;
    if (couponCode !== undefined && couponCode !== null && couponCode !== "") {
      if (typeof couponCode !== "string" || couponCode.length > 40)
        return res.status(400).json({ message: "Invalid promo code" });
      const result = await evaluateCoupon(couponCode, subtotal);
      if (!result.ok) return res.status(400).json({ message: result.message });
      discount = result.discountAmount;
      appliedCoupon = result.coupon.code;
    }

    const totalPrice = Math.max(0, subtotal - discount);

    /* ----------- Reserve seats atomically ----------- */
    // The filter only matches while none of the requested seats is booked, and
    // MongoDB applies it and the update as one step on the show document, so two
    // simultaneous requests for the same seat can never both succeed.

    // Seats on hold for someone else count as taken; this user's own holds
    // (and expired holds) don't. Booking also clears this user's holds here.
    const now = new Date();
    const me = toObjectId(userId);
    const reserved = await Show.findOneAndUpdate(
      { _id: showId, seats: seatsFreeFor(seats, userId, now) },
      {
        $set: {
          "seats.$[seat].isBooked": true,
          "seats.$[seat].heldBy": null,
          "seats.$[seat].holdExpiresAt": null,
          "seats.$[mine].heldBy": null,
          "seats.$[mine].holdExpiresAt": null,
        },
      },
      {
        arrayFilters: [
          { "seat.seatNumber": { $in: seats } },
          { "mine.heldBy": me, "mine.seatNumber": { $nin: seats } },
        ],
        new: true,
      }
    );

    if (!reserved) {
      const latest = await Show.findById(showId).select("seats").lean();
      return res.status(409).json({
        message: "Some seats were just booked or reserved by someone else",
        seats: unavailableSeats(latest, seats, userId, now),
      });
    }

    try {
      const booking = await Booking.create({
        showId,
        seats,
        userId,
        snacks: cleanSnacks,
        parking: cleanParking || undefined,
        couponCode: appliedCoupon,
        discountAmount: discount,
        totalPrice,
        pricing: {
          seats: selectedSeatObjects.map((s) => ({ seatNumber: s.seatNumber, category: s.category, price: Number(s.price) || 0 })),
          seatTotal,
          snacksTotal,
          parkingTotal: cleanParking ? cleanParking.price : 0,
          subtotal,
          discount,
          total: totalPrice,
        },
        // Demo checkout: no money is taken, and the record says so.
        paymentStatus: "Demo",
        paymentMode: "DEMO",
        used: false,
      });

      const populatedBooking = await populateBooking(Booking.findById(booking._id));
      return res.status(201).json(populatedBooking);
    } catch (err) {
      // Release the seats if the booking record could not be saved.
      await Show.updateOne(
        { _id: showId },
        { $set: { "seats.$[seat].isBooked": false } },
        { arrayFilters: [{ "seat.seatNumber": { $in: seats } }] }
      );
      throw err;
    }
  } catch (err) {
    if (err.status && err.status < 500) {
      return res.status(err.status).json({ message: err.message, ...err.extra });
    }
    return next(err);
  }
};

/* ---------------- USER BOOKINGS ---------------- */

exports.getUserBookings = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!isObjectId(userId)) return res.status(400).json({ message: "Invalid user ID" });

    const bookings = await populateBooking(Booking.find({ userId }).sort({ createdAt: -1 }));
    return res.json(bookings);
  } catch (err) {
    return next(err);
  }
};

/* ---------------- ALL BOOKINGS (ADMIN) ---------------- */

exports.getAllBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find()
      .sort({ createdAt: -1 })
      .limit(500)
      .populate({ path: "showId", select: "-seats", populate: { path: "movieId", select: "title poster" } })
      .populate("userId", "name email");
    return res.json(bookings);
  } catch (err) {
    return next(err);
  }
};

/* ---------------- GET BOOKING BY ID (owner or staff) ---------------- */

exports.getBookingById = async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid booking ID" });

    const booking = await populateBooking(Booking.findById(req.params.id));
    // 404 for someone else's booking too, so IDs can't be probed.
    if (!booking || !(isStaff(req.user) || ownsBooking(req.user, booking))) {
      return res.status(404).json({ message: "Booking not found" });
    }
    return res.json(booking);
  } catch (err) {
    return next(err);
  }
};

/* ---------------- MARK TICKET USED (staff) ---------------- */

exports.markAsUsed = async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid booking ID" });

    // Atomic: only one scan can flip an unused ticket to used.
    const updated = await Booking.findOneAndUpdate(
      { _id: req.params.id, used: { $ne: true } },
      { $set: { used: true, status: "USED" } },
      { new: true }
    );

    if (updated) return res.json({ message: "Ticket marked as used", alreadyUsed: false });

    const exists = await Booking.exists({ _id: req.params.id });
    if (!exists) return res.status(404).json({ message: "Booking not found" });
    return res.json({ message: "Ticket already used", alreadyUsed: true });
  } catch (err) {
    return next(err);
  }
};

/* ---------------- PARKING REVENUE (staff) ---------------- */

exports.getParkingRevenue = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ "parking.price": { $gt: 0 } }).select("parking").lean();
    const revenue = {};
    bookings.forEach((b) => {
      if (!b.parking) return;
      const theatre = b.parking.theatre;
      revenue[theatre] = (revenue[theatre] || 0) + b.parking.price;
    });
    return res.json(revenue);
  } catch (err) {
    return next(err);
  }
};

exports.ownsBooking = ownsBooking;
exports.populateBooking = populateBooking;
exports.MAX_SEATS_PER_BOOKING = MAX_SEATS_PER_BOOKING;
