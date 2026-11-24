// bookingRoutes.js

const router = require("express").Router();
const bookingController = require("../controllers/bookingController");
const Booking = require("../models/Booking");
const mongoose = require("mongoose");
const { authMiddleware } = require("../middleware/authMiddleware");
const { adminAccess } = require("../middleware/adminMiddleware");

/* ── VERIFY BOOKING (QR Scan) ─── must be BEFORE /:id ─── */
router.get("/verify/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    const booking = await Booking.findById(id)
      .populate({ path: "showId", populate: { path: "movieId" } })
      .populate("userId", "-password");

    if (!booking) return res.status(404).json(null);

    res.json(booking);
  } catch (error) {
    console.error("Verify error:", error);
    res.status(500).json(null);
  }
});

/* ── BOOK SEATS ── */
router.post("/", authMiddleware, bookingController.bookSeats);

/* ── USER BOOKING HISTORY ── */
router.get("/user/:userId", bookingController.getUserBookings);

/* ── PARKING REVENUE ── */
router.get("/parking-revenue", bookingController.getParkingRevenue);

/* ── ALL BOOKINGS (Admin) ─── must be BEFORE /:id ─── */
router.get("/all", authMiddleware, adminAccess, bookingController.getAllBookings);

/* ── GET SINGLE BOOKING ── */
router.get("/:id", bookingController.getBookingById);

/* ── MARK TICKET AS USED ── */
router.put("/use/:id", bookingController.markAsUsed);

module.exports = router;
