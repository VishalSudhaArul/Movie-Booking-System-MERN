import React from "react";
import { formatPrice } from "../lib/format";

/**
 * Reconciled figures from GET /api/analytics (server/utils/revenue.js):
 * gross → discounts → refunds → net, how much was demo checkout versus recorded
 * as paid, whether every booking's totals add up, plus seat-category
 * performance, occupancy and food sales.
 */
export default function FinancePanels({ data }) {
  const f = data.finance;
  if (!f) return null;
  const rec = f.reconciliation;
  const occ = data.occupancy;
  const food = data.food;
  const rows = [
    ["Gross sales (list prices)", f.gross],
    ["Discounts (promo codes)", -f.discounts],
    ["Refunds", -f.refunds],
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2" data-testid="finance-panels">
      <section className="card p-5" aria-labelledby="fin-title">
        <h2 id="fin-title" className="font-semibold text-white">Revenue reconciliation</h2>
        <dl className="mt-3 space-y-2 text-sm">
          {rows.map(([label, v]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="text-gray-400">{label}</dt>
              <dd className="font-mono text-gray-200">{v < 0 ? `− ${formatPrice(-v)}` : formatPrice(v)}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 border-t border-line pt-2">
            <dt className="font-semibold text-white">Net value</dt>
            <dd className="font-mono font-semibold text-white" data-testid="finance-net">{formatPrice(f.net)}</dd>
          </div>
          <div className="flex justify-between gap-3 text-xs">
            <dt className="text-gray-400">of which recorded as paid</dt>
            <dd className="font-mono text-gray-300">{formatPrice(f.collected)}</dd>
          </div>
          <div className="flex justify-between gap-3 text-xs">
            <dt className="text-gray-400">of which demo checkout (nothing charged)</dt>
            <dd className="font-mono text-gray-300">{formatPrice(f.demo)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-2xs text-gray-500">
          Net split: tickets {formatPrice(f.breakdown.tickets)} · food {formatPrice(f.breakdown.food)} · parking {formatPrice(f.breakdown.parking)} (discounts shared in proportion).
          {!f.refundsSupported && " There is no cancellation or refund flow, so refunds are zero."}
        </p>
        <p className={`mt-2 rounded-lg px-3 py-2 text-xs ${rec.matched === rec.checked ? "bg-success-500/10 text-success-300" : "bg-gold-500/10 text-gold-300"}`} role="status">
          {rec.matched} of {rec.checked} bookings reconcile (gross − discount = charged).
          {rec.estimated > 0 && ` ${rec.estimated} older bookings have no price snapshot, so their ticket prices are read from the show.`}
          {rec.mismatched.length > 0 && ` Check: ${rec.mismatched.join(", ")}.`}
        </p>
        <p className="mt-2 text-2xs text-gray-500">
          {f.bookings.revenue} bookings counted · {f.bookings.pending} pending and {f.bookings.failed} failed not counted.
        </p>
      </section>

      <section className="card p-5" aria-labelledby="occ-title">
        <h2 id="occ-title" className="font-semibold text-white">Occupancy</h2>
        <p className="mt-1 text-sm text-gray-300">
          <span className="font-display text-2xl font-bold text-white">{occ.rate}%</span> of {occ.seats.toLocaleString()} seats booked across {occ.shows} showtimes
        </p>
        {occ.byShow.length > 0 && (
          <div className="mt-3 max-h-56 overflow-auto">
            <table className="w-full text-left text-xs">
              <caption className="sr-only">Occupancy by showtime</caption>
              <thead className="text-gray-400">
                <tr><th scope="col" className="py-1 pr-2 font-medium">Showtime</th><th scope="col" className="py-1 pr-2 font-medium">Booked</th><th scope="col" className="py-1 font-medium">Rate</th></tr>
              </thead>
              <tbody className="divide-y divide-line text-gray-200">
                {occ.byShow.slice(0, 12).map((o) => (
                  <tr key={o.showId}>
                    <td className="py-1 pr-2">{o.movie} · {o.theatre} · {o.date} {o.time}</td>
                    <td className="py-1 pr-2">{o.booked}/{o.seats}</td>
                    <td className="py-1">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-1.5 w-12 overflow-hidden rounded-full bg-fill-strong" aria-hidden="true">
                          <span className="block h-full bg-brand-solid" style={{ width: `${Math.min(100, o.rate)}%` }} />
                        </span>
                        {o.rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card p-5" aria-labelledby="cat-title">
        <h2 id="cat-title" className="font-semibold text-white">Seat categories</h2>
        {data.categories.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">No tickets in this period.</p>
        ) : (
          <table className="mt-3 w-full text-left text-sm">
            <caption className="sr-only">Seat category performance</caption>
            <thead className="text-xs text-gray-400">
              <tr><th scope="col" className="py-1 pr-2 font-medium">Category</th><th scope="col" className="py-1 pr-2 font-medium">Tickets</th><th scope="col" className="py-1 pr-2 font-medium">Gross</th><th scope="col" className="py-1 font-medium">Net</th></tr>
            </thead>
            <tbody className="divide-y divide-line text-gray-200">
              {data.categories.map((c) => (
                <tr key={c.category}>
                  <td className="py-1.5 pr-2">{c.category}</td>
                  <td className="py-1.5 pr-2">{c.ticketsSold}</td>
                  <td className="py-1.5 pr-2 font-mono">{formatPrice(c.gross)}</td>
                  <td className="py-1.5 font-mono">{formatPrice(c.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card p-5" aria-labelledby="food-title">
        <h2 id="food-title" className="font-semibold text-white">Food & drinks</h2>
        <p className="mt-1 text-xs text-gray-400">
          With tickets: {formatPrice(food.withTicketsGross)} gross · Standalone orders: {food.standaloneOrders} ({formatPrice(food.standaloneRevenue)})
        </p>
        {food.items.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">No food sold in this period.</p>
        ) : (
          <ul className="mt-3 space-y-1.5 text-sm">
            {food.items.slice(0, 8).map((it) => (
              <li key={it.name} className="flex justify-between gap-3">
                <span className="text-gray-200">{it.name} <span className="text-xs text-gray-500">× {it.qty}</span></span>
                <span className="font-mono text-gray-300">{formatPrice(it.revenue)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.trend.length > 1 && (
        <section className="card p-5 lg:col-span-2" aria-labelledby="trend-title">
          <h2 id="trend-title" className="font-semibold text-white">Bookings by day</h2>
          <div className="mt-3 flex h-28 items-end gap-1" role="img" aria-label={`Net booking value per day, ${data.trend.length} days`}>
            {(() => {
              const max = Math.max(...data.trend.map((d) => d.net), 1);
              return data.trend.slice(-60).map((d) => (
                <span key={d.date} className="flex-1 rounded-t bg-brand-solid/80" style={{ height: `${Math.max(3, (d.net / max) * 100)}%` }} title={`${d.date}: ${d.bookings} bookings, ${formatPrice(d.net)}`} />
              ));
            })()}
          </div>
          <p className="mt-1 flex justify-between text-2xs text-gray-500"><span>{data.trend[Math.max(0, data.trend.length - 60)].date}</span><span>{data.trend[data.trend.length - 1].date}</span></p>
        </section>
      )}
    </div>
  );
}
