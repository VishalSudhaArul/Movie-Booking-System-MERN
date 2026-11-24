const router = require("express").Router();
const controller = require("../controllers/analyticsController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { adminAccess } = require("../middleware/adminMiddleware");

// Revenue figures are staff-only.
router.get("/", authMiddleware, adminAccess, controller.getAnalytics);

module.exports = router;
