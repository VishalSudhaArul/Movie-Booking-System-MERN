import React from "react";
import { rovingKeyDown } from "../../lib/a11y";

const STYLES = {
  // Compact pill group on a sunken track (filters, view switches)
  segmented: { list: "segmented", item: "segmented-item" },
  // Gradient pills that scroll sideways on small screens (account sections)
  pills: { list: "scroll-row", item: "chip" },
  // Text tabs with an underline (content sections)
  underline: { list: "tab-underline", item: "tab-underline-item" },
};

/**
 * Accessible tabs (WAI-ARIA tabs pattern with automatic activation):
 * one tab stop for the group, arrow keys / Home / End move between tabs.
 *
 * items: [{ id, label, count?, icon? }]
 * idPrefix: when set, tabs get ids `${idPrefix}-tab-${id}` and point at panels
 *   with ids `${idPrefix}-panel-${id}` (render those with <TabPanel>).
 */
export default function Tabs({ items, value, onChange, label, variant = "segmented", idPrefix, className = "" }) {
  const style = STYLES[variant] || STYLES.segmented;
  return (
    <div
      role="tablist"
      aria-label={label}
      className={`${style.list} ${className}`}
      onKeyDown={(e) => rovingKeyDown(e, { selector: '[role="tab"]' })}
    >
      {items.map((item) => {
        const selected = item.id === value;
        const pillActive = variant === "pills" && selected ? "chip-active" : "";
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={idPrefix ? `${idPrefix}-tab-${item.id}` : undefined}
            aria-controls={idPrefix ? `${idPrefix}-panel-${item.id}` : undefined}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.id)}
            className={`${style.item} ${pillActive}`}
          >
            {item.icon}
            {item.label}
            {item.count != null && (
              <span className={variant === "pills" && selected ? "rounded-full bg-black/15 px-1.5 text-2xs" : "count-pill"}>
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** The content region for one tab. */
export function TabPanel({ idPrefix, id, children, className = "" }) {
  return (
    <div
      role="tabpanel"
      id={`${idPrefix}-panel-${id}`}
      aria-labelledby={`${idPrefix}-tab-${id}`}
      tabIndex={0}
      className={`focus-visible:outline-offset-4 ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Segmented toggle buttons (aria-pressed), for switching a view mode where the
 * choices are actions rather than tab panels (e.g. "3D hall" / "2D map").
 */
export function SegmentedControl({ options, value, onChange, label, className = "", size = "md" }) {
  return (
    <div role="group" aria-label={label} className={`segmented ${className}`}>
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          aria-pressed={opt.id === value}
          onClick={() => onChange(opt.id)}
          disabled={opt.disabled}
          className={`segmented-item ${size === "sm" ? "px-3 py-1.5 text-xs" : ""} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
