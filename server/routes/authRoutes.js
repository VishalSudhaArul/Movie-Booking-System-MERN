// authRoutes.js

const router = require("express").Router();
const { register, login, adminLogin, googleAuth } = require("../controllers/authController");
const { authLimiter } = require("../middleware/security");

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/admin/login", authLimiter, adminLogin);
router.post("/google", authLimiter, googleAuth);

module.exports = router;
