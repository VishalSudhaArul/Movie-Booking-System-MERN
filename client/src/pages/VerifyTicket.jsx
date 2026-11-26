import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import API from "../api";
import Icon from "../components/ui/Icon";
import Poster from "../components/Poster";
import { EmptyState } from "../components/ui/Feedback";
import TicketResult from "../components/TicketResult";
import { getSession } from "../lib/session";
import { amountLabel, formatPrice, formatShowDate, formatShowTime } from "../lib/format";

/**
 * The page a ticket's QR code opens.
 * - The ticket owner sees their digital ticket. Opening it never uses it up.
 * - Staff opening it at the door admit the ticket (only the first scan can).
 */
function VerifyTicket() {
  const { bookingId } = useParams();
  const { isAdmin } = getSession();

  const [booking, setBooking] = useState(undefined); // undefined = loading, null = not found
  const [status, setStatus] = useState(""); // VALID | USED | ADMITTED

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const { data } = await API.get(`/api/bookings/verify/${bookingId}`);
        if (cancelled) return;
        setBooking(data);
        if (data.used) {
          setStatus("USED");
        } else if (isAdmin) {
          const res = await API.put(`/api/bookings/use/${bookingId}`);
          if (!cancelled) setStatus(res.data?.alreadyUsed ? "USED" : "ADMITTED");
        } else {
          setStatus("VALID");
        }
      } catch (err) {
        if (!cancelled) setBooking(null);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [bookingId, isAdmin]);

  if (booking === undefined) {
    return (
      <main id="main" className="container-page flex min-h-[70vh] items-center justify-center py-12" role="status" aria-label="Loading ticket">
        <div className="w-full max-w-md space-y-3">
          <div className="skeleton h-48 rounded-2xl" />
          <div className="skeleton h-64 rounded-2xl" />
        </div>
      </main>
    );
  }

  if (!booking) {
    return (
      <main id="main" className="container-page flex min-h-[70vh] items-center justify-center py-12">
        <div className="w-full max-w-md">
          <EmptyState
            icon="ticket"
            title="Ticket not found"
            message="This ticket doesn't exist, or it belongs to a different account."
            action={<Link to="/my-bookings" className="btn-primary">My bookings</Link>}
          />
        </div>
      </main>
    );
  }

  // Staff at the door get the scan result first.
  if (isAdmin) {
    return (
      <main id="main" className="container-page page page-enter">
        <div className="mx-auto max-w-xl space-y-4">
          <TicketResult state={status === "ADMITTED" ? "admitted" : status === "USED" ? "used" : "valid"} booking={booking} />
          <Link to="/scanner" className="btn-secondary w-full">
            <Icon name="qr" className="h-4 w-4" /> Scan another ticket
          </Link>
        </div>
      </main>
    );
  }

  const show = booking.showId || {};
  const movie = show.movieId || {};
  const used = status === "USED";
  const snacks = booking.snacks?.length ? booking.snacks.map((s) => `${s.name} × ${s.qty}`).join(", ") : null;

  return (
    <main id="main" className="container-page page page-enter">
      <article className="mx-auto max-w-md overflow-hidden rounded-3xl border border-line bg-ink-850 shadow-card" aria-label={`Ticket for ${movie.title || "your movie"}`}>
        {/* Header with poster */}
        <div className="relative">
          <Poster src={movie.poster} alt="" className="h-44 w-full opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-850 via-ink-850/60 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5">
            <span className={used ? "badge" : "badge-green"}>{used ? "Checked in" : "Valid ticket"}</span>
            <h1 className="mt-2 font-display text-2xl font-bold text-white">{movie.title || "Movie ticket"}</h1>
            <p className="text-sm text-gray-300">{show.theatre}</p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-4 px-5 py-5 text-sm">
          <div>
            <dt className="text-xs text-gray-500">Date</dt>
            <dd className="font-semibold text-white">{formatShowDate(show.date)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Time</dt>
            <dd className="font-semibold text-white">{formatShowTime(show.time)}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-gray-500">Seats</dt>
            <dd className="font-mono text-lg font-bold text-white">{booking.seats?.join(", ")}</dd>
          </div>
          {snacks && (
            <div className="col-span-2">
              <dt className="text-xs text-gray-500">Food</dt>
              <dd className="text-gray-200">{snacks}</dd>
            </div>
          )}
          {booking.parking?.type && (
            <div>
              <dt className="text-xs text-gray-500">Parking</dt>
              <dd className="text-gray-200">{booking.parking.type}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-gray-500">{amountLabel(booking)}</dt>
            <dd className="font-semibold text-white">{formatPrice(booking.totalPrice)}</dd>
          </div>
        </dl>

        {/* Tear line */}
        <div className="relative px-5" aria-hidden="true">
          <div className="border-t border-dashed border-line-strong" />
          <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-ink-950" />
          <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-ink-950" />
        </div>

        <div className="flex flex-col items-center gap-3 px-5 py-6 text-center">
          {used ? (
            <p className="text-sm text-gray-400">This ticket has already been used to enter.</p>
          ) : (
            <>
              <div className="rounded-2xl bg-white p-3">
                <QRCodeCanvas value={`${window.location.origin}/verify/${booking._id}`} size={160} aria-label="Ticket QR code" role="img" />
              </div>
              <p className="text-sm text-gray-400">Show this code at the entrance.</p>
            </>
          )}
          <p className="break-all font-mono text-2xs text-gray-500">Booking ID {booking._id}</p>
        </div>
      </article>

      <div className="mx-auto mt-4 max-w-md">
        <Link to="/my-bookings" className="btn-ghost w-full">
          <Icon name="arrowLeft" className="h-4 w-4" /> All my bookings
        </Link>
      </div>
    </main>
  );
}

export default VerifyTicket;
