// analyticsController.js
// Admin analytics built from the actual booking records (see utils/revenue.js
// for the definitions of gross, discounts, refunds and net). Nothing here is
// estimated from current prices except for old bookings without a price
// snapshot, which are reported as "estimated".

const Booking = require("../models/Booking");
const Movie = require("../models/Movie");
const Show = require("../models/Show");
const SnackOrder = require("../models/SnackOrder");
const { summarize } = require("../utils/revenue");

const DATE_RE = /^\d{4}-\d{2}-\d{2}/;

exports.getAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    let match = {};
    let showDates = null;
    if (startDate || endDate) {
      const from = new Date(String(startDate));
      const to = new Date(String(endDate));
      if (!startDate || !endDate || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        return res.status(400).json({ message: "Provide a valid startDate and endDate" });
      }
      match = { createdAt: { $gte: from, $lte: to } };
      if (DATE_RE.test(String(startDate)) && DATE_RE.test(String(endDate))) {
        showDates = { $gte: String(startDate).slice(0, 10), $lte: String(endDate).slice(0, 10) };
      }
    }

    const bookings = await Booking.find(match)
      .select("showId seats snacks parking totalPrice discountAmount pricing paymentStatus createdAt")
      .lean();

    const showIds = [...new Set(bookings.map((b) => String(b.showId)))];
    const shows = await Show.find({ _id: { $in: showIds } }).select("movieId theatre seats.seatNumber seats.category seats.price").lean();
    const showsById = new Map(shows.map((s) => [String(s._id), s]));
    const movieIds = [...new Set(shows.map((s) => String(s.movieId)))];
    const movies = await Movie.find({ _id: { $in: movieIds } }).select("title poster").lean();
    const moviesById = new Map(movies.map((m) => [String(m._id), m]));

    const report = summarize(bookings, showsById, moviesById);

    // Occupancy: booked seats out of all seats, per showtime (dated in range when filtered).
    const occupancyRows = await Show.aggregate([
      { $match: showDates ? { date: showDates } : {} },
      {
        $project: {
          movieId: 1,
          theatre: 1,
          date: 1,
          time: 1,
          total: { $size: "$seats" },
          booked: { $size: { $filter: { input: "$seats", as: "s", cond: { $eq: ["$$s.isBooked", true] } } } },
        },
      },
    ]);
    const allMovieTitles = new Map(
      (await Movie.find({ _id: { $in: [...new Set(occupancyRows.map((o) => String(o.movieId)))] } }).select("title").lean()).map((m) => [
        String(m._id),
        m.title,
      ])
    );
    const seatsTotal = occupancyRows.reduce((a, o) => a + o.total, 0);
    const seatsBooked = occupancyRows.reduce((a, o) => a + o.booked, 0);
    const occupancy = {
      shows: occupancyRows.length,
      seats: seatsTotal,
      booked: seatsBooked,
      rate: seatsTotal ? Math.round((seatsBooked / seatsTotal) * 1000) / 10 : 0,
      byShow: occupancyRows
        .map((o) => ({
          showId: o._id,
          movie: allMovieTitles.get(String(o.movieId)) || "Removed movie",
          theatre: o.theatre,
          date: o.date,
          time: o.time,
          seats: o.total,
          booked: o.booked,
          rate: o.total ? Math.round((o.booked / o.total) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.rate - a.rate)
        .slice(0, 50),
    };

    // Food: items bought with tickets plus standalone food orders (not cancelled).
    const items = new Map();
    const addItem = (name, qty, price, source) => {
      const key = String(name);
      const it = items.get(key) || { name: key, qty: 0, revenue: 0, withTickets: 0, standalone: 0 };
      it.qty += Number(qty) || 0;
      it.revenue += (Number(price) || 0) * (Number(qty) || 0);
      it[source] += Number(qty) || 0;
      items.set(key, it);
    };
    bookings
      .filter((b) => b.paymentStatus === "Demo" || b.paymentStatus === "Success")
      .forEach((b) => (b.snacks || []).forEach((s) => addItem(s.name, s.qty, s.price, "withTickets")));
    const orders = await SnackOrder.find({ ...match, status: { $ne: "CANCELLED" } }).select("items totalPrice").lean();
    orders.forEach((o) => (o.items || []).forEach((s) => addItem(s.name, s.qty, s.price, "standalone")));
    const food = {
      // List value of food bought with tickets, before any share of a discount.
      withTicketsGross: Math.round(report.theatreStats.reduce((a, t) => a + t.snackRevenue, 0) * 100) / 100,
      standaloneOrders: orders.length,
      standaloneRevenue: Math.round(orders.reduce((a, o) => a + (Number(o.totalPrice) || 0), 0) * 100) / 100,
      items: [...items.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 20),
    };

    const [totalMovies, totalShows, totalBookings] = await Promise.all([
      Movie.countDocuments(),
      Show.countDocuments(),
      Booking.countDocuments(match),
    ]);

    return res.json({
      movieStats: report.movieStats,
      theatreStats: report.theatreStats,
      categories: report.categories,
      trend: report.trend,
      finance: report.finance,
      occupancy,
      food,
      summary: {
        totalMovies,
        totalShows,
        totalTickets: report.tickets,
        totalBookings,
        // Net value of bookings that count as sales (paid or demo checkout).
        totalRevenue: report.finance.net,
      },
    });
  } catch (err) {
    return next(err);
  }
};
