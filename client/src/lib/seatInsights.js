// seatInsights.js
// Seat quality from the hall's real geometry: how big the screen looks, how far
// off-centre you sit, how much you look up, and whether heads in the row in
// front cross the screen. Recommendations, heatmaps and seat comparisons are
// all built from these numbers. This is deterministic geometry, not AI.
//
// The backend stays the source of truth for availability: a seat counts as
// free here only when the server says it isn't booked or held by someone else.

import { viewingInfo } from "./auditorium";

// Seated eye to the top of the head, in metres (used for sightlines).
const HEAD_ABOVE_EYE = 0.1;
// Screen size (horizontal angle) most people find comfortable: SMPTE suggests
// at least 30°, THX about 36–40°. We aim for the middle of that range.
export const IDEAL_SCREEN_ANGLE = 38;

const clamp01 = (n) => Math.max(0, Math.min(1, n));
const round = (n, d = 0) => Math.round(n * 10 ** d) / 10 ** d;

/**
 * Sightline clearance ("C-value") for every seat, in metres: how far the line
 * from your eye to the bottom of the screen passes above the head of the person
 * in the row in front. Front rows of each tier have nothing in front (Infinity).
 */
function sightlines(hall) {
  const clearance = new Map();
  const bottom = hall.screen.bottom;
  const tiers = new Map();
  hall.rows.forEach((r) => {
    const tier = r.tier || "stalls";
    if (!tiers.has(tier)) tiers.set(tier, []);
    tiers.get(tier).push(r);
  });
  tiers.forEach((rows) => {
    rows.forEach((row, i) => {
      const front = rows[i - 1];
      row.seats.forEach((seat) => {
        if (!front) return clearance.set(seat.seatNumber, Infinity);
        const eyeY = seat.y;
        const dz = seat.z - front.z;
        const lineY = eyeY + ((bottom - eyeY) * dz) / seat.z;
        const headTop = front.floorY + hall.geometry.eyeHeight + HEAD_ABOVE_EYE;
        clearance.set(seat.seatNumber, lineY - headTop);
      });
    });
  });
  return clearance;
}

/** The hall's estimated sound "sweet spot": on the centre line, two-thirds of the way from the screen to the last row (a common rule of thumb for the reference listening position). */
export function soundSweetSpot(hall) {
  const first = hall.rows[0];
  const last = hall.rows[hall.rows.length - 1];
  const z = (last.z * 2) / 3;
  return { x: 0, z: Math.min(last.z, Math.max(first.z, z)) };
}

/**
 * Metrics and a 0–100 score for every seat in the hall. Cached per hall object.
 */
const cache = new WeakMap();
export function seatMetrics(hall) {
  if (!hall) return new Map();
  if (cache.has(hall)) return cache.get(hall);
  const clearance = sightlines(hall);
  const sweet = soundSweetSpot(hall);
  const metrics = new Map();
  hall.rows.forEach((row) =>
    row.seats.forEach((seat) => {
      const v = viewingInfo(seat, hall.screen);
      const c = clearance.get(seat.seatNumber);
      const sWidth = Math.exp(-(((v.screenWidthAngle - IDEAL_SCREEN_ANGLE) / 16) ** 2));
      const sCentre = clamp01(1 - Math.abs(v.horizontalAngle) / 40);
      const up = v.verticalAngle;
      const sVertical = up > 10 ? clamp01(1 - (up - 10) / 25) : up < -20 ? clamp01(1 - (-20 - up) / 20) : 1;
      const sSight = c >= 0.12 ? 1 : c >= 0.06 ? 0.85 : c >= 0 ? 0.65 : 0.4;
      const score = Math.round(100 * (0.35 * sWidth + 0.3 * sCentre + 0.15 * sVertical + 0.2 * sSight));
      metrics.set(seat.seatNumber, {
        ...v,
        offCentre: Math.abs(v.horizontalAngle),
        clearance: c,
        soundDistance: round(Math.hypot(seat.x - sweet.x, seat.z - sweet.z), 1),
        score,
      });
    })
  );
  cache.set(hall, metrics);
  return metrics;
}

