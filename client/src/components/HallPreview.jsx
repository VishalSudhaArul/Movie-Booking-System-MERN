import React, { useMemo } from "react";
import { buildAuditorium } from "../lib/auditorium";

// Okabe–Ito colours per price category (colour-blind safe), as in the seat heatmap.
const SECTION_COLORS = { "Second Class": "#56B4E9", "First Class": "#009E73", Balcony: "#E69F00" };

/** Seats for a layout that has no show yet (for previews). */
export const seatsForLayout = (layout) =>
  (layout?.rows || []).flatMap((r) =>
    Array.from({ length: r.seats }, (_, i) => ({ seatNumber: `${r.label}${i + 1}`, category: r.section, price: 0, isBooked: false }))
  );

/**
 * A compact, read-only plan of a hall: rows from the back (top) to the screen
 * (bottom), blocks split by aisles, seats coloured by price category, wheelchair
 * spaces outlined, doors listed. Used by the admin layout editor.
 */
export default function HallPreview({ layout, className = "" }) {
  const hall = useMemo(() => (layout ? buildAuditorium(layout, seatsForLayout(layout)) : null), [layout]);
  if (!hall) return null;
  const sections = [...new Set(hall.rows.map((r) => r.section))];
  const widest = Math.max(...hall.rows.map((r) => r.seats.length + (r.aisleAfter || []).length * 2));
  const cell = widest > 40 ? 6 : widest > 28 ? 8 : 10;

  return (
    <figure className={`overflow-x-auto rounded-xl border border-line bg-ink-950 p-4 ${className}`} data-testid="hall-preview">
      <div className="mx-auto w-max space-y-[3px]" role="img" aria-label={`Plan of ${hall.name}: ${hall.seatCount} seats in ${hall.rows.length} rows`}>
        {[...hall.rows].reverse().map((row) => {
          const blocks = [];
          row.seats.forEach((s) => {
            if (!blocks.length || s.aisleBefore) blocks.push([]);
            blocks[blocks.length - 1].push(s);
          });
          return (
            <div key={row.label} className="flex items-center justify-center gap-1.5">
              <span className="w-4 text-right font-mono text-[9px] text-gray-500">{row.label}</span>
              {blocks.map((b, i) => (
                <div key={i} className="flex gap-[2px]" style={{ marginLeft: i ? cell : 0 }}>
                  {b.map((s) => (
                    <span
                      key={s.seatNumber}
                      title={`${s.seatNumber} · ${s.category}${s.seatType === "recliner" ? " · recliner" : ""}${s.wheelchair ? " · wheelchair space" : s.companion ? " · companion seat" : ""}`}
                      className={`block rounded-[2px] ${s.wheelchair ? "ring-1 ring-white" : ""}`}
                      style={{ width: s.seatType === "recliner" ? cell * 1.4 : cell, height: cell, background: SECTION_COLORS[s.category] || "#8a93a8" }}
                    />
                  ))}
                </div>
              ))}
            </div>
          );
        })}
        <div className="mx-auto mt-2 h-1.5 w-2/3 rounded-full bg-white/70" aria-hidden="true" />
        <p className="text-center text-[9px] uppercase tracking-[0.3em] text-gray-500">Screen</p>
      </div>
      <figcaption className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-2xs text-gray-400">
        {sections.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SECTION_COLORS[s] }} aria-hidden="true" /> {s}
          </span>
        ))}
        {hall.accessibility.configured && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm ring-1 ring-white" aria-hidden="true" /> Wheelchair space
          </span>
        )}
      </figcaption>
    </figure>
  );
}
