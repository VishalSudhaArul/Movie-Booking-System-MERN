// snackOrderController.js

const crypto = require("crypto");
const SnackOrder = require("../models/SnackOrder");
const Booking = require("../models/Booking");
const Show = require("../models/Show");
const Snack = require("../models/Snack");
const { isStaff } = require("../middleware/adminMiddleware");
const { isObjectId, cleanString, cleanNumber, exactInsensitive } = require("../utils/validate");

const DELIVERY_TYPES = ["Express Counter Pickup", "In-Seat Delivery"];
const STATUSES = ["CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "COMPLETED", "CANCELLED"];
const MAX_LINES = 20;
const MAX_QTY = 20;

const newPassId = () => `SNK-${crypto.randomInt(100000, 1000000)}`;

// ➤ Create standalone snack order (signed-in user; prices come from the menu)
exports.createSnackOrder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const theatre = cleanString(req.body.theatre, { max: 120 });
    const { items, bookingId } = req.body;

    if (!theatre) return res.status(400).json({ message: "Choose a theatre" });
    if (!Array.isArray(items) || items.length === 0 || items.length > MAX_LINES) {
      return res.status(400).json({ message: "Add at least one item to your order" });
    }

    const deliveryType = DELIVERY_TYPES.includes(req.body.deliveryType)
      ? req.body.deliveryType
      : "Express Counter Pickup";

    let seatNumber = "";
    if (deliveryType === "In-Seat Delivery") {
      seatNumber = cleanString(req.body.seatNumber, { max: 6 }) || "";
      if (!/^[A-Z]{1,2}\d{1,3}$/i.test(seatNumber)) {
        return res.status(400).json({ message: "Enter your seat number for in-seat delivery" });
      }
      seatNumber = seatNumber.toUpperCase();
    }

    // A linked booking must be the user's own.
    let linkedBooking = null;
    if (bookingId) {
      if (!isObjectId(bookingId)) return res.status(400).json({ message: "Invalid booking" });
      linkedBooking = await Booking.findOne({ _id: bookingId, userId }).select("_id").lean();
      if (!linkedBooking) return res.status(400).json({ message: "That booking isn't yours" });
    }

    const menu = await Snack.find({ theatre: exactInsensitive(theatre) }).lean();
    const byId = new Map(menu.map((s) => [String(s._id), s]));
    const byName = new Map(menu.map((s) => [String(s.name).trim().toLowerCase(), s]));

    const lines = [];
    for (const item of items) {
      const qty = cleanNumber(item && item.qty, { min: 1, max: MAX_QTY, integer: true });
      if (qty === null) return res.status(400).json({ message: `Quantity must be between 1 and ${MAX_QTY}` });
      const snack =
        (item && isObjectId(item.snackId) && byId.get(item.snackId)) ||
        (item && typeof item.name === "string" && byName.get(item.name.trim().toLowerCase()));
      if (!snack) return res.status(400).json({ message: "One of the items isn't sold at this theatre" });
      lines.push({ name: snack.name, price: Number(snack.price) || 0, qty });
    }

    const totalPrice = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
    const movieTitle = cleanString(req.body.movieTitle, { max: 200 }) || "General Theater Order";

    const order = await SnackOrder.create({
      userId,
      orderPassId: newPassId(),
      theatre,
      movieTitle,
      bookingId: linkedBooking ? linkedBooking._id : null,
      items: lines,
      totalPrice,
      deliveryType,
      seatNumber,
      status: "CONFIRMED",
    });

    return res.status(201).json({ success: true, order });
  } catch (err) {
    return next(err);
  }
};

// ➤ Get a user's snack orders (own, or staff)
exports.getUserSnackOrders = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!isObjectId(userId)) return res.status(400).json({ message: "Invalid user ID" });
    const orders = await SnackOrder.find({ userId }).sort({ createdAt: -1 });
    return res.json(orders);
  } catch (err) {
    return next(err);
  }
};

// ➤ Get single snack order by ID or orderPassId (owner or staff)
exports.getSnackOrderById = async (req, res, next) => {
  try {
    const orderId = cleanString(req.params.orderId, { max: 40 });
    if (!orderId) return res.status(404).json({ message: "Snack order not found" });

    const filter = isObjectId(orderId) ? { $or: [{ _id: orderId }, { orderPassId: orderId }] } : { orderPassId: orderId };
    const order = await SnackOrder.findOne(filter).populate("userId", "name email");

    const ownerId = order && order.userId ? String(order.userId._id || order.userId) : "";
    if (!order || !(isStaff(req.user) || ownerId === req.user.id)) {
      return res.status(404).json({ message: "Snack order not found" });
    }
    return res.json(order);
  } catch (err) {
    return next(err);
  }
};

// ➤ Theatres and movies for F&B filtering (public)
exports.getTheatresAndMovies = async (req, res, next) => {
  try {
    const shows = await Show.find().select("theatre movieId").populate("movieId", "title genre poster");
    const snacks = await Snack.find().select("theatre");

    const allTheatres = Array.from(new Set([...snacks.map((s) => s.theatre), ...shows.map((s) => s.theatre)]));
    const moviesByTheatre = {};

    shows.forEach((s) => {
      if (!s.theatre || !s.movieId) return;
      if (!moviesByTheatre[s.theatre]) moviesByTheatre[s.theatre] = [];
      const exists = moviesByTheatre[s.theatre].some((m) => String(m._id) === String(s.movieId._id));
      if (!exists) {
        moviesByTheatre[s.theatre].push({
          _id: s.movieId._id,
          title: s.movieId.title,
          genre: s.movieId.genre,
          poster: s.movieId.poster,
        });
      }
    });

    return res.json({ theatres: allTheatres, moviesByTheatre });
  } catch (err) {
    return next(err);
  }
};

// ➤ All snack orders (staff)
exports.getAllSnackOrders = async (req, res, next) => {
  try {
    const orders = await SnackOrder.find().populate("userId", "name email").sort({ createdAt: -1 }).limit(500);
    return res.json(orders);
  } catch (err) {
    return next(err);
  }
};

// ➤ Update snack order status (staff)
exports.updateSnackOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    if (!isObjectId(orderId)) return res.status(400).json({ message: "Invalid order ID" });
    if (!STATUSES.includes(req.body.status)) return res.status(400).json({ message: "Invalid status" });

    const order = await SnackOrder.findByIdAndUpdate(orderId, { $set: { status: req.body.status } }, { new: true });
    if (!order) return res.status(404).json({ message: "Snack order not found" });
    return res.json(order);
  } catch (err) {
    return next(err);
  }
};
