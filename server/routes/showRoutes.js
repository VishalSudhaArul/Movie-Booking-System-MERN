const router = require("express").Router();
const showController = require("../controllers/showController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { adminAccess } = require("../middleware/adminMiddleware");

// Public reads
router.get("/", showController.getAllShows);
router.get("/single/:showId", showController.getShowById);
router.get("/movie/:movieId", showController.getShowsByMovie);

// Staff-only writes
router.post("/", authMiddleware, adminAccess, showController.addShow);
router.put("/:id", authMiddleware, adminAccess, showController.updateShow);
router.delete("/:id", authMiddleware, adminAccess, showController.deleteShow);

module.exports = router;
