// const router = require("express").Router();
// const bookingController = require("../controllers/bookingController");
// const Booking = require("../models/Booking");


// // 🎟 Book Seats
// router.post("/", bookingController.bookSeats);


// // 📜 Get Booking History of User
// router.get("/user/:userId", bookingController.getUserBookings);


// // ⭐ VERIFY QR (Place BEFORE /:id)
// // VERIFY ROUTE FIRST
// router.get("/verify/:id", async (req, res) => {
//   try {

//     console.log("Verify request received:", req.params.id);

//     const booking = await Booking.findById(req.params.id)
//       .populate({
//         path: "showId",
//         populate: { path: "movieId" }
//       });

//     if (!booking) {
//       return res.json(null);
//     }

//     res.json(booking);

//   } catch (error) {
//     console.log(error);
//     res.json(null);
//   }
// });


// // THEN this
// router.get("/:id", bookingController.getBookingById);



// // ⭐ Mark ticket used
// router.put("/use/:id", bookingController.markAsUsed);


// // ⭐ Keep THIS always last
// router.get("/:id", bookingController.getBookingById);


// module.exports = router;





// const express = require("express");
// const router = express.Router();

// const bookingController = require("../controllers/bookingController");
// const Booking = require("../models/Booking");


// // 🎟 Book Seats
// router.post("/", bookingController.bookSeats);


// // 📜 Get Booking History of User
// router.get("/user/:userId", bookingController.getUserBookings);


// // ✅ VERIFY ROUTE (QR SCAN ROUTE)
// router.get("/verify/:id", async (req, res) => {
//   try {

//     console.log("Verify request received:", req.params.id);

//     if (!req.params.id) {
//       return res.json(null);
//     }

//     const booking = await Booking.findById(req.params.id)
//       .populate({
//         path: "showId",
//         populate: { path: "movieId" }
//       });

//     if (!booking) {
//       return res.json(null);
//     }

//     res.json(booking);

//   } catch (error) {
//     console.log(error);
//     res.json(null);
//   }
// });


// // 📄 Get Single Booking
// router.get("/:id", bookingController.getBookingById);


// // ✅ Mark ticket used
// router.put("/use/:id", bookingController.markAsUsed);


// module.exports = router;








// bookingRoutes.js


const router = require("express").Router();
const bookingController = require("../controllers/bookingController");
const Booking = require("../models/Booking");


// ✅ VERIFY ROUTE MUST BE FIRST
router.get("/verify/:id", async (req, res) => {
  try {

    console.log("Verify request received:", req.params.id);

    const booking = await Booking.findById(req.params.id)
      .populate({
        path: "showId",
        populate: { path: "movieId" }
      });

    if (!booking) return res.json(null);

    res.json(booking);

  } catch (error) {
    console.log(error);
    res.json(null);
  }
});


// 🎟 Book Seats
router.post("/", bookingController.bookSeats);


// 📜 User bookings
router.get("/user/:userId", bookingController.getUserBookings);


// 📄 Single booking
router.get("/:id", bookingController.getBookingById);


// ✅ Mark Used
router.put("/use/:id", bookingController.markAsUsed);

module.exports = router;

router.get("/parking-revenue",
 bookingController.getParkingRevenue
);


