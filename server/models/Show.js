const mongoose = require("mongoose");

/* ---------- Seat Schema ---------- */

const seatSchema = new mongoose.Schema({

  seatNumber: {
    type: String,
    required: true
  },

  category: {
    type: String,
    enum: ["Balcony", "First Class", "Second Class"],
    required: true
  },

  price: {
    type: Number,
    required: true
  },

  isBooked: {
    type: Boolean,
    default: false
  },

  /* Temporary hold while a user checks out. A hold only counts while
     holdExpiresAt is in the future; after that the seat is simply free again,
     so no clean-up job is needed. Older shows don't have these fields, which
     means "not held". */
  heldBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },

  holdExpiresAt: {
    type: Date,
    default: null
  }

});

// Never send who holds a seat to the browser: only whether it's held right now.
seatSchema.set("toJSON", {
  transform(doc, ret) {
    ret.isHeld = !ret.isBooked && !!ret.heldBy && !!ret.holdExpiresAt && new Date(ret.holdExpiresAt) > new Date();
    delete ret.heldBy;
    delete ret.holdExpiresAt;
    return ret;
  }
});


/* ---------- Show Schema ---------- */

const showSchema = new mongoose.Schema({

  /* Movie Reference */
  movieId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Movie",
    required: true
  },

  /* Theatre Name */
  theatre: {
    type: String,
    required: true
  },

  /* Show Date + Time */
  date: {
    type: String,
    required: true
  },

  time: {
    type: String,
    required: true
  },

  /* Ticket Pricing */
  balconyPrice: {
    type: Number,
    required: true
  },

  firstClassPrice: {
    type: Number,
    required: true
  },

  secondClassPrice: {
    type: Number,
    required: true
  },

  /* Auditorium layout template (see utils/auditoriumLayouts.js).
     Shows created before layouts existed have none and use the classic hall. */
  layoutId: {
    type: String,
    default: null
  },

  /* Auditorium name shown on tickets, e.g. "Audi 3" (optional) */
  screenName: {
    type: String,
    default: ""
  },

  /* Seat List */
  seats: [seatSchema]

},
{ timestamps: true });


module.exports = mongoose.model("Show", showSchema);
