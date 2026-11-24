// snackOrderRoutes.js

const router = require("express").Router();
const snackOrderController = require("../controllers/snackOrderController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { adminAccess, selfOrAdmin } = require("../middleware/adminMiddleware");
const { bookingLimiter } = require("../middleware/security");

// Public: theatre and movie options for the F&B page
router.get("/meta/theatres-movies", snackOrderController.getTheatresAndMovies);

// Staff: all orders
router.get("/all", authMiddleware, adminAccess, snackOrderController.getAllSnackOrders);

// A user's own orders
router.get(
  "/user/:userId",
  authMiddleware,
  selfOrAdmin((req) => req.params.userId),
  snackOrderController.getUserSnackOrders
);

// Single order (owner or staff)
router.get("/:orderId", authMiddleware, snackOrderController.getSnackOrderById);

// Create order (signed in)
router.post("/", authMiddleware, bookingLimiter, snackOrderController.createSnackOrder);

// Staff: update status
router.put("/:orderId/status", authMiddleware, adminAccess, snackOrderController.updateSnackOrderStatus);

module.exports = router;
