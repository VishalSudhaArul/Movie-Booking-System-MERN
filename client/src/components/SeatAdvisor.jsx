import React, { useMemo, useState } from "react";
import Icon from "./ui/Icon";
import Tabs, { TabPanel } from "./ui/Tabs";
import { formatPrice } from "../lib/format";
import { HEATMAP_MODES, HEAT_SCALE, RECOMMENDATION_MODES, compareSeats, recommendSeats } from "../lib/seatInsights";

/**
 * Seat advisor, shared by the 2D map and the 3D hall:
 * - Recommend: seat groups ranked by viewing geometry, price or access, with reasons.
 * - Heatmap: recolour free seats by a metric (taken seats always stay "unavailable").
 * - Compare: up to three seats side by side.
 * Availability always comes from the server; recommendations only use free seats.
 */
export default function SeatAdvisor({
  hall,
  selected,
  premiumCategory,
  maxSeats,
  onApply,
  onPreview,
  heatMode,
  onHeatMode,
  legend,
  compare,
  onCompareChange,
  compareMode,
  onCompareMode,
  disabled = false,
}) {
  const [tab, setTab] = useState("recommend");
  const [mode, setMode] = useState("best");
  const [count, setCount] = useState(() => Math.max(1, Math.min(maxSeats, selected.length || 2)));

  const result = useMemo(
    () => (tab === "recommend" ? recommendSeats(hall, { mode, count, selected, premiumCategory }) : null),
    [tab, hall, mode, count, selected, premiumCategory]
  );
  const rows = useMemo(() => compareSeats(hall, compare), [hall, compare]);
  const modes = RECOMMENDATION_MODES.filter(([id]) => id !== "accessible" || hall.accessibility?.configured);

  return (
    <section className="card p-4 sm:p-5" aria-label="Seat advisor" data-testid="seat-advisor">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-white">Seat advisor</h2>
          <p className="text-xs text-gray-400">Based on this hall's real geometry: screen size, angle, distance and sightlines.</p>
        </div>
        <Tabs
          label="Seat advisor tools"
          idPrefix="advisor"
          value={tab}
          onChange={setTab}
          items={[
            { id: "recommend", label: "Recommend" },
            { id: "heatmap", label: "Heatmap" },
            { id: "compare", label: "Compare", count: compare.length || null },
          ]}
        />
      </div>

      {tab === "recommend" && (
        <TabPanel idPrefix="advisor" id="recommend" className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="scroll-row flex-1 gap-1.5" role="group" aria-label="What matters most">
              {modes.map(([id, label]) => (
                <button key={id} type="button" onClick={() => setMode(id)} aria-pressed={mode === id} className={`chip shrink-0 ${mode === id ? "chip-active" : ""}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5" role="group" aria-label="Number of seats">
              <span className="text-xs text-gray-400">Seats</span>
              <button type="button" className="btn-icon h-8 w-8" onClick={() => setCount((c) => Math.max(1, c - 1))} aria-label="Fewer seats" disabled={count <= 1}>
                <Icon name="minus" className="h-4 w-4" />
              </button>
              <span className="w-5 text-center text-sm font-semibold text-white" aria-live="polite" data-testid="advisor-count">{count}</span>
              <button type="button" className="btn-icon h-8 w-8" onClick={() => setCount((c) => Math.min(maxSeats, c + 1))} aria-label="More seats" disabled={count >= maxSeats}>
                <Icon name="plus" className="h-4 w-4" />
              </button>
            </div>
          </div>
          {result.options.length === 0 ? (
            <p className="mt-3 rounded-xl bg-fill-subtle p-3 text-sm text-gray-300" role="status">{result.message}</p>
          ) : (
            <ol className="mt-3 space-y-2" aria-label="Recommended seats">
              {result.options.map((o, i) => (
                <li key={o.seatNumbers.join()} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-fill-subtle p-3" data-testid="recommendation">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-sm font-bold text-brand-200" aria-hidden="true">
                    {i + 1}
                  </span>
                  <div className="min-w-[13rem] flex-1">
                    <p className="text-sm text-white">{o.explanation}</p>
                    <p className="text-2xs text-gray-400">
                      View score {o.score}/100 · {formatPrice(o.price)} for {o.seats.length} {o.seats.length === 1 ? "seat" : "seats"}
                    </p>
                  </div>
                  <div className="ml-12 flex shrink-0 gap-1.5 sm:ml-0">
                    {onPreview && (
                      <button type="button" className="btn-secondary btn-sm" onClick={() => onPreview(o.seatNumbers[Math.floor(o.seatNumbers.length / 2)])} aria-label={`Preview the view from row ${o.row.label}`}>
                        <Icon name="eye" className="h-4 w-4" /> Preview
                      </button>
                    )}
                    <button type="button" className="btn-primary btn-sm" onClick={() => onApply(o.seatNumbers)} disabled={disabled} aria-label={`Select ${o.seatNumbers.join(", ")}`}>
                      Select
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
          {result.message && result.options.length > 0 && <p className="mt-2 text-2xs text-gray-500">{result.message}</p>}
          <p className="mt-2 text-2xs text-gray-500">Recommendations are worked out from seat and screen positions. They don't hold seats: availability is confirmed when you continue.</p>
        </TabPanel>
      )}

      {tab === "heatmap" && (
        <TabPanel idPrefix="advisor" id="heatmap" className="mt-4">
          <div className="scroll-row gap-1.5" role="group" aria-label="Colour seats by">
            {HEATMAP_MODES.map(([id, label]) => (
              <button key={id} type="button" onClick={() => onHeatMode(id)} aria-pressed={heatMode === id} className={`chip shrink-0 ${heatMode === id ? "chip-active" : ""}`}>
                {label}
              </button>
            ))}
          </div>
          <HeatLegend legend={legend} />
        </TabPanel>
      )}

      {tab === "compare" && (
        <TabPanel idPrefix="advisor" id="compare" className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-gray-400">
              {compareMode ? "Click free seats on the map to add them (up to 3)." : "Turn on compare mode, then click up to three free seats."}
            </p>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => onCompareMode(!compareMode)} aria-pressed={compareMode} className={compareMode ? "btn-primary btn-sm" : "btn-secondary btn-sm"}>
                {compareMode ? "Done comparing" : "Compare mode"}
              </button>
              {compare.length > 0 && (
                <button type="button" className="btn-ghost btn-sm" onClick={() => onCompareChange([])}>Clear</button>
              )}
            </div>
          </div>
          {rows.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-xs" data-testid="compare-table">
                <caption className="sr-only">Seat comparison</caption>
                <thead>
                  <tr className="text-gray-400">
                    <th scope="col" className="py-1.5 pr-3 font-medium">Seat</th>
                    {rows.map((r) => (
                      <th key={r.seatNumber} scope="col" className="py-1.5 pr-3 font-semibold text-white">
                        <span className="inline-flex items-center gap-1">
                          {r.seatNumber}
                          <button type="button" className="rounded p-0.5 text-gray-400 hover:text-white" onClick={() => onCompareChange(compare.filter((n) => n !== r.seatNumber))} aria-label={`Remove ${r.seatNumber} from the comparison`}>
                            <Icon name="close" className="h-3 w-3" />
                          </button>
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-gray-200">
                  {[
                    ["View score", (r) => `${r.score}/100`],
                    ["Distance to screen", (r) => `${r.distance} m`],
                    ["Off centre", (r) => `${r.offCentre}°`],
                    ["Screen fills", (r) => `${r.screenWidthAngle}° of view`],
                    ["Look up", (r) => `${r.verticalAngle}°`],
                    ["Sightline clearance", (r) => (r.clearance === null ? "No row in front" : `${r.clearance} cm`)],
                    ["Price", (r) => formatPrice(r.price)],
                    ["Status", (r) => (r.available ? "Available" : "Unavailable")],
                  ].map(([label, f]) => (
                    <tr key={label}>
                      <th scope="row" className="py-1.5 pr-3 font-medium text-gray-400">{label}</th>
                      {rows.map((r) => (
                        <td key={r.seatNumber} className="py-1.5 pr-3">{f(r)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {onPreview &&
                  rows.map((r) => (
                    <button key={r.seatNumber} type="button" className="btn-secondary btn-sm" onClick={() => onPreview(r.seatNumber)}>
                      <Icon name="eye" className="h-4 w-4" /> View from {r.seatNumber}
                    </button>
                  ))}
                {rows.some((r) => r.available) && (
                  <button type="button" className="btn-primary btn-sm" disabled={disabled} onClick={() => onApply(rows.filter((r) => r.available).map((r) => r.seatNumber))}>
                    Select these seats
                  </button>
                )}
              </div>
            </div>
          )}
        </TabPanel>
      )}
    </section>
  );
}

/** Legend for the active heatmap. */
export function HeatLegend({ legend }) {
  if (!legend) {
    return <p className="mt-3 text-xs text-gray-400">Seats show whether they're available, selected, reserved or booked (see the key below the map).</p>;
  }
  return (
    <div className="mt-3" data-testid="heatmap-legend">
      <p className="text-xs text-gray-300">{legend.label}</p>
      {legend.type === "categories" ? (
        <ul className="mt-1.5 flex flex-wrap gap-3 text-xs text-gray-300">
          {legend.items.map(([name, color]) => (
            <li key={name} className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm" style={{ background: color }} aria-hidden="true" /> {name}
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-1.5">
          <div className="h-2.5 rounded-full" style={{ background: `linear-gradient(to right, ${(legend.reversed ? [...HEAT_SCALE].reverse() : HEAT_SCALE).join(",")})` }} aria-hidden="true" />
          <div className="mt-1 flex justify-between text-2xs text-gray-400">
            <span>{legend.lowLabel} · {legend.money ? formatPrice(legend.min) : `${legend.min}${legend.unit}`}</span>
            <span>{legend.highLabel} · {legend.money ? formatPrice(legend.max) : `${legend.max}${legend.unit}`}</span>
          </div>
        </div>
      )}
      <p className="mt-2 text-2xs text-gray-500">Only free seats are coloured. Taken seats stay dark and your picks stay highlighted, so the map never makes a taken seat look free.</p>
    </div>
  );
}
