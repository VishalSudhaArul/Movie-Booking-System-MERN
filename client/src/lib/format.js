// Shared formatting helpers for movies, shows and prices.

export const formatDuration = (minutes) => {
  const total = Number(minutes);
  if (!total || total <= 0) return "";
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
};

export const formatPrice = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN")}`;

// "Action Drama thriller" / "Action, Drama" -> ["Action", "Drama", "Thriller"]
export const splitGenres = (genre) => {
  if (!genre) return [];
  return String(genre)
    .replace(/sci[\s-]?fi/gi, "Sci-Fi")
    .split(/[\s,/|]+/)
    .map((g) => g.trim())
    .filter(Boolean)
    .map((g) => (g === "Sci-Fi" ? g : g.charAt(0).toUpperCase() + g.slice(1).toLowerCase()));
};

// Accepts "14:30", "2:30 PM" and returns { hours, minutes } or null.
const parseTime = (time) => {
  if (!time) return null;
  const match = String(time).trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2] || "0", 10);
  const modifier = (match[3] || "").toUpperCase();
  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;
  return { hours, minutes };
};

// Local Date for a show's date ("YYYY-MM-DD") and time, or null if unparseable.
export const getShowDateTime = (show) => {
  if (!show?.date) return null;
  const parts = String(show.date).slice(0, 10).split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    const fallback = new Date(show.date);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  const t = parseTime(show.time) || { hours: 23, minutes: 59 };
  return new Date(parts[0], parts[1] - 1, parts[2], t.hours, t.minutes);
};

export const isUpcomingShow = (show, now = new Date()) => {
  const dt = getShowDateTime(show);
  return dt ? dt.getTime() > now.getTime() : true;
};

export const formatShowTime = (time) => {
  const t = parseTime(time);
  if (!t) return time || "";
  const suffix = t.hours >= 12 ? "PM" : "AM";
  const h = t.hours % 12 || 12;
  return `${h}:${String(t.minutes).padStart(2, "0")} ${suffix}`;
};

export const formatShowDate = (date, options = { weekday: "short", day: "numeric", month: "short", year: "numeric" }) => {
  const dt = getShowDateTime({ date, time: "00:00" });
  if (!dt) return date || "";
  return dt.toLocaleDateString("en-IN", options);
};

export const formatDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

// A user-facing message for a failed API call.
export const getErrorMessage = (err, fallback = "Something went wrong. Please try again.") => {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.code === "ERR_NETWORK") return "Can't reach the server. Please check your connection and try again.";
  return fallback;
};

// Only a real, server-verified payment counts as "paid". Everything else so far
// went through the demo checkout, where no money is taken.
export const isVerifiedPayment = (booking) =>
  booking?.paymentMode === "LIVE" && booking?.paymentStatus === "Success";

export const amountLabel = (booking) => (isVerifiedPayment(booking) ? "Amount paid" : "Total (demo, not charged)");
