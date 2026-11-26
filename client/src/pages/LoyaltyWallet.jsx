import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api";
import Icon from "../components/ui/Icon";
import PageHeader from "../components/ui/PageHeader";
import { EmptyState, ErrorState } from "../components/ui/Feedback";
import { useToast } from "../components/ui/Toast";
import { formatPrice } from "../lib/format";

const PLANNED_PERKS = [
  { icon: "popcorn", title: "Free popcorn", text: "Turn points into snacks at any theatre." },
  { icon: "ticket", title: "Ticket discounts", text: "Use points to take money off a booking." },
  { icon: "crown", title: "Recliner upgrades", text: "Move up to the balcony recliners." },
];

/**
 * Rewards: promo codes that work today (from the server), plus the planned
 * points programme, which isn't live yet and is labelled as such.
 */
export default function LoyaltyWallet() {
  const toast = useToast();
  const [offers, setOffers] = useState([]);
  const [status, setStatus] = useState("loading");

  const load = useCallback(() => {
    setStatus("loading");
    API.get("/api/coupons/active")
      .then((res) => {
        setOffers(Array.isArray(res.data) ? res.data : []);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const copy = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Copied ${code}. Apply it at checkout.`);
    } catch (e) {
      toast.info(`Your code is ${code}. Enter it at checkout.`);
    }
  };

  return (
    <main id="main" className="container-page page page-enter space-y-10">
      <PageHeader
        eyebrow="Rewards"
        title="Offers & rewards"
        subtitle="Promo codes you can use at checkout today, and what's coming next."
        icon="crown"
      />

      <section aria-labelledby="offers-title" className="space-y-4">
        <h2 id="offers-title" className="font-semibold text-white">Promo codes</h2>
        {status === "loading" ? (
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-36 rounded-2xl" />)}
          </div>
        ) : status === "error" ? (
          <ErrorState title="We couldn't load offers" onRetry={load} />
        ) : offers.length === 0 ? (
          <EmptyState icon="tag" title="No offers right now" message="Check back soon." />
        ) : (
          <ul className="grid gap-4 md:grid-cols-3">
            {offers.map((o) => (
              <li key={o.code} className="card flex flex-col p-5">
                <span className="badge-brand w-fit">
                  {o.discountType === "PERCENTAGE" ? `${o.discountValue}% off` : `${formatPrice(o.discountValue)} off`}
                </span>
                <p className="mt-3 text-sm text-gray-300">{o.description}</p>
                {o.minBookingAmount > 0 && (
                  <p className="mt-1 text-xs text-gray-500">On orders of {formatPrice(o.minBookingAmount)} or more</p>
                )}
                <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                  <code className="rounded-lg border border-dashed border-white/20 px-3 py-1.5 font-mono text-sm font-bold tracking-wider text-white">
                    {o.code}
                  </code>
                  <button onClick={() => copy(o.code)} className="btn-secondary btn-sm" aria-label={`Copy code ${o.code}`}>
                    Copy
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-gray-500">Codes are checked and applied by our server at checkout.</p>
      </section>

      <section aria-labelledby="points-title" className="card overflow-hidden">
        <div className="bg-brand-gradient-soft px-5 py-6 sm:px-8">
          <span className="badge-accent">Coming soon</span>
          <h2 id="points-title" className="mt-3 font-display text-2xl font-bold text-white">CinePoints</h2>
          <p className="mt-1 max-w-xl text-sm text-gray-300">
            We're building a points programme: earn points on bookings and spend them on perks. It isn't live yet, so no
            points are being collected or shown.
          </p>
        </div>
        <ul className="grid gap-px bg-fill-strong sm:grid-cols-3">
          {PLANNED_PERKS.map((p) => (
            <li key={p.title} className="flex gap-3 bg-ink-850 p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/15 text-accent-300">
                <Icon name={p.icon} className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-semibold text-white">{p.title}</span>
                <span className="text-sm text-gray-400">{p.text}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="border-t border-line-subtle px-5 py-4 sm:px-8">
          <Link to="/movies" className="btn-primary btn-sm">Book a movie</Link>
        </div>
      </section>
    </main>
  );
}
