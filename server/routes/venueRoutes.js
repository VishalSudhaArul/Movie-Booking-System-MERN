const router = require("express").Router();
const venueController = require("../controllers/venueController");
const { authOrAdminSession } = require("../middleware/authMiddleware");
const { adminAccess } = require("../middleware/adminMiddleware");

router.get("/lookup", venueController.lookup);
router.get("/", authOrAdminSession, adminAccess, venueController.list);
router.post("/", authOrAdminSession, adminAccess, venueController.create);
router.put("/:id", authOrAdminSession, adminAccess, venueController.update);
router.delete("/:id", authOrAdminSession, adminAccess, venueController.remove);

module.exports = router;