/** Plain-language reasons behind a seat's score. */
export function describeView(m) {
  const reasons = [];
  if (m.screenWidthAngle > 46) reasons.push("an immersive, close-up view of the screen");
  else if (m.screenWidthAngle >= 30) reasons.push("a balanced screen size");
  else reasons.push("the whole screen at a glance");
  if (m.offCentre < 6) reasons.push("central screen alignment");
  else if (m.offCentre < 15) reasons.push(`a slightly off-centre view (${round(m.offCentre)}°)`);
  else reasons.push(`a side view (${round(m.offCentre)}° off centre)`);
  if (m.clearance === Infinity) reasons.push("no row in front");
  else if (m.clearance >= 0.12) reasons.push("a clear sightline over the row in front");
  else if (m.clearance < 0) reasons.push("heads in the row in front may cross the bottom of the screen");
  if (m.verticalAngle > 15) reasons.push(`looking up about ${round(m.verticalAngle)}°`);
  return reasons;
}

export const RECOMMENDATION_MODES = [
  ["best", "Best overall"],
  ["value", "Best value"],
  ["closest", "Closest to screen"],
  ["further", "Further back"],
  ["central", "Most central"],
  ["premium", "Premium"],
  ["accessible", "Wheelchair access"],
];

const isFree = (seat, selectedSet) => selectedSet.has(seat.seatNumber) || !seat.isBooked;

/** Runs of `count` free, adjacent seats that don't cross an aisle. */
function candidateGroups(hall, count, selectedSet, filter) {
  const groups = [];
  hall.rows.forEach((row) => {
    let run = [];
    const flush = () => {
      for (let i = 0; i + count <= run.length; i++) groups.push({ row, seats: run.slice(i, i + count) });
      run = [];
    };
    row.seats.forEach((seat) => {
      const ok = isFree(seat, selectedSet) && (!filter || filter(seat));
      const breaks = run.length && (seat.aisleBefore || seat.index !== run[run.length - 1].index + 1);
      if (breaks) flush();
      if (ok) run.push(seat);
      else flush();
    });
    flush();
  });
  return groups;
}

const seatRange = (seats) => {
  const nums = seats.map((s) => s.index);
  return nums.length === 1 ? `Seat ${nums[0]}` : `Seats ${Math.min(...nums)}–${Math.max(...nums)}`;
};

/**
 * Up to `limit` non-overlapping seat groups for a preference, best first.
 * Each: { seatNumbers, row, seats, score, price, explanation }.
 */
