import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import API from "../api";
import Icon from "../components/ui/Icon";
import Poster from "../components/Poster";
import { EmptyState, ErrorState, Spinner } from "../components/ui/Feedback";
import { useToast } from "../components/ui/Toast";
import { categoryLabel, formatPrice, formatShowDate, formatShowTime, isUpcomingShow } from "../lib/format";
import { buildAuditorium } from "../lib/auditorium";
import { defaultQuality, hasWebGL, isNarrowScreen, prefersReducedMotion } from "../lib/webgl";
import { heatmap, recommendSeats } from "../lib/seatInsights";
import SeatAdvisor from "../components/SeatAdvisor";
import ErrorBoundary from "../components/ErrorBoundary";
import HoldCountdown from "../components/HoldCountdown";
import useSeatHold, { inBookingFlow, releaseHoldNow } from "../lib/useSeatHold";

// The 3D auditorium (three.js) is loaded only when someone opens it.
const Auditorium3D = lazy(() => import("../components/cinema3d/Auditorium3D"));
const VIEW_KEY = "cinebook:seatView";
const QUALITY_KEY = "cinebook:3dQuality";

const initialView = () => {
  if (!hasWebGL()) return "2d";
  const saved = localStorage.getItem(VIEW_KEY);
  if (saved === "2d" || saved === "3d") return saved;
  return isNarrowScreen() ? "2d" : "3d";
};

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
  const mapScrollRef = useRef(null);
  const [view, setView] = useState(initialView);
  const [view3dFailed, setView3dFailed] = useState(false);

  const webgl = useMemo(() => hasWebGL(), []);
  const show3d = view === "3d" && webgl && !view3dFailed;
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);
  // Graphics quality for the 3D hall (High / Balanced / Lite): chosen from the
  // device's capability, or picked on the 3D toolbar (remembered on this device).
  const [quality, setQualityState] = useState(() => {
    const saved = localStorage.getItem(QUALITY_KEY);
    if (saved === "full") return "balanced"; // the old "full quality" setting
    return ["high", "balanced", "lite"].includes(saved) ? saved : defaultQuality();
  });
  const setQuality = useCallback((next) => {
    localStorage.setItem(QUALITY_KEY, next);
    setQualityState(next);
  }, []);
  const chooseView = (v) => {
    setView(v);
    localStorage.setItem(VIEW_KEY, v);
  };

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

  // On narrow screens the map scrolls sideways; start centred on the aisle.
  useEffect(() => {
    const el = mapScrollRef.current;
    if (status !== "ready" || !el) return;
    if (el.scrollWidth > el.clientWidth) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, [status, view]);

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
  // The hall (seat positions, accessibility, doors) from the show's layout.
  const hall = useMemo(() => (show?.seats ? buildAuditorium(show.layout, show.seats) : null), [show]);
  const layout = useMemo(() => {
    if (!show?.seats) return [];
    if (hall) {
      const categories = [];
      [...hall.rows].reverse().forEach((row) => {
        if (row.seats.length === 0) return;
        let category = categories[categories.length - 1];
        if (!category || category.name !== row.section) {
          category = { name: row.section, price: row.seats[0].price, rows: [] };
          categories.push(category);
        }
        category.rows.push({ label: row.label, seats: row.seats, aisleAfter: row.aisleAfter || [], seatType: row.seatType, crossAisleBefore: !!row.crossAisleBefore });
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
  }, [show, hall]);

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

  /* ---------- Seat advisor: heatmap, comparison, previews ---------- */
  const [heatMode, setHeatMode] = useState("availability");
  const heat = useMemo(() => heatmap(hall, heatMode), [hall, heatMode]);
  const [compare, setCompare] = useState([]);
  const [compareMode, setCompareMode] = useState(false);
  const [previewRequest, setPreviewRequest] = useState(null);
  const addToCompare = useCallback(
    (seat) => {
      setCompare((list) => {
        if (list.includes(seat.seatNumber)) return list.filter((n) => n !== seat.seatNumber);
        if (list.length >= 3) {
          toast.info("You can compare up to three seats. Remove one first.");
          return list;
        }
        return [...list, seat.seatNumber];
      });
    },
    [toast]
  );
  const applySeats = (numbers) => {
    if (show && !isUpcomingShow(show)) {
      toast.info("This showtime has already started, so seats can't be booked.");
      return;
    }
    const free = numbers.filter((n) => {
      const s = hall?.seatIndex.get(n);
      return s && (!s.isBooked || selectedSeats.includes(n));
    });
    setSelectedSeats(free.slice(0, MAX_SEATS));
    setCompareMode(false);
  };

  const toggleSeat = (seat) => {
    if (seat.isBooked) return;
    if (compareMode) {
      addToCompare(seat);
      return;
    }
    if (show && !isUpcomingShow(show)) {
      toast.info("This showtime has already started, so seats can't be booked.");
      return;
    }
    if (selectedSeats.includes(seat.seatNumber)) {
      setSelectedSeats(selectedSeats.filter((n) => n !== seat.seatNumber));
    } else if (selectedSeats.length >= MAX_SEATS) {
      toast.info(`You can book up to ${MAX_SEATS} seats at a time.`);
    } else {
      setSelectedSeats([...selectedSeats, seat.seatNumber]);
    }
  };

  // Pick the best `count` adjacent free seats by viewing geometry (see lib/seatInsights).
  const pickBestSeats = (count) => {
    const best = hall ? recommendSeats(hall, { mode: "best", count, limit: 1 }).options[0] : null;
    if (best) {
      applySeats(best.seatNumbers);
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

  // Seats are held on the server automatically as they're picked (debounced,
  // one request at a time, latest selection wins). The server decides who gets
  // a seat: if someone else got there first, it's removed from the selection.
  const handleHoldConflict = useCallback(
    (taken) => {
      setSelectedSeats((prev) => prev.filter((n) => !taken.includes(n)));
      toast.error(`${taken.join(", ")} ${taken.length === 1 ? "was" : "were"} just taken by someone else. Please pick again.`);
      fetchShow(true);
    },
    [toast, fetchShow]
  );
  const { hold, flush, renew } = useSeatHold({
    showId,
    selected: selectedSeats,
    enabled: status === "ready" && !!show && isUpcomingShow(show),
    onConflict: handleHoldConflict,
  });

  // Continue: make sure the latest selection is held, then go to checkout.
  const [holding, setHolding] = useState(false);
  const handleProceed = async () => {
    if (selectedSeats.length === 0 || holding) return;
    setHolding(true);
    try {
      const confirmed = await flush();
      const want = [...selectedRef.current].sort().join(",");
      if (confirmed.status === "held" && [...confirmed.seats].sort().join(",") === want) {
        navigate(`/addons/${showId}`, {
          state: { selectedSeats: selectedRef.current, totalPrice: total, show, holdExpiresAt: confirmed.expiresAt },
        });
      } else if (confirmed.status === "error") {
        toast.error("We couldn't hold your seats. Please try again.");
      }
      // On a conflict the taken seats were already removed and explained.
    } finally {
      setHolding(false);
    }
  };

  // Clearing the selection releases the hold (through the same channel).
  const clearSelection = () => setSelectedSeats([]);

  // Leaving the booking flow (not to this show's checkout) or closing the tab
  // releases the hold. The server only ever releases this user's own holds.
  useEffect(() => {
    const onHide = () => releaseHoldNow(showId);
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      setTimeout(() => {
        if (!inBookingFlow(showId)) releaseHoldNow(showId);
      }, 0);
    };
  }, [showId]);

  // Keep availability fresh: every 15 s while visible, and on returning to the tab.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") fetchShow(true);
    }, 15000);
    return () => clearInterval(id);
  }, [fetchShow]);


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
      <main id="main" className="container-page min-h-[80vh] py-10" role="status" aria-label="Loading seats">
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
                    {categoryLabel(c.name)} × {c.picked.length}
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
    <main id="main" className="min-h-screen pb-32 lg:pb-16">
      {/* ───────────── Show header ───────────── */}
      <div className="border-b border-line bg-ink-900">
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
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-solid text-2xs text-on-brand">1</span> Seats
          </li>
          <li aria-hidden="true" className="h-px w-8 bg-white/15" />
          <li className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-fill-emphasis text-2xs">2</span> Extras &amp; checkout
          </li>
          <li aria-hidden="true" className="h-px w-8 bg-white/15" />
          <li className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-fill-emphasis text-2xs">3</span> Ticket
          </li>
        </ol>

        {ended && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-gold-500/25 bg-gold-500/[0.06] p-4 text-sm text-gray-300">
            <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0 text-gold-400" />
            <p>This showtime has already started, so seats can no longer be booked. <Link to={movieId ? `/movies/${movieId}` : "/movies"} className="font-semibold text-brand-300 underline">Pick another showtime</Link>.</p>
          </div>
        )}

        {/* In the 3D view the booking panel floats inside the hall, so the hall gets the full width. */}
        <div className={`grid gap-6 ${show3d ? "" : "lg:grid-cols-[minmax(0,1fr)_340px]"}`}>
          {/* ───────────── Seat map ───────────── */}
          <section className={`card ${view === "2d" ? "overflow-hidden" : ""}`} aria-label="Seat map">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-6">
              <div className="flex flex-wrap items-center gap-3">
                {webgl && (
                  <div className="flex rounded-xl border border-line-strong bg-fill-subtle p-1" role="group" aria-label="Seat view">
                    {[["3d", "3D hall"], ["2d", "2D map"]].map(([v, label]) => (
                      <button key={v} onClick={() => chooseView(v)} aria-pressed={view === v} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${view === v ? "bg-brand-gradient text-on-brand" : "text-gray-400 hover:text-white"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-sm text-gray-400">
                  <span className="font-semibold text-white">{availableCount}</span> of {show.seats.length} seats available
                </p>
              </div>
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
                        : "border-line-strong text-gray-300 hover:border-white/25 hover:text-white"
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            {show3d ? (
              <ErrorBoundary
                onError={() => {
                  setView3dFailed(true);
                  toast.info("The 3D view couldn't start on this device, so we switched to the 2D map.");
                }}
                fallback={null}
              >
                <Suspense
                  fallback={
                    <div className="m-2 flex h-[min(78vh,680px)] min-h-[460px] flex-col items-center justify-center gap-3 rounded-xl bg-ink-950 sm:m-3" role="status">
                      <Spinner className="h-8 w-8 text-brand-400" />
                      <p className="text-sm text-gray-300">Preparing your cinema…</p>
                    </div>
                  }
                >
                  <div className="p-2 sm:p-3">
                    <Auditorium3D
                      // A new renderer when the quality changes (antialiasing is fixed at creation).
                      key={quality}
                      quality={quality}
                      onQualityChange={setQuality}
                      heatmapColors={heat.colors}
                      highlight={compare}
                      compareMode={compareMode}
                      onCompare={addToCompare}
                      previewRequest={previewRequest}
                      layout={show.layout}
                      seats={show.seats}
                      selected={selectedSeats}
                      onToggle={toggleSeat}
                      onClear={clearSelection}
                      onContinue={handleProceed}
                      continuing={holding}
                      hold={hold}
                      onRenewHold={renew}
                      availableCount={availableCount}
                      maxSeats={MAX_SEATS}
                      premiumCategory={premiumCategory}
                      movieTitle={movie?.title}
                      moviePoster={movie?.poster}
                      trailerUrl={movie?.trailerUrl}
                      reducedMotion={reducedMotion}
                    />
                  </div>
                </Suspense>
              </ErrorBoundary>
            ) : (
              <>
              <p className="px-4 pt-3 text-center text-xs text-gray-500 sm:hidden">Swipe sideways to see every seat.</p>
              <div ref={mapScrollRef} data-testid="seat-map-scroll" className="overflow-x-auto px-3 py-6 sm:px-4 sm:py-8">
                <div className="mx-auto w-max min-w-full">
                  <div className="mx-auto flex w-max flex-col items-stretch gap-8">
                    {layout.map((category) => {
                      const isPremium = category.name === premiumCategory;
                      return (
                        <div key={category.name}>
                          <div className="mb-3 flex items-center gap-3">
                            <span className="h-px flex-1 bg-fill-strong" />
                            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                              {isPremium && <Icon name="crown" className="h-3.5 w-3.5 text-accent-300" />}
                              {categoryLabel(category.name)}
                              <span className="text-white">{formatPrice(category.price)}</span>
                            </span>
                            <span className="h-px flex-1 bg-fill-strong" />
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
                                <React.Fragment key={row.label}>
                                <div className={`flex items-center justify-center gap-2 ${recliner ? "py-0.5" : ""}`}>
                                  <span className="w-5 text-center text-2xs font-semibold text-gray-500" aria-hidden="true">
                                    {row.label}
                                  </span>
                                  {blocks.map((block, i) => (
                                    <React.Fragment key={i}>
                                      {i > 0 && <span className="w-5 sm:w-8" aria-hidden="true" />}
                                      <div className="flex gap-1.5">
                                        {block.map((seat) => (
                                          <SeatButton
                                            key={seat.seatNumber}
                                            seat={seat}
                                            premium={isPremium}
                                            recliner={recliner}
                                            selected={selectedSeats.includes(seat.seatNumber)}
                                            onToggle={toggleSeat}
                                            heatColor={heat.colors ? heat.colors.get(seat.seatNumber) : null}
                                            compared={compare.includes(seat.seatNumber)}
                                          />
                                        ))}
                                      </div>
                                    </React.Fragment>
                                  ))}
                                  <span className="w-5 text-center text-2xs font-semibold text-gray-500" aria-hidden="true">
                                    {row.label}
                                  </span>
                                </div>
                                {/* A level cross-aisle runs in front of this row (towards the screen). */}
                                {row.crossAisleBefore && (
                                  <div className="flex items-center gap-3 py-1.5" aria-hidden="true" data-testid="cross-aisle-2d">
                                    <span className="h-px flex-1 border-t border-dashed border-line-strong" />
                                    <span className="text-3xs font-semibold uppercase tracking-[0.2em] text-gray-500">Cross-aisle</span>
                                    <span className="h-px flex-1 border-t border-dashed border-line-strong" />
                                  </div>
                                )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
  
                    {/* Screen */}
                    <div className="px-6 pt-4" aria-hidden="true">
                      <div className="mx-auto h-10 w-full max-w-md rounded-[50%] border-t-4 border-white/70 bg-gradient-to-b from-white/15 to-transparent" />
                      <p className="-mt-3 text-center text-2xs font-semibold uppercase tracking-[0.3em] text-gray-500">
                        Screen this way
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              </>
            )}

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-line px-4 py-4 text-xs text-gray-400">
              <LegendItem className="border-white/25 bg-fill-subtle" label="Available" />
              {premiumCategory && <LegendItem className="border-accent-400/60 bg-accent-500/[0.1]" label="Premium" />}
              {layout.some((c) => c.rows.some((r) => r.seatType === "recliner")) && (
                <LegendItem className="w-6 rounded-t-lg border-white/25 bg-fill-subtle" label="Recliner" />
              )}
              <LegendItem className="border-brand-solid bg-brand-solid" label="Selected" />
              <LegendItem className="border-dashed border-sky-400/50 bg-sky-400/[0.08]" label="Reserved (someone is checking out)" />
              <LegendItem className="border-transparent bg-fill-strong" label="Booked" />
              {hall?.accessibility?.configured && (
                <span className="inline-flex items-center gap-2">
                  <span className="flex h-4 w-4 items-center justify-center rounded-t-md rounded-b-[3px] border border-sky-300/70 text-[9px] font-bold text-sky-200" aria-hidden="true">♿</span>
                  Wheelchair space
                </span>
              )}
            </div>
            {hall?.accessibility?.configured && hall.accessibility.note && (
              <p className="border-t border-line px-4 py-2 text-center text-2xs text-gray-500" data-testid="access-note">{hall.accessibility.note}</p>
            )}
          </section>

          {/* ───────────── Summary (desktop) ───────────── */}
          <aside className={show3d ? "hidden" : "hidden lg:block"}>
            <div className="card sticky top-24 p-5">
              <h2 className="text-lg font-bold text-white">Your selection</h2>
              <div className="mt-4 min-h-[72px]">{summary}</div>
              <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
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
              <HoldCountdown hold={hold} selectedCount={selectedSeats.length} onRenew={renew} className="mt-3 justify-center" />
              <p className="mt-2 text-center text-2xs text-gray-500">
                Seats you pick are held for you for 8 minutes. They're confirmed when you complete checkout.
              </p>
            </div>
          </aside>
        </div>

        {hall && (
          <div className={`mt-6 ${show3d ? "" : "lg:max-w-[calc(100%-364px)]"}`}>
            <SeatAdvisor
              hall={hall}
              selected={selectedSeats}
              premiumCategory={premiumCategory}
              maxSeats={MAX_SEATS}
              onApply={applySeats}
              onPreview={show3d ? (n) => setPreviewRequest({ seatNumber: n, at: Date.now() }) : null}
              heatMode={heatMode}
              onHeatMode={setHeatMode}
              legend={heat.legend}
              compare={compare}
              onCompareChange={setCompare}
              compareMode={compareMode}
              onCompareMode={setCompareMode}
              disabled={ended}
            />
          </div>
        )}
      </div>

      {/* ───────────── Summary bar (mobile & tablet) ───────────── */}
      <div className={`fixed inset-x-0 bottom-0 z-30 border-t border-line-strong bg-ink-900/95 backdrop-blur-xl lg:hidden ${show3d ? "hidden" : ""}`}>
        <div className="container-page flex items-center justify-between gap-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-xs text-gray-400" aria-live="polite">
              {selectedSeats.length === 0
                ? "No seats selected"
                : `${selectedSeats.length} ${selectedSeats.length === 1 ? "seat" : "seats"}: ${selectedSeats.join(", ")}`}
            </p>
            <p className="font-display text-xl font-bold text-white">{formatPrice(total)}</p>
            <HoldCountdown hold={hold} selectedCount={selectedSeats.length} onRenew={renew} />
          </div>
          <button onClick={handleProceed} disabled={selectedSeats.length === 0 || holding} className="btn-primary btn-lg shrink-0">
            {holding ? <><Spinner className="h-5 w-5" /> Reserving…</> : <>Continue <Icon name="arrowRight" className="h-4 w-4" /></>}
          </button>
        </div>
      </div>
    </main>
  );
}

// True for colours light enough that dark text reads better than white on them.
const isLightColor = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.18;
};

function SeatButton({ seat, selected, premium, recliner, onToggle, heatColor = null, compared = false }) {
  const size = recliner ? "h-7 w-8 rounded-t-xl sm:h-8 sm:w-10" : "h-7 w-7 rounded-t-lg sm:h-8 sm:w-8";
  const base = `flex ${size} items-center justify-center rounded-b-[4px] border text-3xs font-semibold transition duration-150 sm:text-2xs`;
  const kind = recliner ? "recliner, " : "";
  const access = [seat.wheelchair && "wheelchair space", seat.companion && "companion seat", seat.aisleSeat && "aisle seat"].filter(Boolean);
  const accessText = access.length ? `${access.join(", ")}, ` : "";
  let style;
  let inline;
  if (seat.reserved) {
    style = "cursor-not-allowed border-dashed border-sky-400/50 bg-sky-400/[0.08] text-transparent";
  } else if (seat.isBooked) {
    style = "cursor-not-allowed border-transparent bg-fill-strong text-transparent";
  } else if (selected) {
    style = "scale-105 border-brand-solid bg-brand-solid text-on-brand shadow-glow";
  } else if (heatColor) {
    // Heatmap: the colour shows the metric; the number is dark on light shades
    // and white on dark ones, so it stays readable across the whole scale.
    style = `border-white/30 ${isLightColor(heatColor) ? "text-ink-950" : "text-white"} hover:brightness-125`;
    inline = { background: heatColor };
  } else if (premium) {
    style = "border-accent-400/60 bg-accent-500/[0.1] text-accent-200 hover:bg-accent-500/25";
  } else {
    style = "border-white/25 bg-fill-subtle text-gray-300 hover:border-brand-400 hover:bg-brand-500/15 hover:text-white";
  }
  if (seat.wheelchair && !seat.isBooked && !selected) style += " border-2 border-sky-300";
  if (compared) style += " ring-2 ring-white ring-offset-1 ring-offset-ink-900";

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
          : `Seat ${seat.seatNumber}, ${kind}${accessText}${categoryLabel(seat.category)}, ${formatPrice(seat.price)}${selected ? ", selected" : ""}${compared ? ", in comparison" : ""}`
      }
      title={seat.reserved ? `${seat.seatNumber} · Reserved` : seat.isBooked ? `${seat.seatNumber} · Booked` : `${seat.seatNumber} · ${recliner ? "Recliner · " : ""}${categoryLabel(seat.category)} · ${formatPrice(seat.price)}`}
      className={`${base} ${style}`}
      style={inline}
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
