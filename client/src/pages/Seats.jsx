import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import API from "../api";
import Icon from "../components/ui/Icon";
import Poster from "../components/Poster";
import { EmptyState, ErrorState, Spinner } from "../components/ui/Feedback";
import { useToast } from "../components/ui/Toast";
import { formatPrice, formatShowDate, formatShowTime, getErrorMessage, isUpcomingShow } from "../lib/format";
import { buildAuditorium } from "../lib/auditorium";

export const MAX_SEATS = 10;
export const seatStorageKey = (showId) => `cinebook:seats:${showId}`;

// A seat someone else is holding is shown as "reserved" and can't be picked.
// Seats this user holds stay selectable. isBooked here means "not available".
const withHoldStates = (show) => ({
  ...show,
  seats: (show.seats || []).map((s) => ({
    ...s,
    reserved: !s.isBooked && !!s.isHeld,
    isBooked: !!s.isBooked || !!s.isHeld,
  })),
});

const rowOf = (seatNumber) => (String(seatNumber).match(/^[A-Za-z]+/) || ["?"])[0].toUpperCase();
const numberOf = (seatNumber) => parseInt(String(seatNumber).replace(/^[A-Za-z]+/, ""), 10) || 0;

export default function Seats() {
  const { showId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [show, setShow] = useState(null);
  const [movie, setMovie] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error | missing
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(seatStorageKey(showId)) || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch (e) {
      return [];
    }
  });

  const selectedRef = useRef(selectedSeats);

  const fetchShow = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      try {
        const { data } = await API.get(`/api/shows/single/${showId}`, { params: { expand: "movie" } });
        if (!data) {
          setStatus("missing");
          return;
        }
        const view = withHoldStates(data);
        setShow(view);
        setStatus("ready");

        // Drop any selected seats that have been booked or reserved in the meantime.
        const free = new Set(view.seats.filter((s) => !s.isBooked).map((s) => s.seatNumber));
        const kept = selectedRef.current.filter((n) => free.has(n));
        if (kept.length !== selectedRef.current.length) {
          setSelectedSeats(kept);
          if (silent) toast.info("Some seats you picked were just taken, so we removed them.");
        } else if (kept.length === 0) {
          // Coming back to a show where this user still holds seats: restore them.
          const mine = view.seats.filter((s) => s.heldByMe).map((s) => s.seatNumber);
          if (mine.length) setSelectedSeats(mine);
        }

        if (data.movieId && typeof data.movieId === "object") {
          setMovie(data.movieId);
        } else if (data.movieId) {
          API.get(`/api/movies/${data.movieId}`)
            .then((res) => setMovie(res.data))
            .catch(() => {});
        }
      } catch (err) {
        if (!silent) setStatus(err?.response?.status === 404 ? "missing" : "error");
      } finally {
        setRefreshing(false);
      }
    },
    [showId, toast]
  );

  useEffect(() => {
    fetchShow();
  }, [fetchShow]);

  // Keep availability fresh when the user comes back to the tab.
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") fetchShow(true);
    };
    document.addEventListener("visibilitychange", onFocus);
    return () => document.removeEventListener("visibilitychange", onFocus);
  }, [fetchShow]);

  useEffect(() => {
    selectedRef.current = selectedSeats;
    sessionStorage.setItem(seatStorageKey(showId), JSON.stringify(selectedSeats));
  }, [showId, selectedSeats]);

  // Categories top-to-bottom (back of the hall first, screen at the bottom), each
  // with rows of seats. Rows, aisles and recliners come from the show's layout.
  const layout = useMemo(() => {
    if (!show?.seats) return [];
    const hall = buildAuditorium(show.layout, show.seats);
    if (hall) {
      const categories = [];
      [...hall.rows].reverse().forEach((row) => {
        if (row.seats.length === 0) return;
        let category = categories[categories.length - 1];
        if (!category || category.name !== row.section) {
          category = { name: row.section, price: row.seats[0].price, rows: [] };
          categories.push(category);
        }
        category.rows.push({ label: row.label, seats: row.seats, aisleAfter: row.aisleAfter || [], seatType: row.seatType });
      });
      return categories;
    }
    // Fallback for responses without a layout: one aisle in the middle of each row.
    const categories = [];
    show.seats.forEach((seat) => {
      const name = seat.category || "Standard";
      let category = categories.find((c) => c.name === name);
      if (!category) {
        category = { name, price: seat.price, rows: [] };
        categories.push(category);
      }
      const label = rowOf(seat.seatNumber);
      let row = category.rows.find((r) => r.label === label);
      if (!row) {
        row = { label, seats: [] };
        category.rows.push(row);
      }
      row.seats.push(seat);
    });
    categories.forEach((c) =>
      c.rows.forEach((r) => r.seats.sort((a, b) => numberOf(a.seatNumber) - numberOf(b.seatNumber)))
    );
    return categories;
  }, [show]);

  const premiumCategory = useMemo(() => {
    if (layout.length < 2) return null;
    return layout.reduce((top, c) => (c.price > top.price ? c : top), layout[0]).name;
  }, [layout]);

  const selectedObjects = useMemo(
    () => (show?.seats || []).filter((s) => selectedSeats.includes(s.seatNumber)),
    [show, selectedSeats]
  );
  const total = selectedObjects.reduce((sum, s) => sum + s.price, 0);
  const availableCount = (show?.seats || []).filter((s) => !s.isBooked).length;

  const toggleSeat = (seat) => {
    if (seat.isBooked) return;
    if (selectedSeats.includes(seat.seatNumber)) {
      setSelectedSeats(selectedSeats.filter((n) => n !== seat.seatNumber));
    } else if (selectedSeats.length >= MAX_SEATS) {
      toast.info(`You can book up to ${MAX_SEATS} seats at a time.`);
    } else {
      setSelectedSeats([...selectedSeats, seat.seatNumber]);
    }
  };

  // Pick the most central block of `count` adjacent free seats, preferring the middle rows.
  const pickBestSeats = (count) => {
    const rows = layout.flatMap((c) => c.rows);
    const middle = (rows.length - 1) / 2;
    let best = null;
    rows.forEach((row, rowIndex) => {
      const centre = (row.seats.length - 1) / 2;
      for (let start = 0; start + count <= row.seats.length; start++) {
        const block = row.seats.slice(start, start + count);
        const adjacent = block.every(
          (s, i) => !s.isBooked && (i === 0 || numberOf(s.seatNumber) - numberOf(block[i - 1].seatNumber) === 1)
        );
        if (!adjacent) continue;
        const blockCentre = start + (count - 1) / 2;
        // Keep groups on one side of the aisle whenever a row allows it.
        const aisle = Math.ceil(row.seats.length / 2);
        const splitByAisle = start < aisle && start + count > aisle ? 4 : 0;
        const score = Math.abs(blockCentre - centre) + Math.abs(rowIndex - middle) * 1.5 + splitByAisle;
        if (!best || score < best.score) best = { score, seats: block.map((s) => s.seatNumber) };
      }
    });
    if (best) {
      setSelectedSeats(best.seats);
      return;
    }
    const free = (show?.seats || []).filter((s) => !s.isBooked).map((s) => s.seatNumber);
    if (free.length >= count) {
      setSelectedSeats(free.slice(0, count));
      toast.info(`${count} seats together aren't available, so we picked the closest we could.`);
    } else {
      toast.error(`Only ${free.length} ${free.length === 1 ? "seat is" : "seats are"} left for this show.`);
    }
  };

  // Continue = hold the seats on the server for a few minutes, then go to checkout.
  const [holding, setHolding] = useState(false);
  const handleProceed = async () => {
    if (selectedSeats.length === 0 || holding) return;
    setHolding(true);
    try {
      const { data } = await API.post(`/api/shows/${showId}/holds`, { seats: selectedSeats });
      navigate(`/addons/${showId}`, {
        state: { selectedSeats, totalPrice: total, show, holdExpiresAt: data.expiresAt },
      });
    } catch (err) {
      if (err.response?.status === 409) {
        const taken = Array.isArray(err.response.data?.seats) ? err.response.data.seats : [];
        setSelectedSeats((prev) => prev.filter((n) => !taken.includes(n)));
        toast.error(
          taken.length
            ? `${taken.join(", ")} ${taken.length === 1 ? "was" : "were"} just taken. Please pick again.`
            : "Some seats were just taken. Please pick again."
        );
        fetchShow(true);
      } else {
        toast.error(getErrorMessage(err, "We couldn't reserve your seats. Please try again."));
      }
    } finally {
      setHolding(false);
    }
  };

  const clearSelection = () => {
    setSelectedSeats([]);
    // Let go of any seats this user was holding for this show.
    API.delete(`/api/shows/${showId}/holds`).catch(() => {});
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied — share it so friends can book nearby seats.");
    } catch (e) {
      toast.error("Couldn't copy the link.");
    }
  };

  if (status === "loading") {
    return (
      <main className="container-page min-h-[80vh] py-10" role="status" aria-label="Loading seats">
        <div className="skeleton h-16 w-full max-w-xl rounded-2xl" />
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="skeleton h-[480px] rounded-2xl" />
          <div className="skeleton hidden h-72 rounded-2xl lg:block" />
        </div>
      </main>
    );
  }

  if (status !== "ready") {
    return (
      <main id="main" className="container-page min-h-[70vh] py-16">
        {status === "missing" ? (
          <EmptyState
            icon="calendar"
            title="Show not found"
            message="This showtime may have been removed. Pick another one to continue."
            action={<Link to="/movies" className="btn-primary">Browse movies</Link>}
          />
        ) : (
          <ErrorState title="We couldn't load the seat map" onRetry={() => { setStatus("loading"); fetchShow(); }} />
        )}
      </main>
    );
  }

  const movieId = movie?._id || (typeof show.movieId === "string" ? show.movieId : null);
  const ended = !isUpcomingShow(show);

  const summary = (
    <>
      {selectedObjects.length === 0 ? (
        <p className="text-sm text-gray-400">Tap a seat on the map to select it. You can pick up to {MAX_SEATS}.</p>
      ) : (
        <ul className="space-y-2.5 text-sm">
          {layout
            .map((c) => ({ ...c, picked: selectedObjects.filter((s) => (s.category || "Standard") === c.name) }))
            .filter((c) => c.picked.length > 0)
            .map((c) => (
              <li key={c.name} className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block font-medium text-white">
                    {c.name} × {c.picked.length}
                  </span>
                  <span className="block truncate text-xs text-gray-400">
                    {c.picked.map((s) => s.seatNumber).join(", ")}
                  </span>
                </span>
                <span className="shrink-0 font-semibold text-white">
                  {formatPrice(c.picked.reduce((sum, s) => sum + s.price, 0))}
                </span>
              </li>
            ))}
        </ul>
      )}
    </>
  );

  return (
    <main id="main" className="min-h-screen bg-ink-950 pb-32 lg:pb-16">
      {/* ───────────── Show header ───────────── */}
      <div className="border-b border-white/[0.07] bg-ink-900">
        <div className="container-page flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => navigate(movieId ? `/movies/${movieId}` : -1)} className="btn-icon" aria-label="Back to movie">
              <Icon name="arrowLeft" className="h-5 w-5" />
            </button>
            {movie?.poster && <Poster src={movie.poster} alt="" className="hidden h-14 w-10 shrink-0 rounded-lg sm:block" />}
            <div className="min-w-0">
              <h1 className="truncate font-display text-lg font-bold text-white sm:text-xl">
                {movie?.title || "Select seats"}
              </h1>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-400 sm:text-sm">
                <span className="inline-flex items-center gap-1"><Icon name="pin" className="h-3.5 w-3.5" />{show.theatre}</span>
                <span className="inline-flex items-center gap-1"><Icon name="calendar" className="h-3.5 w-3.5" />{formatShowDate(show.date, { weekday: "short", day: "numeric", month: "short" })}</span>
                <span className="inline-flex items-center gap-1"><Icon name="clock" className="h-3.5 w-3.5" />{formatShowTime(show.time)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => fetchShow(true)} className="btn-icon" aria-label="Refresh seat availability" disabled={refreshing}>
              {refreshing ? <Spinner className="h-4 w-4" /> : <Icon name="refresh" className="h-4 w-4" />}
            </button>
            <button onClick={handleShare} className="btn-icon" aria-label="Copy link to this show">
              <Icon name="share" className="h-4 w-4" />
            </button>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${show.theatre} cinema`)}`}
              target="_blank"
              rel="noreferrer"
              className="btn-icon"
              aria-label="Get directions to the theatre"
            >
              <Icon name="pin" className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      <div className="container-page mt-6">
        {/* Steps */}
        <ol className="mb-6 flex items-center gap-2 text-xs font-semibold text-gray-500" aria-label="Booking progress">
          <li className="flex items-center gap-2 text-white">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-[11px]">1</span> Seats
          </li>
          <li aria-hidden="true" className="h-px w-8 bg-white/15" />
          <li className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[11px]">2</span> Extras &amp; checkout
          </li>
          <li aria-hidden="true" className="h-px w-8 bg-white/15" />
          <li className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[11px]">3</span> Ticket
          </li>
        </ol>

        {ended && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-gold-500/25 bg-gold-500/[0.06] p-4 text-sm text-gray-300">
            <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0 text-gold-400" />
            <p>This showtime's date has already passed. Check the date before you book.</p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* ───────────── Seat map ───────────── */}
          <section className="card overflow-hidden" aria-label="Seat map">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3 sm:px-6">
              <p className="text-sm text-gray-400">
                <span className="font-semibold text-white">{availableCount}</span> of {show.seats.length} seats available
              </p>
              <div className="flex items-center gap-1.5">
                <span className="mr-1 text-xs text-gray-500">Pick for me:</span>
                {[1, 2, 3, 4, 6].map((count) => (
                  <button
                    key={count}
                    onClick={() => pickBestSeats(count)}
                    aria-label={`Pick the best ${count} ${count === 1 ? "seat" : "seats"} for me`}
                    className={`h-8 w-8 rounded-lg border text-xs font-bold transition ${
                      selectedSeats.length === count
                        ? "border-brand-500 bg-brand-500/15 text-brand-300"
                        : "border-white/10 text-gray-300 hover:border-white/25 hover:text-white"
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto px-4 py-8 sm:px-6">
              <div className="mx-auto w-max min-w-full">
                <div className="mx-auto flex w-max flex-col items-stretch gap-8">
                  {layout.map((category) => {
                    const isPremium = category.name === premiumCategory;
                    return (
                      <div key={category.name}>
                        <div className="mb-3 flex items-center gap-3">
                          <span className="h-px flex-1 bg-white/[0.08]" />
                          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                            {isPremium && <Icon name="crown" className="h-3.5 w-3.5 text-gold-400" />}
                            {category.name}
                            <span className="text-white">{formatPrice(category.price)}</span>
                          </span>
                          <span className="h-px flex-1 bg-white/[0.08]" />
                        </div>

                        <div className="space-y-1.5">
                          {category.rows.map((row) => {
                            const aisles = row.aisleAfter || [Math.ceil(row.seats.length / 2)];
                            // Split the row into blocks wherever an aisle runs.
                            const blocks = [];
                            row.seats.forEach((seat) => {
                              const n = numberOf(seat.seatNumber);
                              const startsBlock = blocks.length === 0 || aisles.includes(n - 1);
                              if (startsBlock) blocks.push([]);
                              blocks[blocks.length - 1].push(seat);
                            });
                            const recliner = row.seatType === "recliner";
                            return (
                              <div key={row.label} className={`flex items-center justify-center gap-2 ${recliner ? "py-0.5" : ""}`}>
                                <span className="w-5 text-center text-[11px] font-semibold text-gray-500" aria-hidden="true">
                                  {row.label}
                                </span>
                                {blocks.map((block, i) => (
                                  <React.Fragment key={i}>
                                    {i > 0 && <span className="w-6 sm:w-10" aria-hidden="true" />}
                                    <div className="flex gap-1.5">
                                      {block.map((seat) => (
                                        <SeatButton
                                          key={seat.seatNumber}
                                          seat={seat}
                                          premium={isPremium}
                                          recliner={recliner}
                                          selected={selectedSeats.includes(seat.seatNumber)}
                                          onToggle={toggleSeat}
                                        />
                                      ))}
                                    </div>
                                  </React.Fragment>
                                ))}
                                <span className="w-5 text-center text-[11px] font-semibold text-gray-500" aria-hidden="true">
                                  {row.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Screen */}
                  <div className="px-6 pt-4" aria-hidden="true">
                    <div className="mx-auto h-10 w-full max-w-md rounded-[50%] border-t-4 border-white/70 bg-gradient-to-b from-white/15 to-transparent" />
                    <p className="-mt-3 text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-gray-500">
                      Screen this way
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-white/[0.07] px-4 py-4 text-xs text-gray-400">
              <LegendItem className="border-white/25 bg-white/[0.03]" label="Available" />
              {premiumCategory && <LegendItem className="border-gold-500/60 bg-gold-500/[0.08]" label={`Premium (${premiumCategory})`} />}
              {layout.some((c) => c.rows.some((r) => r.seatType === "recliner")) && (
                <LegendItem className="w-6 rounded-t-lg border-white/25 bg-white/[0.03]" label="Recliner" />
              )}
              <LegendItem className="border-brand-500 bg-brand-500" label="Selected" />
              <LegendItem className="border-dashed border-sky-400/50 bg-sky-400/[0.08]" label="Reserved (someone is checking out)" />
              <LegendItem className="border-transparent bg-white/[0.08]" label="Booked" />
            </div>
          </section>

          {/* ───────────── Summary (desktop) ───────────── */}
          <aside className="hidden lg:block">
            <div className="card sticky top-24 p-5">
              <h2 className="text-lg font-bold text-white">Your selection</h2>
              <div className="mt-4 min-h-[72px]">{summary}</div>
              <div className="mt-4 flex items-center justify-between border-t border-white/[0.07] pt-4">
                <span className="text-sm text-gray-400">
                  {selectedSeats.length} {selectedSeats.length === 1 ? "ticket" : "tickets"}
                </span>
                <span className="font-display text-2xl font-bold text-white">{formatPrice(total)}</span>
              </div>
              <button onClick={handleProceed} disabled={selectedSeats.length === 0 || holding} className="btn-primary btn-lg mt-4 w-full">
                {holding ? <><Spinner className="h-5 w-5" /> Reserving seats…</> : <>Continue <Icon name="arrowRight" className="h-4 w-4" /></>}
              </button>
              {selectedSeats.length > 0 && (
                <button onClick={clearSelection} className="btn-ghost mt-2 w-full text-xs">
                  Clear selection
                </button>
              )}
              <p className="mt-3 text-center text-[11px] text-gray-500">
                Continuing holds your seats for a few minutes. They're confirmed when you complete checkout.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* ───────────── Summary bar (mobile & tablet) ───────────── */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-ink-900/95 backdrop-blur-xl lg:hidden">
        <div className="container-page flex items-center justify-between gap-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-xs text-gray-400" aria-live="polite">
              {selectedSeats.length === 0
                ? "No seats selected"
                : `${selectedSeats.length} ${selectedSeats.length === 1 ? "seat" : "seats"}: ${selectedSeats.join(", ")}`}
            </p>
            <p className="font-display text-xl font-bold text-white">{formatPrice(total)}</p>
          </div>
          <button onClick={handleProceed} disabled={selectedSeats.length === 0 || holding} className="btn-primary btn-lg shrink-0">
            {holding ? <><Spinner className="h-5 w-5" /> Reserving…</> : <>Continue <Icon name="arrowRight" className="h-4 w-4" /></>}
          </button>
        </div>
      </div>
    </main>
  );
}

function SeatButton({ seat, selected, premium, recliner, onToggle }) {
  const size = recliner ? "h-7 w-8 rounded-t-xl sm:h-8 sm:w-10" : "h-7 w-7 rounded-t-lg sm:h-8 sm:w-8";
  const base = `flex ${size} items-center justify-center rounded-b-[4px] border text-[10px] font-semibold transition duration-150 sm:text-[11px]`;
  const kind = recliner ? "recliner, " : "";
  let style;
  if (seat.reserved) {
    style = "cursor-not-allowed border-dashed border-sky-400/50 bg-sky-400/[0.08] text-transparent";
  } else if (seat.isBooked) {
    style = "cursor-not-allowed border-transparent bg-white/[0.08] text-transparent";
  } else if (selected) {
    style = "scale-105 border-brand-500 bg-brand-500 text-white shadow-glow";
  } else if (premium) {
    style = "border-gold-500/60 bg-gold-500/[0.08] text-gold-400 hover:bg-gold-500/25";
  } else {
    style = "border-white/25 bg-white/[0.03] text-gray-300 hover:border-brand-400 hover:bg-brand-500/15 hover:text-white";
  }

  return (
    <button
      type="button"
      onClick={() => onToggle(seat)}
      disabled={seat.isBooked}
      aria-pressed={seat.isBooked ? undefined : selected}
      aria-label={
        seat.reserved
          ? `Seat ${seat.seatNumber}, reserved by another customer`
          : seat.isBooked
          ? `Seat ${seat.seatNumber}, booked`
          : `Seat ${seat.seatNumber}, ${kind}${seat.category}, ${formatPrice(seat.price)}${selected ? ", selected" : ""}`
      }
      title={seat.reserved ? `${seat.seatNumber} · Reserved` : seat.isBooked ? `${seat.seatNumber} · Booked` : `${seat.seatNumber} · ${recliner ? "Recliner · " : ""}${seat.category} · ${formatPrice(seat.price)}`}
      className={`${base} ${style}`}
    >
      {numberOf(seat.seatNumber)}
    </button>
  );
}

function LegendItem({ className, label }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-4 w-4 rounded-t-md rounded-b-[3px] border ${className}`} />
      {label}
    </span>
  );
}
