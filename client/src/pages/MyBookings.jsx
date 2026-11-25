import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import API from "../api";
import Icon from "../components/ui/Icon";
import Modal from "../components/ui/Modal";
import Poster from "../components/Poster";
import MovieCard from "../components/MovieCard";
import { EmptyState, ErrorState, Spinner } from "../components/ui/Feedback";
import { useToast } from "../components/ui/Toast";
import { useWatchlist } from "../context/WatchlistContext";
import { getSession } from "../lib/session";
import { amountLabel, formatDate, formatPrice, formatShowDate, formatShowTime, getShowDateTime } from "../lib/format";

const STATUS_STYLES = {
  UPCOMING: { label: "Upcoming", className: "badge-green" },
  USED: { label: "Checked in", className: "badge-gold" },
  COMPLETED: { label: "Completed", className: "badge" },
};

const getStatus = (booking) => {
  if (booking.used) return "USED";
  const dt = getShowDateTime(booking.showId);
  if (dt && dt.getTime() < Date.now()) return "COMPLETED";
  return "UPCOMING";
};

function MyBookings() {
  const toast = useToast();
  const { userId, userName } = getSession();
  const { items: watchlist } = useWatchlist();

  const [activeTab, setActiveTab] = useState("upcoming");
  const [bookings, setBookings] = useState([]);
  const [snackOrders, setSnackOrders] = useState([]);
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [openBooking, setOpenBooking] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const ticketRef = useRef(null);

  const load = useCallback(() => {
    if (!userId) return;
    setStatus("loading");
    API.get(`/api/bookings/user/${userId}`)
      .then((res) => {
        setBookings(Array.isArray(res.data) ? res.data : []);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));

    API.get(`/api/snack-orders/user/${userId}`)
      .then((res) => setSnackOrders(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});

    API.get(`/api/users/me`)
      .then((res) => setProfile(res.data))
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const { upcoming, past, totalSpent } = useMemo(() => {
    const withStatus = bookings.map((b) => ({ ...b, _status: getStatus(b) }));
    const byShowTime = (a, b) =>
      (getShowDateTime(a.showId)?.getTime() || 0) - (getShowDateTime(b.showId)?.getTime() || 0);
    return {
      upcoming: withStatus.filter((b) => b._status === "UPCOMING").sort(byShowTime),
      past: withStatus.filter((b) => b._status !== "UPCOMING"),
      totalSpent: bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0),
    };
  }, [bookings]);

  const tabs = [
    { id: "upcoming", label: "Upcoming", count: upcoming.length },
    { id: "past", label: "Past", count: past.length },
    { id: "snacks", label: "Food orders", count: snackOrders.length },
    { id: "watchlist", label: "Watchlist", count: watchlist.length },
  ];

  const downloadPDF = async (booking) => {
    if (!ticketRef.current) return;
    setDownloading(true);
    try {
      // Loaded on demand so the PDF libraries stay out of the main bundle.
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(ticketRef.current, { backgroundColor: "#10131B", scale: 2 });
      const pdf = new jsPDF("p", "mm", "a4");
      const width = 120;
      const height = (canvas.height * width) / canvas.width;
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", (210 - width) / 2, 20, width, height);
      pdf.save(`CineBook_Ticket_${booking._id}.pdf`);
    } catch (e) {
      toast.error("We couldn't create the PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const displayName = profile?.name || userName || "Movie fan";
  const list = activeTab === "upcoming" ? upcoming : past;

  return (
    <main id="main" className="min-h-screen pb-20">
      {/* ───────────── Profile header ───────────── */}
      <div className="border-b border-white/[0.07] bg-ink-900">
        <div className="container-page py-8 sm:py-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-500 font-display text-2xl font-bold text-on-brand shadow-glow">
                {displayName.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <h1 className="truncate font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  {displayName}
                </h1>
                <p className="mt-0.5 truncate text-sm text-gray-400">
                  {profile?.email || "Your bookings and saved movies"}
                  {profile?.createdAt && <span className="hidden sm:inline"> · Member since {formatDate(profile.createdAt)}</span>}
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-3 gap-3 text-center md:w-auto">
              <Stat label="Bookings" value={bookings.length} />
              <Stat label="Upcoming" value={upcoming.length} />
              <Stat label="Total booked" value={formatPrice(totalSpent)} />
            </dl>
          </div>

          <div className="scroll-row -mx-4 mt-8 px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Account sections">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`chip ${activeTab === tab.id ? "chip-active" : ""}`}
              >
                {tab.label}
                <span className={`rounded-full px-1.5 text-[11px] ${activeTab === tab.id ? "bg-white/20" : "bg-white/10"}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container-page mt-8">
        {/* ───────────── Bookings ───────────── */}
        {(activeTab === "upcoming" || activeTab === "past") &&
          (status === "loading" ? (
            <div className="grid gap-4 lg:grid-cols-2" role="status" aria-label="Loading bookings">
              {[0, 1].map((i) => (
                <div key={i} className="skeleton h-44 rounded-2xl" />
              ))}
            </div>
          ) : status === "error" ? (
            <ErrorState title="We couldn't load your bookings" onRetry={load} />
          ) : list.length === 0 ? (
            <EmptyState
              icon="ticket"
              title={activeTab === "upcoming" ? "No upcoming bookings" : "No past bookings"}
              message={
                activeTab === "upcoming"
                  ? "When you book tickets, they'll show up here with a QR code for entry."
                  : "Bookings for shows that have already happened will appear here."
              }
              action={<Link to="/movies" className="btn-primary">Browse movies</Link>}
            />
          ) : (
            <ul className="grid gap-4 lg:grid-cols-2">
              {list.map((b) => (
                <li key={b._id}>
                  <BookingCard booking={b} onOpen={() => setOpenBooking(b)} />
                </li>
              ))}
            </ul>
          ))}

        {/* ───────────── Food orders ───────────── */}
        {activeTab === "snacks" &&
          (snackOrders.length === 0 ? (
            <EmptyState
              icon="popcorn"
              title="No food orders yet"
              message="Order popcorn, drinks and more ahead of time and skip the queue."
              action={<Link to="/snacks" className="btn-primary">See the menu</Link>}
            />
          ) : (
            <ul className="grid gap-4 lg:grid-cols-2">
              {snackOrders.map((so) => (
                <li key={so._id} className="card flex gap-4 p-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={
                          so.status === "COMPLETED"
                            ? "badge"
                            : so.status === "READY_FOR_PICKUP"
                            ? "badge-green"
                            : "badge-gold"
                        }
                      >
                        {(so.status || "CONFIRMED").replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase())}
                      </span>
                      <span className="font-mono text-[11px] text-gray-500">{so.orderPassId}</span>
                    </div>
                    <h3 className="mt-2 font-sans text-base font-semibold text-white">{so.theatre}</h3>
                    <p className="text-xs text-gray-400">
                      {so.movieTitle || "Food order"} · {so.deliveryType}
                      {so.seatNumber ? ` (Seat ${so.seatNumber})` : ""}
                    </p>
                    <ul className="mt-3 space-y-1 text-sm text-gray-300">
                      {so.items?.map((item, idx) => (
                        <li key={idx} className="flex justify-between gap-3">
                          <span className="truncate">{item.name} × {item.qty}</span>
                          <span className="shrink-0 text-gray-400">{formatPrice(item.price * item.qty)}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 border-t border-white/[0.07] pt-3 font-display text-lg font-bold text-white">
                      {formatPrice(so.totalPrice)}
                    </p>
                  </div>
                  <div className="shrink-0 self-start rounded-xl bg-white p-2">
                    <QRCodeCanvas value={`${window.location.origin}/verify-snack/${so.orderPassId}`} size={84} />
                  </div>
                </li>
              ))}
            </ul>
          ))}

        {/* ───────────── Watchlist ───────────── */}
        {activeTab === "watchlist" &&
          (watchlist.length === 0 ? (
            <EmptyState
              icon="heart"
              title="Your watchlist is empty"
              message="Tap the heart on any movie to save it here for later."
              action={<Link to="/movies" className="btn-primary">Browse movies</Link>}
            />
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {watchlist.map((m) => (
                <MovieCard key={m._id} movie={m} />
              ))}
            </div>
          ))}
      </div>

      {/* ───────────── Ticket modal ───────────── */}
      <Modal
        isOpen={!!openBooking}
        onClose={() => setOpenBooking(null)}
        title="Your ticket"
        size="sm"
        footer={
          openBooking && (
            <button className="btn-primary w-full" onClick={() => downloadPDF(openBooking)} disabled={downloading}>
              {downloading ? <><Spinner className="h-4 w-4" /> Preparing PDF…</> : <><Icon name="download" className="h-4 w-4" /> Download PDF</>}
            </button>
          )
        }
      >
        {openBooking && (
          <div ref={ticketRef} className="bg-ink-850 p-5">
            <p className="eyebrow">CineBook e-ticket</p>
            <h3 className="mt-1 text-xl font-bold text-white">{openBooking.showId?.movieId?.title || "Movie"}</h3>
            <p className="text-xs text-gray-400">{openBooking.showId?.movieId?.genre}</p>

            <div className="my-5 flex justify-center">
              <div className="rounded-xl bg-white p-3">
                <QRCodeCanvas value={`${window.location.origin}/verify/${openBooking._id}`} size={160} />
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Detail label="Theatre" value={openBooking.showId?.theatre} />
              <Detail label="Status" value={STATUS_STYLES[getStatus(openBooking)].label} />
              <Detail label="Date" value={formatShowDate(openBooking.showId?.date)} />
              <Detail label="Time" value={formatShowTime(openBooking.showId?.time)} />
              <Detail label="Seats" value={openBooking.seats?.join(", ")} wide />
              {openBooking.snacks?.length > 0 && (
                <Detail label="Food" value={openBooking.snacks.map((s) => `${s.name} × ${s.qty}`).join(", ")} wide />
              )}
              {openBooking.parking?.type && <Detail label="Parking" value={openBooking.parking.type} />}
              <Detail label={amountLabel(openBooking)} value={formatPrice(openBooking.totalPrice)} />
              <Detail label="Booked on" value={formatDate(openBooking.createdAt)} />
            </dl>
            <p className="mt-4 break-all border-t border-dashed border-white/15 pt-3 font-mono text-[11px] text-gray-500">
              Booking ID: {openBooking._id}
            </p>
          </div>
        )}
      </Modal>
    </main>
  );
}

function BookingCard({ booking, onOpen }) {
  const show = booking.showId;
  const movie = show?.movieId;
  const style = STATUS_STYLES[booking._status];
  const extras = [
    booking.snacks?.length > 0 && `${booking.snacks.reduce((n, s) => n + (s.qty || 0), 0)} food items`,
    booking.parking?.type && `${booking.parking.type} parking`,
  ].filter(Boolean);

  return (
    <article className="card flex h-full overflow-hidden">
      <Poster src={movie?.poster} alt="" className="hidden w-28 shrink-0 xs:block" />
      <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="truncate font-sans text-base font-semibold text-white">{movie?.title || "Movie unavailable"}</h3>
          <span className={`${style.className} shrink-0`}>{style.label}</span>
        </div>

        <ul className="mt-2.5 space-y-1.5 text-sm text-gray-400">
          <li className="flex items-center gap-2">
            <Icon name="pin" className="h-4 w-4 shrink-0" />
            <span className="truncate">{show?.theatre || "—"}</span>
          </li>
          <li className="flex items-center gap-2">
            <Icon name="calendar" className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {show ? `${formatShowDate(show.date)} · ${formatShowTime(show.time)}` : "—"}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Icon name="ticket" className="h-4 w-4 shrink-0" />
            <span className="truncate text-gray-200">{booking.seats?.join(", ")}</span>
          </li>
        </ul>

        {extras.length > 0 && <p className="mt-2 text-xs text-gray-500">+ {extras.join(" · ")}</p>}

        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <span className="font-display text-lg font-bold text-white">{formatPrice(booking.totalPrice)}</span>
          <button className="btn-secondary btn-sm" onClick={onOpen}>
            <Icon name="qr" className="h-4 w-4" /> View ticket
          </button>
        </div>
      </div>
    </article>
  );
}

function Stat({ label, value }) {
  return (
    <div className="flex flex-col-reverse rounded-xl border border-white/[0.07] bg-ink-850 px-4 py-3">
      <dt className="text-[11px] text-gray-400">{label}</dt>
      <dd className="font-display text-xl font-bold text-white">{value}</dd>
    </div>
  );
}

function Detail({ label, value, wide }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <dt className="text-[11px] uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-white">{value || "—"}</dd>
    </div>
  );
}

export default MyBookings;
