// authRoutes.js

const router = require("express").Router();
const { register, login, googleAuth } = require("../controllers/authController");
const { authLimiter } = require("../middleware/security");

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/google", googleAuth);

module.exports = router;
