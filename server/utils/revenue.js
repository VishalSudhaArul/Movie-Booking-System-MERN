// revenue.js
// Turns booking records into reconciled figures. Pure functions, so the maths
// can be tested without a database.
//
// Definitions (all in rupees):
// - gross:    the list price of everything sold (tickets + food + parking)
// - discount: promo-code discounts actually given
// - refunds:  money returned. The platform has no cancellation or refund flow,
//             so this is always 0 and `refundsSupported` says so.
// - net:      what the booking recorded as charged (gross − discount − refunds)
//
// Each booking's own price snapshot (booking.pricing) is used when it exists.
// Older bookings have none: their ticket prices are read from the show's seats
// and the booking is counted as "estimated". A discount is shared between
// tickets, food and parking in proportion to their gross value.
//
// Payment status matters: "Demo" bookings went through the demo checkout and no
// money was taken; "Success" bookings were recorded as paid. Pending and Failed
// bookings are not revenue and are only counted.

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const sum = (list, f) => list.reduce((a, x) => a + (Number(f(x)) || 0), 0);

const REVENUE_STATUSES = new Set(["Success", "Demo"]);

/** One booking's figures. `show` is the show document (lean) when available. */
function bookingFigures(booking, show) {
  const p = booking.pricing;
  let seatLines;
  let estimated = false;
  if (p && Array.isArray(p.seats) && p.seats.length) {
    seatLines = p.seats.map((s) => ({ seatNumber: s.seatNumber, category: s.category || "Unknown", price: Number(s.price) || 0 }));
  } else {
    estimated = true;
    const bySeat = new Map(((show && show.seats) || []).map((s) => [s.seatNumber, s]));
    seatLines = (booking.seats || []).map((n) => {
      const s = bySeat.get(n);
      return { seatNumber: n, category: (s && s.category) || "Unknown", price: s ? Number(s.price) || 0 : 0 };
    });
  }
  const seatTotal = p && typeof p.seatTotal === "number" ? p.seatTotal : sum(seatLines, (s) => s.price);
  const snacksTotal = p && typeof p.snacksTotal === "number" ? p.snacksTotal : sum(booking.snacks || [], (s) => s.price * s.qty);
  const parkingTotal =
    p && typeof p.parkingTotal === "number" ? p.parkingTotal : Number(booking.parking && booking.parking.price) || 0;
  const gross = seatTotal + snacksTotal + parkingTotal;
  const discount = p && typeof p.discount === "number" ? p.discount : Number(booking.discountAmount) || 0;
  const net = Number(booking.totalPrice) || 0;
  const share = (part) => (gross > 0 ? (discount * part) / gross : 0);
  return {
    seatLines,
    estimated,
    seatTotal,
    snacksTotal,
    parkingTotal,
    gross,
    discount,
    refunds: 0,
    net,
    ticketNet: seatTotal - share(seatTotal),
    snacksNet: snacksTotal - share(snacksTotal),
    parkingNet: parkingTotal - share(parkingTotal),
    // gross − discount should equal what was charged.
    reconciled: Math.abs(gross - discount - net) < 0.01,
  };
}

const dayOf = (d) => new Date(d).toISOString().slice(0, 10);

/**
 * Summarises bookings. `showsById` maps show id → lean show (with movieId and
 * seats); `moviesById` maps movie id → { title, poster }.
 */
