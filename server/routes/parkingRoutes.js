const router = require("express").Router();
const parkingController = require("../controllers/parkingController");
const { authOrAdminSession } = require("../middleware/authMiddleware");
const { adminAccess } = require("../middleware/adminMiddleware");

// Public: checkout needs the parking prices for a theatre
router.get("/theatre/:theatre", parkingController.getParkingByTheatre);

// Staff only
router.get("/all", authOrAdminSession, adminAccess, parkingController.getAllParking);
router.post("/", authOrAdminSession, adminAccess, parkingController.addParking);
router.put("/:id", authOrAdminSession, adminAccess, parkingController.updateParking);
router.delete("/:id", authOrAdminSession, adminAccess, parkingController.deleteParking);

module.exports = router;
