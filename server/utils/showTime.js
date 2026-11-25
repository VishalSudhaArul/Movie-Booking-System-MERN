// showTime.js
// Show dates and times are stored as text ("2026-11-26", "18:30" or "6:30 PM")
// in the cinema's local time. SHOW_UTC_OFFSET says which zone that is
// (default India, +05:30), so the server's own clock zone doesn't matter.

const offset = () => {
  const raw = String(process.env.SHOW_UTC_OFFSET || "+05:30").trim();
  return /^[+-]\d{2}:\d{2}$/.test(raw) ? raw : "+05:30";
};

// "6:30 PM" -> "18:30", "18:30" -> "18:30"
const to24h = (time) => {
  const m = String(time || "").trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2];
  if (m[3]) {
    const pm = m[3].toUpperCase() === "PM";
    if (h === 12) h = pm ? 12 : 0;
    else if (pm) h += 12;
  }
  return `${String(h).padStart(2, "0")}:${min}`;
};

/** The moment the show starts, or null if the stored date/time can't be read. */
const showStartsAt = (show) => {
  const time = to24h(show.time);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(show.date || "")) || !time) return null;
  const d = new Date(`${show.date}T${time}:00${offset()}`);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** True once the show has started (seats can no longer be held or booked). */
const hasStarted = (show, now = new Date()) => {
  const start = showStartsAt(show);
  return !!start && start <= now;
};

module.exports = { showStartsAt, hasStarted, to24h };
