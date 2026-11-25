const router = require("express").Router();
const controller = require("../controllers/analyticsController");
const { authOrAdminSession } = require("../middleware/authMiddleware");
const { adminAccess } = require("../middleware/adminMiddleware");

// Revenue figures are staff-only.
router.get("/", authOrAdminSession, adminAccess, controller.getAnalytics);

module.exports = router;