export function recommendSeats(hall, { mode = "best", count = 2, selected = [], premiumCategory = null, limit = 3 } = {}) {
  if (!hall) return { options: [], message: "The seat plan isn't loaded yet." };
  const metrics = seatMetrics(hall);
  const selectedSet = new Set(selected);
  const n = Math.max(1, Math.min(10, count));

  if (mode === "accessible") {
    if (!hall.accessibility?.configured) {
      return { options: [], message: "This hall has no wheelchair spaces configured. Please contact the theatre for help." };
    }
    const options = [];
    hall.rows.forEach((row) =>
      row.seats.forEach((seat) => {
        if (!seat.wheelchair || !isFree(seat, selectedSet)) return;
        const seats = [seat];
        // Companion seats next to the space, as many as the group needs.
        row.seats
          .filter((s) => s.companion && isFree(s, selectedSet) && Math.abs(s.index - seat.index) <= n)
          .sort((a, b) => Math.abs(a.index - seat.index) - Math.abs(b.index - seat.index))
          .slice(0, n - 1)
          .forEach((s) => seats.push(s));
        seats.sort((a, b) => a.index - b.index);
        const m = metrics.get(seat.seatNumber);
        options.push({
          row,
          seats,
          seatNumbers: seats.map((s) => s.seatNumber),
          score: m.score,
          price: seats.reduce((a, s) => a + (Number(s.price) || 0), 0),
          explanation: `Row ${row.label}, ${seatRange(seats)} — wheelchair space${seats.length > 1 ? " with companion seating" : ""}, ${describeView(m)[0]}.`,
        });
      })
    );
    if (!options.length) return { options: [], message: "All wheelchair spaces for this show are taken." };
    return { options: options.slice(0, limit), message: hall.accessibility.note };
  }

  let filter = null;
  if (mode === "premium") {
    filter = (s) => s.seatType === "recliner" || (premiumCategory && s.category === premiumCategory);
  }
  const groups = candidateGroups(hall, n, selectedSet, filter);
  if (!groups.length) {
    return {
      options: [],
      message: mode === "premium" ? `No ${n} premium seats together are free.` : `There aren't ${n} free seats together. Try a smaller group.`,
    };
  }
  const prices = hall.rows.flatMap((r) => r.seats.map((s) => Number(s.price) || 0)).filter((p) => p > 0);
  const minPrice = prices.length ? Math.min(...prices) : 1;

  const scored = groups.map((g) => {
    const ms = g.seats.map((s) => metrics.get(s.seatNumber));
    const avg = (f) => ms.reduce((a, m) => a + f(m), 0) / ms.length;
    const price = g.seats.reduce((a, s) => a + (Number(s.price) || 0), 0);
    const score = avg((m) => m.score);
    const distance = avg((m) => m.distance);
    const offCentre = avg((m) => m.offCentre);
    const perSeat = price / g.seats.length || minPrice;
    let rank;
    if (mode === "value") rank = score / (perSeat / minPrice) ** 0.7;
    else if (mode === "closest") rank = -distance + score / 1000;
    else if (mode === "further") rank = distance + score / 1000;
    else if (mode === "central") rank = -offCentre - Math.abs(avg((m) => m.screenWidthAngle) - IDEAL_SCREEN_ANGLE) / 10;
    else rank = score;
    return { ...g, ms, price, score: Math.round(score), distance, rank };
  });
  scored.sort((a, b) => b.rank - a.rank);

  const used = new Set();
  const options = [];
  for (const g of scored) {
    if (g.seats.some((s) => used.has(s.seatNumber))) continue;
    g.seats.forEach((s) => used.add(s.seatNumber));
    const mid = g.ms[Math.floor(g.ms.length / 2)];
    const reasons = describeView(mid);
    const lead =
      mode === "value"
        ? `good viewing for the price (score ${g.score})`
        : mode === "closest"
        ? `${round(g.distance, 1)} m from the screen`
        : mode === "further"
        ? `${round(g.distance, 1)} m back, the whole screen in view`
        : mode === "premium"
        ? `premium seating, ${reasons[0]}`
        : null;
    const parts = lead ? [lead, reasons[1]] : reasons.slice(0, 2);
    options.push({
      row: g.row,
      seats: g.seats,
      seatNumbers: g.seats.map((s) => s.seatNumber),
      score: g.score,
      price: g.price,
      explanation: `Row ${g.row.label}, ${seatRange(g.seats)} — ${parts.join(" and ")}.`,
    });
    if (options.length >= limit) break;
  }
  return { options, message: "" };
}

/* ---------------- Heatmaps ---------------- */

// Colour-blind-safe sequential scale (viridis), low → high.
const SCALE = ["#440154", "#3b528b", "#21918c", "#5ec962", "#fde725"];
// Okabe–Ito categorical colours.
const CATEGORY_COLORS = ["#56B4E9", "#009E73", "#E69F00", "#CC79A7", "#F0E442"];

