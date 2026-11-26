import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import API from "../api";
import Icon from "../components/ui/Icon";
import Poster from "../components/Poster";
import { ErrorState, Spinner } from "../components/ui/Feedback";
import { useToast } from "../components/ui/Toast";
import { amountLabel, formatPrice, formatShowDate, formatShowTime, getErrorMessage } from "../lib/format";
import { seatStorageKey } from "./Seats";
import { inBookingFlow, releaseHoldNow } from "../lib/useSeatHold";

// Combo names and prices come from the server (GET /api/snacks/combos).

const readSavedSeats = (showId) => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(seatStorageKey(showId)) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch (e) {
    return [];
  }
};

function AddOns() {
  const { showId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  // Seats come from the seat page; sessionStorage keeps them across a refresh.
  const [selectedSeats] = useState(() =>
    location.state?.selectedSeats?.length ? location.state.selectedSeats : readSavedSeats(showId)
  );

  const [show, setShow] = useState(location.state?.show || null);
  const [movie, setMovie] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [snacks, setSnacks] = useState([]);
  const [combos, setCombos] = useState([]);
  const [parking, setParking] = useState(null);
  const [cart, setCart] = useState([]); // [{ key, name, price, qty }]
  const [selectedParking, setSelectedParking] = useState(null);

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponMsg, setCouponMsg] = useState({ text: "", type: "" });
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [activeCoupons, setActiveCoupons] = useState([]);

  const [phase, setPhase] = useState("review"); // review | paying | success | conflict
  const [payError, setPayError] = useState("");
  const [booking, setBooking] = useState(null);
  const [conflictSeats, setConflictSeats] = useState([]);

  /* Seat hold: the server keeps these seats for this user for a few minutes. */
  const [holdExpiresAt, setHoldExpiresAt] = useState(location.state?.holdExpiresAt || null);
  const [holdBusy, setHoldBusy] = useState(false);
  const now = useNow(1000);
  const holdLeftMs = holdExpiresAt ? new Date(holdExpiresAt).getTime() - now : null;

  // (Re)places the hold. Also runs on load, so a refresh or a direct link
  // re-checks that the seats are still free and restarts the timer.
  const ensureHold = useCallback(async () => {
    if (!showId || selectedSeats.length === 0) return;
    setHoldBusy(true);
    try {
      const { data } = await API.post(`/api/shows/${showId}/holds`, { seats: selectedSeats });
      setHoldExpiresAt(data.expiresAt);
    } catch (err) {
      if (err.response?.status === 409) {
        setConflictSeats(Array.isArray(err.response.data?.seats) ? err.response.data.seats : []);
        sessionStorage.removeItem(seatStorageKey(showId));
        setPhase("conflict");
      }
    } finally {
      setHoldBusy(false);
    }
  }, [showId, selectedSeats]);

  useEffect(() => {
    ensureHold();
  }, [ensureHold]);

  // Leaving checkout for anywhere except this show's seat page (or closing the
  // tab) releases the hold. After a booking the seats are booked, so this is a no-op.
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

  /* Load show, movie, add-ons and coupons */
  useEffect(() => {
    if (!showId || selectedSeats.length === 0) return;
    let cancelled = false;

    const load = async () => {
      try {
        const res = await API.get(`/api/shows/single/${showId}`, { params: { expand: "movie" } });
        if (cancelled) return;
        const current = res.data;
        if (!current) throw new Error("Show not found");
        setShow(current);

        if (current.movieId && typeof current.movieId === "object") setMovie(current.movieId);
        else if (current.movieId)
          API.get(`/api/movies/${current.movieId}`)
            .then((r) => !cancelled && setMovie(r.data))
            .catch(() => {});

        const theatre = encodeURIComponent(current.theatre);
        API.get(`/api/snacks/theatre/${theatre}`)
          .then((r) => !cancelled && setSnacks(Array.isArray(r.data) ? r.data : []))
          .catch(() => {});
        API.get("/api/snacks/combos")
          .then((r) => !cancelled && setCombos(Array.isArray(r.data) ? r.data : []))
          .catch(() => {});
        API.get(`/api/parking/theatre/${theatre}`)
          .then((r) => !cancelled && setParking(r.data || null))
          .catch(() => {});
      } catch (err) {
        if (!cancelled) setLoadError(true);
      }
    };

    load();
    API.get(`/api/coupons/active`)
      .then((r) => !cancelled && setActiveCoupons(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [showId, selectedSeats.length]);

  /* Totals */
  const seatObjects = useMemo(
    () => (show?.seats || []).filter((s) => selectedSeats.includes(s.seatNumber)),
    [show, selectedSeats]
  );
  const seatTotal = seatObjects.reduce((sum, s) => sum + s.price, 0);
  const snackTotal = cart.reduce((sum, s) => sum + s.price * s.qty, 0);
  const parkingTotal = selectedParking?.price || 0;
  const subtotal = seatTotal + snackTotal + parkingTotal;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  /* Cart helpers */
  const qtyOf = (key) => cart.find((i) => i.key === key)?.qty || 0;
  const changeQty = (item, delta) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.key === item.key);
      if (!existing) return delta > 0 ? [...prev, { ...item, qty: 1 }] : prev;
      return prev
        .map((i) => (i.key === item.key ? { ...i, qty: Math.min(10, i.qty + delta) } : i))
        .filter((i) => i.qty > 0);
    });
  };

  /* Coupons */
  const validateCoupon = async (code, amount, { silent = false } = {}) => {
    try {
      const res = await API.post(`/api/coupons/validate`, { code, totalAmount: amount });
      if (res.data.success) {
        setAppliedCoupon(res.data.code);
        setCouponCode(res.data.code);
        setDiscountAmount(res.data.discountAmount);
        if (!silent) setCouponMsg({ text: `${res.data.code} applied — you save ${formatPrice(res.data.discountAmount)}.`, type: "success" });
      }
    } catch (err) {
      setAppliedCoupon(null);
      setDiscountAmount(0);
      setCouponMsg({ text: getErrorMessage(err, "That promo code isn't valid."), type: "error" });
    }
  };

  const handleApplyCoupon = async (codeToApply) => {
    const code = (codeToApply || couponCode).trim();
    if (!code) {
      setCouponMsg({ text: "Enter a promo code first.", type: "error" });
      return;
    }
    setApplyingCoupon(true);
    await validateCoupon(code, subtotal);
    setApplyingCoupon(false);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponCode("");
    setCouponMsg({ text: "", type: "" });
  };

  // Re-check the applied coupon whenever the order amount changes.
  const lastValidated = useRef(null);
  useEffect(() => {
    if (!appliedCoupon) {
      lastValidated.current = null;
      return;
    }
    if (lastValidated.current === null) {
      lastValidated.current = subtotal;
      return;
    }
    if (lastValidated.current !== subtotal) {
      lastValidated.current = subtotal;
      validateCoupon(appliedCoupon, subtotal, { silent: true });
    }
  }, [appliedCoupon, subtotal]);

  /* Payment */
  const confirmBooking = async () => {
    setPayError("");
    setPhase("paying");
    try {
      const res = await API.post(`/api/bookings`, {
        showId,
        seats: selectedSeats,
        // Only IDs and quantities are sent: the server looks up every price itself.
        snacks: cart.map(({ key, name, qty }) => ({ snackId: key, name, qty })),
        parking: selectedParking ? { type: selectedParking.type } : null,
        couponCode: appliedCoupon || undefined,
      });
      sessionStorage.removeItem(seatStorageKey(showId));
      setBooking(res.data);
      setPhase("success");
      window.scrollTo(0, 0);
    } catch (err) {
      const data = err.response?.data;
      const seatsTaken = err.response?.status === 409 || /already booked/i.test(data?.message || "");
      if (seatsTaken) {
        setConflictSeats(Array.isArray(data?.seats) ? data.seats : []);
        sessionStorage.removeItem(seatStorageKey(showId));
        setPhase("conflict");
      } else {
        setPayError(getErrorMessage(err, "We couldn't confirm your booking. You haven't been charged. Please try again."));
        setPhase("review");
      }
    }
  };

  if (!showId || selectedSeats.length === 0) {
    return <Navigate to={showId ? `/seats/${showId}` : "/"} replace />;
  }

  if (loadError && !show) {
    return (
      <main id="main" className="container-page min-h-[70vh] py-16">
        <ErrorState title="We couldn't load your booking" onRetry={() => window.location.reload()} />
      </main>
    );
  }

  if (!show) {
    return (
      <main id="main" className="container-page min-h-[80vh] py-10" role="status" aria-label="Loading checkout">
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <div className="skeleton h-40 rounded-2xl" />
            <div className="skeleton h-56 rounded-2xl" />
          </div>
          <div className="skeleton h-96 rounded-2xl" />
        </div>
      </main>
    );
  }

  const showLine = `${formatShowDate(show.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })} · ${formatShowTime(show.time)}`;

  /* ───────────── Success ───────────── */
  if (phase === "success" && booking) {
    return (
      <main id="main" className="container-page flex min-h-[80vh] items-center justify-center py-12">
        <div className="card w-full max-w-lg overflow-hidden animate-fadeUp">
          <div className="bg-success-500/10 px-6 py-8 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-500 text-white">
              <Icon name="check" className="h-7 w-7" />
            </span>
            <h1 className="mt-4 font-display text-2xl font-bold text-white">Booking confirmed</h1>
            <p className="mt-1 text-sm text-gray-300">Your seats are reserved. Show this QR code at the entrance.</p>
          </div>

          <div className="flex flex-col items-center gap-6 px-6 py-6 sm:flex-row sm:items-start">
            <div className="shrink-0 rounded-xl bg-white p-3">
              <QRCodeCanvas value={`${window.location.origin}/verify/${booking._id}`} size={132} />
            </div>
            <dl className="w-full space-y-3 text-sm">
              <SummaryRow label="Movie" value={movie?.title || booking.showId?.movieId?.title || "—"} />
              <SummaryRow label="Theatre" value={show.theatre} />
              <SummaryRow label="Showtime" value={showLine} />
              <SummaryRow label="Seats" value={(booking.seats || selectedSeats).join(", ")} />
              <SummaryRow label={amountLabel(booking)} value={formatPrice(booking.totalPrice)} strong />
              <div>
                <dt className="text-xs text-gray-500">Booking ID</dt>
                <dd className="mt-0.5 break-all font-mono text-xs text-gray-300">{booking._id}</dd>
              </div>
            </dl>
          </div>

          <div className="grid gap-2 border-t border-line p-4 sm:grid-cols-2">
            <Link to="/my-bookings" className="btn-primary">
              <Icon name="ticket" className="h-4 w-4" /> View my tickets
            </Link>
            <Link to="/movies" className="btn-secondary">Book another movie</Link>
          </div>
        </div>
      </main>
    );
  }

  /* ───────────── Seats taken ───────────── */
  if (phase === "conflict") {
    return (
      <main id="main" className="container-page flex min-h-[70vh] items-center justify-center py-12">
        <div className="card w-full max-w-md p-8 text-center animate-fadeUp">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold-500/15 text-gold-400">
            <Icon name="alert" className="h-7 w-7" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold text-white">Those seats were just taken</h1>
          <p className="mt-2 text-sm text-gray-400">
            {conflictSeats.length > 0
              ? `Someone else booked or reserved ${conflictSeats.join(", ")} while you were checking out. `
              : "Someone else booked or reserved one or more of your seats while you were checking out. "}
            You haven't been charged.
          </p>
          <button className="btn-primary mt-6 w-full" onClick={() => navigate(`/seats/${showId}`, { replace: true })}>
            Choose different seats
          </button>
        </div>
      </main>
    );
  }

  const paying = phase === "paying";

  return (
    <main id="main" className="min-h-screen pb-16">
      <div className="border-b border-line bg-ink-900">
        <div className="container-page flex items-center gap-3 py-4">
          <button onClick={() => navigate(`/seats/${showId}`)} className="btn-icon" aria-label="Back to seat selection" disabled={paying}>
            <Icon name="arrowLeft" className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-display text-lg font-bold text-white sm:text-xl">Extras &amp; checkout</h1>
            <p className="text-xs text-gray-400 sm:text-sm">Add snacks or parking, then confirm your booking.</p>
          </div>
        </div>
      </div>

      <div className="container-page mt-6">
        <ol className="mb-6 flex items-center gap-2 text-xs font-semibold text-gray-500" aria-label="Booking progress">
          <li className="flex items-center gap-2 text-gray-300">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success-500/20 text-success-300">
              <Icon name="check" className="h-3.5 w-3.5" />
            </span>
            Seats
          </li>
          <li aria-hidden="true" className="h-px w-8 bg-white/15" />
          <li className="flex items-center gap-2 text-white">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-solid text-2xs text-on-brand">2</span> Extras &amp; checkout
          </li>
          <li aria-hidden="true" className="h-px w-8 bg-white/15" />
          <li className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-fill-emphasis text-2xs">3</span> Ticket
          </li>
        </ol>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* ───────────── Extras ───────────── */}
          <div className="space-y-6">
            {combos.length > 0 && (
            <section className="card p-5 sm:p-6" aria-labelledby="combos-title">
              <SectionHeading id="combos-title" icon="popcorn" title="Combos" hint="Bundle and save" />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {combos.map((combo) => {
                  const item = { key: combo.id, name: combo.name, price: combo.comboPrice };
                  return (
                    <div key={combo.id} className="card-muted flex flex-col p-4">
                      <span className="badge-gold mb-2 self-start">{combo.badge}</span>
                      <h3 className="font-sans text-sm font-semibold text-white">{combo.name}</h3>
                      <p className="mt-0.5 flex-1 text-xs text-gray-400">{combo.description}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-sm">
                          <span className="font-bold text-white">{formatPrice(combo.comboPrice)}</span>
                          <span className="ml-1.5 text-xs text-gray-500 line-through">{formatPrice(combo.originalPrice)}</span>
                        </p>
                        <Stepper qty={qtyOf(item.key)} label={combo.name} onChange={(d) => changeQty(item, d)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
            )}

            <section className="card p-5 sm:p-6" aria-labelledby="snacks-title">
              <SectionHeading id="snacks-title" icon="popcorn" title="Food & drinks" hint={`Available at ${show.theatre}`} />
              {snacks.length === 0 ? (
                <p className="mt-4 text-sm text-gray-400">No individual items are listed for this theatre yet.</p>
              ) : (
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {snacks.map((snack) => {
                    const item = { key: snack._id, name: snack.name?.trim(), price: snack.price };
                    return (
                      <li key={snack._id} className="card-muted flex items-center justify-between gap-3 p-3.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{item.name}</p>
                          <p className="text-xs text-gray-400">{formatPrice(snack.price)}</p>
                        </div>
                        <Stepper qty={qtyOf(item.key)} label={item.name} onChange={(d) => changeQty(item, d)} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {parking && (
              <section className="card p-5 sm:p-6" aria-labelledby="parking-title">
                <SectionHeading id="parking-title" icon="car" title="Parking" hint="Optional — reserve a spot at the theatre" />
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    { type: "Bike", price: parking.priceBike },
                    { type: "Car", price: parking.priceCar },
                  ].map((option) => {
                    const active = selectedParking?.type === option.type;
                    return (
                      <button
                        key={option.type}
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          setSelectedParking(active ? null : { type: option.type, price: option.price, theatre: show.theatre })
                        }
                        className={`flex items-center justify-between rounded-xl border px-4 py-3.5 text-left transition ${
                          active ? "border-brand-500 bg-brand-500/10" : "border-line bg-ink-900 hover:border-white/20"
                        }`}
                      >
                        <span>
                          <span className="block text-sm font-semibold text-white">{option.type} parking</span>
                          <span className="block text-xs text-gray-400">{formatPrice(option.price)}</span>
                        </span>
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                            active ? "border-brand-solid bg-brand-solid text-on-brand" : "border-white/25"
                          }`}
                        >
                          {active && <Icon name="check" className="h-3 w-3" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="card p-5 sm:p-6" aria-labelledby="promo-title">
              <SectionHeading id="promo-title" icon="tag" title="Promo code" />
              <form
                className="mt-4 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!appliedCoupon) handleApplyCoupon();
                }}
              >
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  aria-label="Promo code"
                  disabled={!!appliedCoupon}
                  className="input flex-1 font-mono uppercase disabled:opacity-60"
                />
                {appliedCoupon ? (
                  <button type="button" onClick={handleRemoveCoupon} className="btn-secondary">Remove</button>
                ) : (
                  <button type="submit" className="btn-secondary" disabled={applyingCoupon}>
                    {applyingCoupon ? <Spinner className="h-4 w-4" /> : "Apply"}
                  </button>
                )}
              </form>

              {couponMsg.text && (
                <p role="status" className={`mt-2 text-xs font-medium ${couponMsg.type === "success" ? "text-success-300" : "text-brand-300"}`}>
                  {couponMsg.text}
                </p>
              )}

              {activeCoupons.length > 0 && !appliedCoupon && (
                <ul className="mt-4 space-y-2">
                  {activeCoupons.map((c) => (
                    <li key={c.code} className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-line-strong px-3.5 py-2.5">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-bold text-white">{c.code}</p>
                        {c.description && <p className="truncate text-xs text-gray-400">{c.description}</p>}
                      </div>
                      <button
                        type="button"
                        className="shrink-0 text-xs font-bold text-brand-400 hover:text-brand-300"
                        onClick={() => handleApplyCoupon(c.code)}
                      >
                        APPLY
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* ───────────── Order summary ───────────── */}
          <aside>
            <div className="card sticky top-24 overflow-hidden">
              <div className="flex gap-4 border-b border-line p-5">
                <Poster src={movie?.poster} alt="" className="h-24 w-16 shrink-0 rounded-lg" />
                <div className="min-w-0">
                  <h2 className="truncate text-base font-bold text-white">{movie?.title || "Your booking"}</h2>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
                    <Icon name="pin" className="h-3.5 w-3.5 shrink-0" /> {show.theatre}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
                    <Icon name="calendar" className="h-3.5 w-3.5 shrink-0" /> {showLine}
                  </p>
                  <p className="mt-1 flex items-start gap-1.5 text-xs text-gray-300">
                    <Icon name="ticket" className="mt-px h-3.5 w-3.5 shrink-0 text-gray-400" />
                    <span>{selectedSeats.join(", ")}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 p-5 text-sm">
                <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-500">Price details</h3>
                <PriceRow
                  label={`Tickets × ${selectedSeats.length}`}
                  value={formatPrice(seatTotal)}
                />
                {cart.map((item) => (
                  <PriceRow key={item.key} label={`${item.name} × ${item.qty}`} value={formatPrice(item.price * item.qty)} muted />
                ))}
                {selectedParking && (
                  <PriceRow label={`${selectedParking.type} parking`} value={formatPrice(selectedParking.price)} muted />
                )}
                {discountAmount > 0 && (
                  <PriceRow label={`Promo ${appliedCoupon}`} value={`− ${formatPrice(discountAmount)}`} accent />
                )}
                <PriceRow label="Convenience fee" value="Free" muted />

                <div className="flex items-end justify-between border-t border-line pt-4">
                  <div>
                    <p className="font-semibold text-white">Total</p>
                    <p className="text-2xs text-gray-500">Inclusive of all taxes</p>
                  </div>
                  <p className="font-display text-2xl font-bold text-white" aria-live="polite">{formatPrice(finalTotal)}</p>
                </div>
              </div>

              <div className="border-t border-line p-5">
                <HoldTimer leftMs={holdLeftMs} busy={holdBusy} onRenew={ensureHold} />
                {payError && (
                  <div role="alert" className="alert-error mb-3 text-xs">
                    <Icon name="alert" className="mt-px h-4 w-4 shrink-0" />
                    <span>{payError}</span>
                  </div>
                )}
                <button onClick={confirmBooking} disabled={paying} className="btn-primary btn-lg w-full">
                  {paying ? (
                    <><Spinner className="h-5 w-5" /> Confirming your seats…</>
                  ) : (
                    <>Confirm demo booking · {formatPrice(finalTotal)}</>
                  )}
                </button>
                <p className="mt-3 text-center text-2xs leading-relaxed text-gray-500">
                  Demo checkout: no payment is taken and no card details are needed. The final price is calculated by our server.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function SectionHeading({ id, icon, title, hint }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-fill-strong text-gray-300">
        <Icon name={icon} className="h-[18px] w-[18px]" />
      </span>
      <div>
        <h2 id={id} className="font-sans text-base font-bold text-white">{title}</h2>
        {hint && <p className="text-xs text-gray-400">{hint}</p>}
      </div>
    </div>
  );
}

function Stepper({ qty, onChange, label }) {
  if (qty === 0) {
    return (
      <button type="button" className="btn-secondary btn-sm shrink-0" onClick={() => onChange(1)} aria-label={`Add ${label}`}>
        <Icon name="plus" className="h-3.5 w-3.5" /> Add
      </button>
    );
  }
  return (
    <div className="flex shrink-0 items-center rounded-lg border border-brand-500/50 bg-brand-500/10">
      <button type="button" className="flex h-8 w-8 items-center justify-center text-brand-300 hover:text-white" onClick={() => onChange(-1)} aria-label={`Remove one ${label}`}>
        <Icon name="minus" className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-[1.25rem] text-center text-sm font-bold text-white" aria-live="polite">{qty}</span>
      <button type="button" className="flex h-8 w-8 items-center justify-center text-brand-300 hover:text-white" onClick={() => onChange(1)} aria-label={`Add one more ${label}`}>
        <Icon name="plus" className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function PriceRow({ label, value, muted, accent }) {
  return (
    <div className={`flex items-start justify-between gap-4 ${accent ? "text-success-300" : muted ? "text-gray-400" : "text-gray-200"}`}>
      <span className="min-w-0 break-words">{label}</span>
      <span className="shrink-0 font-medium">{value}</span>
    </div>
  );
}

function SummaryRow({ label, value, strong }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className={`mt-0.5 ${strong ? "font-display text-lg font-bold text-white" : "text-sm font-medium text-white"}`}>{value}</dd>
    </div>
  );
}


// Re-renders every `interval` ms so countdowns stay current.
function useNow(interval) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
}

function HoldTimer({ leftMs, busy, onRenew }) {
  if (leftMs === null) return null;
  if (leftMs <= 0) {
    return (
      <div role="alert" className="mb-3 rounded-xl border border-gold-500/40 bg-gold-500/10 p-3 text-xs text-gold-400">
        <p className="font-semibold">Your seat hold has expired.</p>
        <p className="mt-0.5 text-gray-300">Others can now pick these seats. Hold them again to keep going.</p>
        <button type="button" onClick={onRenew} disabled={busy} className="btn-ghost mt-2 w-full text-xs">
          {busy ? "Checking seats…" : "Hold my seats again"}
        </button>
      </div>
    );
  }
  const total = Math.ceil(leftMs / 1000);
  const label = `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
  return (
    <p className={`mb-3 flex items-center justify-center gap-2 text-xs ${total <= 60 ? "text-gold-400" : "text-gray-400"}`} aria-live="off">
      <Icon name="clock" className="h-4 w-4" />
      Seats held for you for <span className="font-mono font-semibold text-white" data-testid="hold-timer">{label}</span>
    </p>
  );
}

export default AddOns;
