const router = require("express").Router();
const showController = require("../controllers/showController");
const { authMiddleware, authOrAdminSession, optionalAuth } = require("../middleware/authMiddleware");
const holdController = require("../controllers/holdController");
const { holdLimiter } = require("../middleware/security");
const { adminAccess } = require("../middleware/adminMiddleware");

// Public reads
router.get("/", showController.getAllShows);
router.get("/layouts", showController.getLayouts);
// Signed-in users also see which seats they hold and until when.
router.get("/single/:showId", optionalAuth, showController.getShowById);
router.get("/movie/:movieId", showController.getShowsByMovie);

// Temporary seat holds (signed in)
router.post("/:showId/holds", authMiddleware, holdLimiter, holdController.holdSeats);
router.delete("/:showId/holds", authMiddleware, holdLimiter, holdController.releaseSeats);

// Staff-only writes
router.post("/", authOrAdminSession, adminAccess, showController.addShow);
router.put("/:id", authOrAdminSession, adminAccess, showController.updateShow);
router.delete("/:id", authOrAdminSession, adminAccess, showController.deleteShow);

module.exports = router;
