const Coupon = require("../models/Coupon");

// Built-in coupons used when the Coupon collection is empty.
const defaultCoupons = [
  { code: "CINE50", description: "Get ₹50 flat off on bookings above ₹200", discountType: "FIXED", discountValue: 50, minBookingAmount: 200, isActive: true },
  { code: "WELCOME20", description: "Get 20% off on your booking", discountType: "PERCENTAGE", discountValue: 20, minBookingAmount: 100, isActive: true },
  { code: "SUPER100", description: "Flat ₹100 discount for movie buffs", discountType: "FIXED", discountValue: 100, minBookingAmount: 500, isActive: true },
];

const findCoupon = async (code) => {
  const upper = String(code || "").trim().toUpperCase();
  if (!upper) return null;
  let coupon = null;
  try {
    coupon = await Coupon.findOne({ code: upper, isActive: true });
  } catch (e) {
    coupon = null;
  }
  return coupon || defaultCoupons.find((c) => c.code === upper && c.isActive) || null;
};

// Returns { ok, status, message, coupon, discountAmount } for a code and order amount.
const evaluateCoupon = async (code, totalAmount) => {
  const coupon = await findCoupon(code);
  if (!coupon) {
    return { ok: false, status: 404, message: "Invalid or expired promo code" };
  }
  const amount = Number(totalAmount) || 0;
  if (amount < coupon.minBookingAmount) {
    return {
      ok: false,
      status: 400,
      message: `Minimum total of ₹${coupon.minBookingAmount} required to apply this code.`,
    };
  }
  let discountAmount =
    coupon.discountType === "PERCENTAGE"
      ? Math.round((amount * coupon.discountValue) / 100)
      : coupon.discountValue;
  discountAmount = Math.min(discountAmount, amount);
  return { ok: true, coupon, discountAmount };
};

module.exports = { defaultCoupons, findCoupon, evaluateCoupon };