function summarize(bookings, showsById, moviesById) {
  const finance = {
    gross: 0,
    discounts: 0,
    refunds: 0,
    net: 0,
    collected: 0, // recorded as paid (Success)
    demo: 0, // demo checkout: nothing was charged
    refundsSupported: false,
    bookings: { revenue: 0, demo: 0, paid: 0, pending: 0, failed: 0 },
    reconciliation: { checked: 0, matched: 0, mismatched: [], estimated: 0 },
    breakdown: { tickets: 0, food: 0, parking: 0 },
  };
  const movies = new Map();
  const theatres = new Map();
  const categories = new Map();
  const trend = new Map();
  let tickets = 0;

  bookings.forEach((b) => {
    const status = b.paymentStatus || "Pending";
    if (status === "Pending") finance.bookings.pending += 1;
    if (status === "Failed") finance.bookings.failed += 1;
    if (!REVENUE_STATUSES.has(status)) return;

    const show = showsById.get(String(b.showId)) || null;
    const f = bookingFigures(b, show);
    finance.bookings.revenue += 1;
    if (status === "Demo") finance.bookings.demo += 1;
    else finance.bookings.paid += 1;

    finance.gross += f.gross;
    finance.discounts += f.discount;
    finance.net += f.net;
    if (status === "Demo") finance.demo += f.net;
    else finance.collected += f.net;
    finance.breakdown.tickets += f.ticketNet;
    finance.breakdown.food += f.snacksNet;
    finance.breakdown.parking += f.parkingNet;
    finance.reconciliation.checked += 1;
    if (f.estimated) finance.reconciliation.estimated += 1;
    if (f.reconciled) finance.reconciliation.matched += 1;
    else if (finance.reconciliation.mismatched.length < 20) finance.reconciliation.mismatched.push(String(b._id));
    tickets += f.seatLines.length;

    const movieId = show && show.movieId ? String(show.movieId._id || show.movieId) : "unknown";
    const movie = moviesById.get(movieId) || { title: "Removed movie", poster: "" };
    const m = movies.get(movieId) || { _id: movieId, title: movie.title, poster: movie.poster, ticketsSold: 0, ticketRevenue: 0, netTicketRevenue: 0, bookings: 0 };
    m.ticketsSold += f.seatLines.length;
    m.ticketRevenue += f.seatTotal;
    m.netTicketRevenue += f.ticketNet;
    m.bookings += 1;
    movies.set(movieId, m);

    const theatreName = (show && show.theatre) || (b.parking && b.parking.theatre) || "Unknown theatre";
    const t = theatres.get(theatreName) || { _id: theatreName, movieMap: new Map(), ticketRevenue: 0, snackRevenue: 0, parkingRevenue: 0, discounts: 0, net: 0 };
    t.ticketRevenue += f.seatTotal;
    t.snackRevenue += f.snacksTotal;
    t.parkingRevenue += f.parkingTotal;
    t.discounts += f.discount;
    t.net += f.net;
    t.movieMap.set(movie.title, (t.movieMap.get(movie.title) || 0) + f.seatTotal);
    theatres.set(theatreName, t);

    const ticketShare = f.seatTotal > 0 ? f.ticketNet / f.seatTotal : 0;
    f.seatLines.forEach((s) => {
      const c = categories.get(s.category) || { category: s.category, ticketsSold: 0, gross: 0, net: 0 };
      c.ticketsSold += 1;
      c.gross += s.price;
      c.net += s.price * ticketShare;
      categories.set(s.category, c);
    });

    const day = dayOf(b.createdAt || Date.now());
    const d = trend.get(day) || { date: day, bookings: 0, tickets: 0, net: 0 };
    d.bookings += 1;
    d.tickets += f.seatLines.length;
    d.net += f.net;
    trend.set(day, d);
  });

  const r = (o, keys) => keys.forEach((k) => (o[k] = round2(o[k])));
  r(finance, ["gross", "discounts", "refunds", "net", "collected", "demo"]);
  r(finance.breakdown, ["tickets", "food", "parking"]);

  return {
    finance,
    tickets,
    movieStats: [...movies.values()].map((m) => ({ ...m, ticketRevenue: round2(m.ticketRevenue), netTicketRevenue: round2(m.netTicketRevenue) })),
    theatreStats: [...theatres.values()].map((t) => ({
      _id: t._id,
      movies: [...t.movieMap.entries()].map(([title, revenue]) => ({ title, revenue: round2(revenue) })),
      ticketRevenue: round2(t.ticketRevenue),
      snackRevenue: round2(t.snackRevenue),
      parkingRevenue: round2(t.parkingRevenue),
      totalRevenue: round2(t.ticketRevenue + t.snackRevenue + t.parkingRevenue),
      discounts: round2(t.discounts),
      net: round2(t.net),
    })),
    categories: [...categories.values()].map((c) => ({ ...c, gross: round2(c.gross), net: round2(c.net) })),
    trend: [...trend.values()].sort((a, b) => a.date.localeCompare(b.date)).map((d) => ({ ...d, net: round2(d.net) })),
  };
}

module.exports = { bookingFigures, summarize, REVENUE_STATUSES };
