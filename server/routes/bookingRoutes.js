// bookingRoutes.js

const router = require("express").Router();
const bookingController = require("../controllers/bookingController");
const Booking = require("../models/Booking");
const { authMiddleware } = require("../middleware/authMiddleware");
const { adminAccess, selfOrAdmin, isStaff } = require("../middleware/adminMiddleware");
const { bookingLimiter } = require("../middleware/security");
const { isObjectId } = require("../utils/validate");

/* ── VERIFY BOOKING (QR scan) ── owner or staff ── must be BEFORE /:id ── */
router.get("/verify/:id", authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ message: "Invalid booking ID" });

    const booking = await bookingController.populateBooking(Booking.findById(id));
    if (!booking || !(isStaff(req.user) || bookingController.ownsBooking(req.user, booking))) {
      return res.status(404).json({ message: "Booking not found" });
    }
    return res.json(booking);
  } catch (err) {
    return next(err);
  }
});

/* ── BOOK SEATS ── */
router.post("/", authMiddleware, bookingLimiter, bookingController.bookSeats);

/* ── USER BOOKING HISTORY ── only your own, unless staff ── */
router.get(
  "/user/:userId",
  authMiddleware,
  selfOrAdmin((req) => req.params.userId),
  bookingController.getUserBookings
);

/* ── PARKING REVENUE (staff) ── */
router.get("/parking-revenue", authMiddleware, adminAccess, bookingController.getParkingRevenue);

/* ── ALL BOOKINGS (staff) ── must be BEFORE /:id ── */
router.get("/all", authMiddleware, adminAccess, bookingController.getAllBookings);

/* ── GET SINGLE BOOKING ── owner or staff ── */
router.get("/:id", authMiddleware, bookingController.getBookingById);

/* ── MARK TICKET AS USED (staff at the entrance) ── */
router.put("/use/:id", authMiddleware, adminAccess, bookingController.markAsUsed);

module.exports = router;
