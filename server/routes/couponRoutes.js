const express = require("express");
const router = express.Router();
const Coupon = require("../models/Coupon");
const { defaultCoupons, evaluateCoupon } = require("../utils/coupons");

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
    const { code, totalAmount } = req.body;
    if (!code) {
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
    res.status(500).json({ message: "Error validating coupon", error: error.message });
  }
});

module.exports = router;
