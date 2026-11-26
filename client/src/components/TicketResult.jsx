import React from "react";
import Icon from "./ui/Icon";
import { formatShowDate, formatShowTime } from "../lib/format";

// Accepts a bare booking ID or a full ticket link (…/verify/<id>).
export const ticketIdFrom = (value) => String(value || "").trim().split(/[/?#]/).filter(Boolean).pop() || "";

const STATES = {
  valid: { icon: "check", title: "Valid ticket", tone: "border-success-500/40 bg-success-500/[0.08] text-success-300" },
  admitted: { icon: "check", title: "Admitted. Enjoy the show!", tone: "border-success-500/40 bg-success-500/[0.08] text-success-300" },
  used: { icon: "alert", title: "Already used: do not admit", tone: "border-gold-500/40 bg-gold-500/[0.08] text-gold-400" },
  invalid: { icon: "close", title: "Ticket not found", tone: "border-danger-500/40 bg-danger-500/[0.08] text-danger-300" },
};

/** Banner showing the outcome of a ticket check, with the ticket's details. */
export default function TicketResult({ state, booking, message, children }) {
  const s = STATES[state];
  if (!s) return null;
  const show = booking?.showId;
  return (
    <div className={`overflow-hidden rounded-2xl border ${s.tone} animate-fadeUp`} role="status" aria-live="polite">
      <div className="flex items-center gap-3 px-5 py-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fill-emphasis">
          <Icon name={s.icon} className="h-5 w-5" />
        </span>
        <div>
          <p className="font-display text-lg font-bold">{s.title}</p>
          {message && <p className="text-xs opacity-80">{message}</p>}
        </div>
      </div>
      {booking && (
        <dl className="grid grid-cols-2 gap-4 border-t border-line bg-ink-900/60 px-5 py-4 text-sm sm:grid-cols-4">
          <div className="col-span-2">
            <dt className="text-xs text-gray-500">Movie</dt>
            <dd className="font-semibold text-white">{show?.movieId?.title || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Seats</dt>
            <dd className="font-mono font-semibold text-white">{booking.seats?.join(", ")}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Theatre</dt>
            <dd className="text-gray-200">{show?.theatre || "—"}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-gray-500">Showtime</dt>
            <dd className="text-gray-200">
              {show ? `${formatShowDate(show.date)} · ${formatShowTime(show.time)}` : "—"}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-gray-500">Guest</dt>
            <dd className="text-gray-200">{booking.userId?.name || "—"}</dd>
          </div>
        </dl>
      )}
      {children && <div className="border-t border-line bg-ink-900/60 px-5 py-4">{children}</div>}
    </div>
  );
}
