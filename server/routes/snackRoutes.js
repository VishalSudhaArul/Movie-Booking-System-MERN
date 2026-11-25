const router = require("express").Router();
const snackController = require("../controllers/snackController");
const { authOrAdminSession } = require("../middleware/authMiddleware");
const { adminAccess } = require("../middleware/adminMiddleware");

// Public reads (specific routes first)
router.get("/all", snackController.getAllSnacks);
router.get("/combos", (req, res) => res.json(require("../utils/combos").COMBOS));
router.get("/theatre/:theatre", snackController.getSnacksByTheatre);

// Staff-only writes
router.post("/", authOrAdminSession, adminAccess, snackController.addSnack);
router.put("/:id", authOrAdminSession, adminAccess, snackController.updateSnack);
router.delete("/:id", authOrAdminSession, adminAccess, snackController.deleteSnack);

module.exports = router;
