const router = require("express").Router();
const parkingController = require("../controllers/parkingController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { adminAccess } = require("../middleware/adminMiddleware");

// Public: checkout needs the parking prices for a theatre
router.get("/theatre/:theatre", parkingController.getParkingByTheatre);

// Staff only
router.get("/all", authMiddleware, adminAccess, parkingController.getAllParking);
router.post("/", authMiddleware, adminAccess, parkingController.addParking);
router.put("/:id", authMiddleware, adminAccess, parkingController.updateParking);
router.delete("/:id", authMiddleware, adminAccess, parkingController.deleteParking);

module.exports = router;
