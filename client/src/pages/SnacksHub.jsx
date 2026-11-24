import React, { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import API from "../api";
import Icon from "../components/ui/Icon";
import Modal from "../components/ui/Modal";
import PageHeader from "../components/ui/PageHeader";
import Field from "../components/ui/Field";
import { EmptyState, ErrorState, Spinner } from "../components/ui/Feedback";
import { useToast } from "../components/ui/Toast";
import { getSession } from "../lib/session";
import { formatPrice, getErrorMessage } from "../lib/format";

const CATEGORIES = ["All", "Popcorn & Combos", "Beverages", "Hot Bites", "Sweets & Extras"];

const categoryOf = (name) => {
  const n = name.toLowerCase();
  if (n.includes("popcorn") || n.includes("combo")) return "Popcorn & Combos";
  if (/(coke|pepsi|cola|drink|soda|water|juice|coffee|tea|brew)/.test(n)) return "Beverages";
  if (/(nacho|burger|fries|hotdog|hot dog|pizza|sandwich|samosa)/.test(n)) return "Hot Bites";
  return "Sweets & Extras";
};

const SEAT_RE = /^[A-Z]{1,2}\d{1,3}$/i;

export default function SnacksHub() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { isLoggedIn, userId } = getSession();

  const [theatres, setTheatres] = useState([]);
  const [moviesByTheatre, setMoviesByTheatre] = useState({});
  const [metaStatus, setMetaStatus] = useState("loading");
  const [selectedTheatre, setSelectedTheatre] = useState("");
  const [selectedMovie, setSelectedMovie] = useState("");

  const [userBookings, setUserBookings] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState("");

  const [snacks, setSnacks] = useState([]);
  const [menuStatus, setMenuStatus] = useState("idle");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [cart, setCart] = useState([]);

  const [deliveryType, setDeliveryType] = useState("Express Counter Pickup");
  const [seatNumber, setSeatNumber] = useState("");
  const [seatError, setSeatError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);

  const loadMeta = useCallback(() => {
    setMetaStatus("loading");
    API.get("/api/snack-orders/meta/theatres-movies")
      .then((res) => {
        const list = res.data?.theatres || [];
        setTheatres(list);
        setMoviesByTheatre(res.data?.moviesByTheatre || {});
        setSelectedTheatre((current) => current || list[0] || "");
        setMetaStatus("ready");
      })
      .catch(() => setMetaStatus("error"));
  }, []);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    if (!isLoggedIn || !userId) return;
    API.get(`/api/bookings/user/${userId}`)
      .then((res) => setUserBookings(Array.isArray(res.data) ? res.data.filter((b) => !b.used) : []))
      .catch(() => {});
  }, [isLoggedIn, userId]);

  const loadMenu = useCallback(() => {
    if (!selectedTheatre) return;
    setMenuStatus("loading");
    API.get(`/api/snacks/theatre/${encodeURIComponent(selectedTheatre)}`)
      .then((res) => {
        setSnacks(Array.isArray(res.data) ? res.data : []);
        setMenuStatus("ready");
      })
      .catch(() => setMenuStatus("error"));
  }, [selectedTheatre]);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  const chooseTheatre = (t) => {
    if (t === selectedTheatre) return;
    if (cart.length) toast.info("Your cart was cleared because menus differ between theatres.");
    setCart([]);
    setSelectedTheatre(t);
    setSelectedMovie("");
    setSelectedBookingId("");
  };

  const handleBookingSelect = (e) => {
    const id = e.target.value;
    setSelectedBookingId(id);
    const found = userBookings.find((b) => b._id === id);
    if (!found) return;
    if (found.showId?.theatre && found.showId.theatre !== selectedTheatre) {
      setCart([]);
      setSelectedTheatre(found.showId.theatre);
    }
    if (found.showId?.movieId?.title) setSelectedMovie(found.showId.movieId.title);
    if (found.seats?.length) {
      // Food is delivered to one seat: default to the first seat of the booking.
      setSeatNumber(found.seats[0]);
      setDeliveryType("In-Seat Delivery");
    }
  };

  const changeQty = (snack, delta) => {
    setCart((prev) => {
      const existing = prev.find((i) => i._id === snack._id);
      if (!existing) return delta > 0 ? [...prev, { ...snack, qty: 1 }] : prev;
      return prev
        .map((i) => (i._id === snack._id ? { ...i, qty: Math.min(20, i.qty + delta) } : i))
        .filter((i) => i.qty > 0);
    });
  };
  const qtyOf = (id) => cart.find((i) => i._id === id)?.qty || 0;
  const itemCount = cart.reduce((n, i) => n + i.qty, 0);
  const total = cart.reduce((n, i) => n + i.price * i.qty, 0);

  const handleCheckout = async () => {
    if (!isLoggedIn) {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }
    if (deliveryType === "In-Seat Delivery" && !SEAT_RE.test(seatNumber.trim())) {
      setSeatError("Enter one seat number, e.g. F6.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await API.post("/api/snack-orders", {
        theatre: selectedTheatre,
        movieTitle: selectedMovie || "General Theater Order",
        bookingId: selectedBookingId || null,
        // Prices are looked up on the server; only IDs and quantities are sent.
        items: cart.map((i) => ({ snackId: i._id, name: i.name, qty: i.qty })),
        deliveryType,
        seatNumber: deliveryType === "In-Seat Delivery" ? seatNumber.trim().toUpperCase() : "",
      });
      setCompletedOrder(res.data.order);
      setCart([]);
    } catch (err) {
      toast.error(getErrorMessage(err, "We couldn't place your order."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = snacks.filter((s) => categoryFilter === "All" || categoryOf(s.name) === categoryFilter);

  return (
    <main id="main" className={`container-page py-8 sm:py-10 ${cart.length ? "pb-48 sm:pb-36" : ""}`}>
      <PageHeader
        eyebrow="Food & Drinks"
        title="Order snacks for your show"
        subtitle="Pick up at the express counter or have it brought to your seat."
        icon="popcorn"
      />

      {metaStatus === "error" ? (
        <div className="mt-8"><ErrorState title="We couldn't load theatres" onRetry={loadMeta} /></div>
      ) : metaStatus === "loading" ? (
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : theatres.length === 0 ? (
        <div className="mt-8"><EmptyState icon="popcorn" title="No theatres yet" message="Snack ordering opens once theatres are set up." /></div>
      ) : (
        <>
          <div className="card mt-8 grid gap-4 p-4 sm:p-5 md:grid-cols-3">
            <Field id="f-theatre" label="Theatre">
              <select id="f-theatre" className="input" value={selectedTheatre} onChange={(e) => chooseTheatre(e.target.value)}>
                {theatres.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field id="f-movie" label="Movie (optional)">
              <select id="f-movie" className="input" value={selectedMovie} onChange={(e) => setSelectedMovie(e.target.value)}>
                <option value="">Any movie</option>
                {(moviesByTheatre[selectedTheatre] || []).map((m) => <option key={m._id} value={m.title}>{m.title}</option>)}
              </select>
            </Field>
            <Field id="f-booking" label="Attach to my ticket (optional)" hint={!isLoggedIn ? "Sign in to attach an order to your ticket" : undefined}>
              <select id="f-booking" className="input" value={selectedBookingId} onChange={handleBookingSelect} disabled={!isLoggedIn || userBookings.length === 0}>
                <option value="">{userBookings.length ? "Don't attach" : "No upcoming tickets"}</option>
                {userBookings.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.showId?.movieId?.title || "Movie"} · {b.showId?.theatre} · {b.seats?.join(", ")}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="scroll-row mt-6 -mx-4 px-4 sm:mx-0 sm:px-0" role="group" aria-label="Filter by category">
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCategoryFilter(c)} aria-pressed={categoryFilter === c} className={`chip ${categoryFilter === c ? "chip-active" : ""}`}>
                {c}
              </button>
            ))}
          </div>

          <section className="mt-6" aria-label={`${selectedTheatre} menu`}>
            {menuStatus === "loading" ? (
              <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-36 rounded-2xl" />)}
              </div>
            ) : menuStatus === "error" ? (
              <ErrorState title="We couldn't load the menu" onRetry={loadMenu} />
            ) : filtered.length === 0 ? (
              <EmptyState icon="popcorn" title="Nothing here yet" message={`No ${categoryFilter === "All" ? "items" : categoryFilter.toLowerCase()} on the ${selectedTheatre} menu.`} />
            ) : (
              <ul className="grid grid-cols-1 gap-4 xs:grid-cols-2 lg:grid-cols-4">
                {filtered.map((snack) => {
                  const qty = qtyOf(snack._id);
                  return (
                    <li key={snack._id} className={`card flex flex-col p-4 transition ${qty ? "ring-1 ring-brand-500/60" : ""}`}>
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gradient-soft text-brand-300 shadow-inner-line">
                        <Icon name="popcorn" className="h-5 w-5" />
                      </span>
                      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{categoryOf(snack.name)}</p>
                      <h3 className="mt-0.5 font-semibold text-white">{snack.name}</h3>
                      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                        <span className="font-display text-lg font-bold text-white">{formatPrice(snack.price)}</span>
                        {qty > 0 ? (
                          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1">
                            <button onClick={() => changeQty(snack, -1)} className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-300 hover:bg-white/10" aria-label={`Remove one ${snack.name}`}>
                              <Icon name="minus" className="h-4 w-4" />
                            </button>
                            <span className="w-6 text-center text-sm font-bold text-white" aria-live="polite">{qty}</span>
                            <button onClick={() => changeQty(snack, 1)} className="flex h-7 w-7 items-center justify-center rounded-lg text-brand-300 hover:bg-white/10" aria-label={`Add one more ${snack.name}`}>
                              <Icon name="plus" className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => changeQty(snack, 1)} className="btn-secondary btn-sm" aria-label={`Add ${snack.name}`}>
                            <Icon name="plus" className="h-4 w-4" /> Add
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}

      {/* Cart bar */}
      {cart.length > 0 && (
        <div className="glass fixed inset-x-0 bottom-0 z-30 border-x-0 border-b-0 shadow-card">
          <div className="container-page flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-semibold text-white">
                {itemCount} {itemCount === 1 ? "item" : "items"} · {formatPrice(total)}
              </p>
              <p className="truncate text-xs text-gray-400">{cart.map((i) => `${i.name} × ${i.qty}`).join(", ")}</p>
            </div>
            <div className="flex flex-wrap items-start gap-2">
              <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1 text-xs" role="group" aria-label="Delivery">
                {[["Express Counter Pickup", "Counter pickup"], ["In-Seat Delivery", "To my seat"]].map(([value, label]) => (
                  <button key={value} onClick={() => setDeliveryType(value)} aria-pressed={deliveryType === value} className={`rounded-lg px-3 py-1.5 font-semibold transition ${deliveryType === value ? "bg-brand-gradient text-white" : "text-gray-400 hover:text-white"}`}>
                    {label}
                  </button>
                ))}
              </div>
              {deliveryType === "In-Seat Delivery" && (
                <div>
                  <label htmlFor="seat-no" className="sr-only">Seat number</label>
                  <input
                    id="seat-no"
                    className={`input w-28 py-2 text-xs ${seatError ? "input-error" : ""}`}
                    placeholder="Seat, e.g. F6"
                    value={seatNumber}
                    onChange={(e) => {
                      setSeatNumber(e.target.value);
                      setSeatError("");
                    }}
                    aria-invalid={!!seatError}
                    aria-describedby={seatError ? "seat-no-error" : undefined}
                  />
                  {seatError && <p id="seat-no-error" className="field-error">{seatError}</p>}
                </div>
              )}
              <button onClick={handleCheckout} disabled={isSubmitting} className="btn-primary">
                {isSubmitting ? <><Spinner className="h-4 w-4" /> Placing order…</> : isLoggedIn ? "Place order" : "Sign in to order"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={!!completedOrder} onClose={() => setCompletedOrder(null)} title="Order placed" size="sm">
        {completedOrder && (
          <div className="space-y-4 p-5 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
              <Icon name="check" className="h-7 w-7" />
            </span>
            <div>
              <p className="text-sm text-gray-400">Your order pass</p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-wider text-white">{completedOrder.orderPassId}</p>
              <p className="mt-1 text-xs text-gray-500">Show this code at the counter.</p>
            </div>
            <dl className="card-muted space-y-2 p-4 text-left text-sm">
              <div className="flex justify-between gap-3"><dt className="text-gray-400">Theatre</dt><dd className="text-white">{completedOrder.theatre}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-400">Delivery</dt><dd className="text-white">{completedOrder.deliveryType === "In-Seat Delivery" ? `To seat ${completedOrder.seatNumber}` : "Counter pickup"}</dd></div>
              <div className="flex justify-between gap-3 border-t border-white/[0.07] pt-2"><dt className="text-gray-400">Total (demo, not charged)</dt><dd className="font-semibold text-white">{formatPrice(completedOrder.totalPrice)}</dd></div>
            </dl>
            <div className="flex gap-2">
              <Link to="/my-bookings" className="btn-primary flex-1">View my orders</Link>
              <button onClick={() => setCompletedOrder(null)} className="btn-secondary">Close</button>
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}
