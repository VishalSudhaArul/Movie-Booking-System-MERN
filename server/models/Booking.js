//  Booking.js

const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
{
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  showId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Show",
    required: true
  },

  seats: [String],

  snacks: [
    {
      name: String,
      price: Number,
      qty: Number
    }
  ],

  parking: {
    type: {
      type: String
    },
    price: Number
  },

  totalPrice: Number,

  paymentStatus: {
    type: String,
    default: "Success"
  }
},
{ timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
