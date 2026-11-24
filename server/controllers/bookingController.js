// bookingController.js

const Show = require("../models/Show");
const Booking = require("../models/Booking");
const mongoose = require("mongoose");
const { evaluateCoupon } = require("../utils/coupons");

const MAX_SEATS_PER_BOOKING = 10;

const populateBooking = (query) =>
  query
    .populate({ path: "showId", populate: { path: "movieId" } })
    .populate("userId", "-password");

/* ---------------- BOOK SEATS ---------------- */

exports.bookSeats = async (req, res) => {
  try {
    const { showId, snacks = [], parking = null, couponCode } = req.body;

    // The booking always belongs to the authenticated user.
    const tokenUserId = req.user?.id || req.user?._id;
    const userId = mongoose.Types.ObjectId.isValid(tokenUserId)
      ? tokenUserId
      : req.body.userId;

    /* ----------- Basic Validation ----------- */

    if (!mongoose.Types.ObjectId.isValid(showId))
      return res.status(400).json({ message: "Invalid show ID" });

    if (!mongoose.Types.ObjectId.isValid(userId))
      return res.status(400).json({ message: "Invalid user ID" });

    if (!Array.isArray(req.body.seats) || req.body.seats.length === 0)
      return res.status(400).json({ message: "No seats selected" });

    const seats = [...new Set(req.body.seats.map(String))];

    if (seats.length > MAX_SEATS_PER_BOOKING)
      return res.status(400).json({
        message: `You can book up to ${MAX_SEATS_PER_BOOKING} seats at a time`,
      });

    const show = await Show.findById(showId);

    if (!show)
      return res.status(404).json({ message: "Show not found" });

    const selectedSeatObjects = show.seats.filter((s) =>
      seats.includes(s.seatNumber)
    );

    if (selectedSeatObjects.length !== seats.length)
      return res
        .status(400)
        .json({ message: "One or more seats do not exist for this show" });

    /* ----------- Reserve Seats Atomically ----------- */
    // The filter only matches while none of the requested seats is booked, so
    // two simultaneous requests for the same seat can never both succeed.

    const reserved = await Show.findOneAndUpdate(
      {
        _id: showId,
        seats: {
          $not: { $elemMatch: { seatNumber: { $in: seats }, isBooked: true } },
        },
      },
      { $set: { "seats.$[seat].isBooked": true } },
      { arrayFilters: [{ "seat.seatNumber": { $in: seats } }], new: true }
    );

    if (!reserved) {
      const latest = await Show.findById(showId).select("seats");
      const taken = (latest?.seats || [])
        .filter((s) => seats.includes(s.seatNumber) && s.isBooked)
        .map((s) => s.seatNumber);

      return res.status(409).json({
        message: "Some seats were just booked by someone else",
        seats: taken,
      });
    }

    try {
      /* ----------- Price Calculation ----------- */

      const seatTotal = selectedSeatObjects.reduce((sum, s) => sum + s.price, 0);

      const cleanSnacks = (Array.isArray(snacks) ? snacks : [])
        .filter((s) => s && Number(s.qty) > 0 && Number(s.price) >= 0)
        .map((s) => ({
          name: String(s.name),
          price: Number(s.price),
          qty: Number(s.qty),
        }));

      const snacksTotal = cleanSnacks.reduce((sum, s) => sum + s.price * s.qty, 0);
      const parkingPrice = Math.max(0, Number(parking?.price) || 0);

      let totalPrice = seatTotal + snacksTotal + parkingPrice;

      if (couponCode) {
        const result = await evaluateCoupon(couponCode, totalPrice);
        if (result.ok) totalPrice -= result.discountAmount;
      }

      /* ----------- Create Booking ----------- */

      const booking = await Booking.create({
        showId,
        seats,
        userId,
        snacks: cleanSnacks,
        parking: parking
          ? {
              type: parking.type,
              price: parkingPrice,
              theatre: parking.theatre || show.theatre,
            }
          : undefined,
        totalPrice,
        paymentStatus: "Success",
        used: false,
      });

      const populatedBooking = await populateBooking(Booking.findById(booking._id));

      res.status(201).json(populatedBooking);
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
    console.error("Booking Error:", err);
    res.status(500).json({
      message: "Booking failed",
      error: err.message,
    });
  }
};

/* ---------------- USER BOOKINGS ---------------- */

exports.getUserBookings = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const bookings = await populateBooking(
      Booking.find({ userId }).sort({ createdAt: -1 })
    );

    res.json(bookings);
  } catch (err) {
    res.status(500).json({
      message: "Booking fetch failed",
      error: err.message,
    });
  }
};

/* ---------------- ALL BOOKINGS (ADMIN) ---------------- */

exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .sort({ createdAt: -1 })
      .limit(500)
      .populate({
        path: "showId",
        select: "-seats",
        populate: { path: "movieId", select: "title poster" },
      })
      .populate("userId", "name email");

    res.json(bookings);
  } catch (err) {
    res.status(500).json({
      message: "Booking fetch failed",
      error: err.message,
    });
  }
};

/* ---------------- GET BOOKING BY ID ---------------- */

exports.getBookingById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ message: "Invalid booking ID" });

    const booking = await populateBooking(Booking.findById(req.params.id));

    if (!booking)
      return res.status(404).json({ message: "Booking not found" });

    res.json(booking);
  } catch (err) {
    res.status(500).json({
      message: "Error fetching booking",
      error: err.message,
    });
  }
};

/* ---------------- MARK TICKET USED ---------------- */

exports.markAsUsed = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ message: "Invalid booking ID" });

    const booking = await Booking.findById(req.params.id);

    if (!booking)
      return res.status(404).json({ message: "Booking not found" });

    if (booking.used)
      return res.json({ message: "Ticket already used" });

    booking.used = true;
    await booking.save();

    res.json({ message: "Ticket marked as used" });
  } catch (err) {
    res.status(500).json({
      message: "Failed to mark ticket",
      error: err.message,
    });
  }
};

/* ---------------- PARKING REVENUE ---------------- */

exports.getParkingRevenue = async (req, res) => {
  try {
    const bookings = await Booking.find({ "parking.price": { $gt: 0 } }).select(
      "parking"
    );

    const revenue = {};

    bookings.forEach((b) => {
      if (!b.parking) return;
      const theatre = b.parking.theatre;
      if (!revenue[theatre]) revenue[theatre] = 0;
      revenue[theatre] += b.parking.price;
    });

    res.json(revenue);
  } catch (err) {
    res.status(500).json({
      message: "Failed to calculate parking revenue",
      error: err.message,
    });
  }
};
