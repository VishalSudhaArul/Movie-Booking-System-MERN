// Booking.js

const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    showId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Show",
      required: true,
    },

    seats: [String],

    snacks: [
      {
        name: String,
        price: Number,
        qty: Number,
      },
    ],

    parking: {
      type: {
        type: String,
      },
      price: Number,
      theatre: String,
    },

    totalPrice: {
      type: Number,
      default: 0,
    },

    // What was charged, frozen at booking time. Analytics reads this rather
    // than the show's current prices, which an admin may change later.
    // Bookings made before this field existed don't have it.
    pricing: {
      type: new mongoose.Schema(
        {
          seats: [{ _id: false, seatNumber: String, category: String, price: Number }],
          seatTotal: Number,
          snacksTotal: Number,
          parkingTotal: Number,
          subtotal: Number,
          discount: Number,
          total: Number,
        },
        { _id: false }
      ),
      default: undefined,
    },

    couponCode: String,

    discountAmount: {
      type: Number,
      default: 0,
    },

    // "Demo" means no money was taken (demo checkout). "Success" is kept for
    // bookings created before this change and for a future verified payment.
    paymentStatus: {
      type: String,
      enum: ["Success", "Failed", "Pending", "Demo"],
      default: "Pending",
    },

    // DEMO = demo checkout, nothing charged. LIVE is reserved for a real,
    // server-verified payment provider.
    paymentMode: {
      type: String,
      enum: ["DEMO", "LIVE"],
      default: "DEMO",
    },

    // ── Ticket lifecycle ──────────────────────────────
    used: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ["VALID", "USED", "COMPLETED"],
      default: "VALID",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
