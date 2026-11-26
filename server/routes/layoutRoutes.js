const router = require("express").Router();
const layoutController = require("../controllers/layoutController");
const { authOrAdminSession } = require("../middleware/authMiddleware");
const { adminAccess } = require("../middleware/adminMiddleware");

router.get("/", authOrAdminSession, adminAccess, layoutController.list);
router.post("/preview", authOrAdminSession, adminAccess, layoutController.preview);
router.post("/", authOrAdminSession, adminAccess, layoutController.create);
router.get("/:id", layoutController.getOne);
router.delete("/:id", authOrAdminSession, adminAccess, layoutController.remove);

module.exports = router;
