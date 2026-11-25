// authRoutes.js

const router = require("express").Router();
const {
  register,
  login,
  adminLogin,
  adminSession,
  adminLogout,
  googleAuth,
} = require("../controllers/authController");
const { authLimiter } = require("../middleware/security");
const { requireAdminSession } = require("../middleware/authMiddleware");

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/google", authLimiter, googleAuth);

// Password-only admin access (see utils/adminAccess.js).
router.post("/admin/login", authLimiter, adminLogin);
router.get("/admin/session", requireAdminSession, adminSession);
router.post("/admin/logout", requireAdminSession, adminLogout);

module.exports = router;
