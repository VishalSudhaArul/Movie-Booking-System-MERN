const router = require("express").Router();
const snackController = require("../controllers/snackController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { adminAccess } = require("../middleware/adminMiddleware");

// Public reads (specific routes first)
router.get("/all", snackController.getAllSnacks);
router.get("/combos", (req, res) => res.json(require("../utils/combos").COMBOS));
router.get("/theatre/:theatre", snackController.getSnacksByTheatre);

// Staff-only writes
router.post("/", authMiddleware, adminAccess, snackController.addSnack);
router.put("/:id", authMiddleware, adminAccess, snackController.updateSnack);
router.delete("/:id", authMiddleware, adminAccess, snackController.deleteSnack);

module.exports = router;