const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lerpHex = (a, b, t) => {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const c = (x, y) => Math.round(x + (y - x) * t).toString(16).padStart(2, "0");
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
};
/** Colour for t in [0, 1] on the sequential scale. */
export const scaleColor = (t) => {
  const x = clamp01(t) * (SCALE.length - 1);
  const i = Math.min(SCALE.length - 2, Math.floor(x));
  return lerpHex(SCALE[i], SCALE[i + 1], x - i);
};
export const HEAT_SCALE = SCALE;

export const HEATMAP_MODES = [
  ["availability", "Availability"],
  ["score", "View score"],
  ["angle", "Viewing angle"],
  ["distance", "Screen distance"],
  ["price", "Price"],
  ["category", "Seat category"],
  ["sound", "Sound position"],
];

const METRIC = {
  score: { get: (m) => m.score, unit: "", low: "Weaker view", high: "Better view", better: "high", label: "Viewing score (0–100)" },
  angle: { get: (m) => m.offCentre, unit: "°", low: "Central", high: "Off to the side", better: "low", label: "Degrees off the screen's centre line" },
  distance: { get: (m) => m.distance, unit: " m", low: "Near", high: "Far", better: "none", label: "Distance from your eyes to the screen centre" },
  price: { get: (m, s) => Number(s.price) || 0, unit: "", low: "Lower price", high: "Higher price", better: "none", label: "Ticket price", money: true },
  sound: { get: (m) => m.soundDistance, unit: " m", low: "Near the sweet spot", high: "Further away", better: "low", label: "Distance from the estimated sound sweet spot" },
};

/**
 * Colours for every seat under a heatmap. Returns { colors: Map, legend }.
 * "availability" returns no colours (the normal seat states apply).
 * Seats that aren't available keep the "unavailable" colour in every mode, so
 * a heatmap never makes a taken seat look bookable.
 */
export function heatmap(hall, mode) {
  if (!hall || !mode || mode === "availability") return { colors: null, legend: null };
  const all = hall.rows.flatMap((r) => r.seats);
  const colors = new Map();
  if (mode === "category") {
    const cats = [...new Set(all.map((s) => s.category))];
    const map = new Map(cats.map((c, i) => [c, CATEGORY_COLORS[i % CATEGORY_COLORS.length]]));
    all.forEach((s) => colors.set(s.seatNumber, map.get(s.category)));
    return { colors, legend: { type: "categories", label: "Seat category", items: cats.map((c) => [c, map.get(c)]) } };
  }
  const def = METRIC[mode];
  if (!def) return { colors: null, legend: null };
  const metrics = seatMetrics(hall);
  const values = all.map((s) => def.get(metrics.get(s.seatNumber), s));
  const min = Math.min(...values);
  const max = Math.max(...values);
  all.forEach((s, i) => {
    const t = max > min ? (values[i] - min) / (max - min) : 0.5;
    // Colour so that "better" is always the bright end of the scale.
    colors.set(s.seatNumber, scaleColor(def.better === "low" ? 1 - t : t));
  });
  return {
    colors,
    legend: {
      type: "scale",
      label: def.label,
      min: round(min, 1),
      max: round(max, 1),
      unit: def.unit,
      money: !!def.money,
      lowLabel: def.low,
      highLabel: def.high,
      reversed: def.better === "low",
    },
  };
}

/** Side-by-side comparison rows for up to three seats. */
export function compareSeats(hall, seatNumbers) {
  const metrics = seatMetrics(hall);
  return seatNumbers
    .slice(0, 3)
    .map((n) => {
      const seat = hall.seatIndex.get(n);
      const m = metrics.get(n);
      if (!seat || !m) return null;
      return {
        seat,
        seatNumber: n,
        available: !seat.isBooked,
        distance: m.distance,
        offCentre: round(m.offCentre, 1),
        screenWidthAngle: m.screenWidthAngle,
        verticalAngle: m.verticalAngle,
        clearance: m.clearance === Infinity ? null : round(m.clearance * 100),
        score: m.score,
        price: Number(seat.price) || 0,
        viewLabel: m.viewLabel,
      };
    })
    .filter(Boolean);
}
