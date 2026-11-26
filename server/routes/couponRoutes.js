const express = require("express");
const router = express.Router();
const Coupon = require("../models/Coupon");
const { defaultCoupons, evaluateCoupon } = require("../utils/coupons");
const { authOrAdminSession } = require("../middleware/authMiddleware");
const { adminAccess } = require("../middleware/adminMiddleware");
const { cleanString, cleanNumber, isObjectId } = require("../utils/validate");

const CODE_RE = /^[A-Z0-9]{3,20}$/;

// GET available active coupons
router.get("/active", async (req, res) => {
  try {
    let coupons = await Coupon.find({ isActive: true });
    if (!coupons || coupons.length === 0) {
      coupons = defaultCoupons;
    }
    res.json(coupons);
  } catch (error) {
    res.json(defaultCoupons);
  }
});

// POST validate coupon code
router.post("/validate", async (req, res) => {
  try {
    const { code } = req.body;
    const totalAmount = Number(req.body.totalAmount);
    if (!Number.isFinite(totalAmount) || totalAmount < 0 || totalAmount > 10000000) {
      return res.status(400).json({ message: "Invalid order amount" });
    }
    if (typeof code !== "string" || !code.trim() || code.length > 40) {
      return res.status(400).json({ message: "Coupon code is required" });
    }

    const result = await evaluateCoupon(code, totalAmount);
    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }

    res.json({
      success: true,
      message: `Promo code '${result.coupon.code}' applied successfully!`,
      code: result.coupon.code,
      discountAmount: result.discountAmount,
      finalPrice: totalAmount - result.discountAmount,
    });
  } catch (error) {
    res.status(500).json({ message: "Error validating coupon" });
  }
});

/* ── Admin: promotions ── */

// Every saved coupon, plus the built-in ones (which apply when no saved coupon has that code).
router.get("/admin", authOrAdminSession, adminAccess, async (req, res, next) => {
  try {
    const saved = await Coupon.find().sort({ createdAt: -1 }).lean();
    const savedCodes = new Set(saved.map((c) => c.code));
    const builtIn = defaultCoupons.filter((c) => !savedCodes.has(c.code)).map((c) => ({ ...c, builtIn: true }));
    return res.json({ saved, builtIn });
  } catch (err) {
    return next(err);
  }
});

router.post("/", authOrAdminSession, adminAccess, async (req, res, next) => {
  try {
    const code = cleanString(req.body.code, { min: 3, max: 20 });
    if (!code || !CODE_RE.test(code.toUpperCase())) return res.status(400).json({ message: "Codes are 3 to 20 letters or digits" });
    const discountType = req.body.discountType;
    if (discountType !== "FIXED" && discountType !== "PERCENTAGE") return res.status(400).json({ message: "Choose a fixed or percentage discount" });
    const discountValue = cleanNumber(req.body.discountValue, { min: 1, max: discountType === "PERCENTAGE" ? 90 : 100000 });
    if (discountValue === null) return res.status(400).json({ message: discountType === "PERCENTAGE" ? "A percentage must be between 1 and 90" : "The discount must be between 1 and 100000" });
    const minBookingAmount = req.body.minBookingAmount === undefined || req.body.minBookingAmount === "" ? 0 : cleanNumber(req.body.minBookingAmount, { min: 0, max: 1000000 });
    if (minBookingAmount === null) return res.status(400).json({ message: "The minimum order must be a positive number" });
    const description = req.body.description ? cleanString(req.body.description, { min: 0, max: 120 }) : "";
    if (description === null) return res.status(400).json({ message: "The description can be up to 120 characters" });
    if (await Coupon.exists({ code: code.toUpperCase() })) return res.status(409).json({ message: "That code already exists" });
    const coupon = await Coupon.create({ code: code.toUpperCase(), description, discountType, discountValue, minBookingAmount, isActive: true });
    return res.status(201).json(coupon);
  } catch (err) {
    return next(err);
  }
});

// Turn a saved coupon on or off. Bookings that already used it keep their discount.
router.put("/:id/active", authOrAdminSession, adminAccess, async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid coupon ID" });
    if (typeof req.body.isActive !== "boolean") return res.status(400).json({ message: "isActive must be true or false" });
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, { $set: { isActive: req.body.isActive } }, { new: true });
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });
    return res.json(coupon);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
