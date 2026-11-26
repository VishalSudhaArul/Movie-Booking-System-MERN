import React, { useEffect, useRef, useState } from "react";
import Icon from "./ui/Icon";
import { THEMES, useTheme } from "../lib/theme";
import { useDismiss } from "../lib/a11y";

const Swatch = ({ colors, className = "h-5 w-5" }) => (
  <span
    className={`block shrink-0 rounded-full ring-1 ring-inset ring-white/25 ${className}`}
    style={{ background: `linear-gradient(135deg, ${colors[0]} 0%, ${colors[0]} 45%, ${colors[1]} 100%)` }}
    aria-hidden="true"
  />
);

/** The five themes as a radio group (used in the popover and the mobile drawer). */
export function ThemeOptions({ onPicked, compact = false }) {
  const [theme, setTheme] = useTheme();
  const refs = useRef([]);
  const index = Math.max(0, THEMES.findIndex((t) => t.id === theme));

  // Arrow keys move between options, like a native radio group.
  const onKeyDown = (e) => {
    const delta = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + THEMES.length) % THEMES.length;
    setTheme(THEMES[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label="Colour theme" onKeyDown={onKeyDown} className={compact ? "grid grid-cols-5 gap-2" : "space-y-1"}>
      {THEMES.map((t, i) => {
        const checked = t.id === theme;
        return (
          <button
            key={t.id}
            ref={(el) => (refs.current[i] = el)}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={compact ? t.name : undefined}
            title={compact ? t.name : undefined}
            tabIndex={checked ? 0 : -1}
            data-theme-option={t.id}
            onClick={() => {
              setTheme(t.id);
              onPicked?.(t.id);
            }}
            className={
              compact
                ? `flex aspect-square items-center justify-center rounded-control border transition duration-base ${
                    checked ? "border-white/60 bg-fill-strong" : "border-line-strong hover:border-white/30"
                  }`
                : `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition duration-fast ${
                    checked ? "bg-fill-strong text-fg" : "text-fg-secondary hover:bg-fill hover:text-fg"
                  }`
            }
          >
            <Swatch colors={t.swatch} className={compact ? "h-6 w-6" : "h-5 w-5"} />
            {!compact && <span className="flex-1">{t.name}</span>}
            {!compact && checked && <Icon name="check" className="h-4 w-4 text-brand-300" />}
          </button>
        );
      })}
    </div>
  );
}

/** Navbar button that opens the theme popover. */
export default function ThemePicker({ className = "" }) {
  const [open, setOpen] = useState(false);
  const [theme] = useTheme();
  const ref = useRef(null);
  const current = THEMES.find((t) => t.id === theme) || THEMES[0];

  // Outside press or Escape closes it; Escape also returns focus to the button.
  useDismiss(ref, open, (e) => {
    setOpen(false);
    if (e?.key === "Escape") ref.current?.querySelector("button")?.focus();
  });

  // Move focus to the selected option when the popover opens.
  useEffect(() => {
    if (open) ref.current?.querySelector('[role="radio"][aria-checked="true"]')?.focus();
  }, [open]);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="btn-icon"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Colour theme: ${current.name}`}
        title="Colour theme"
      >
        <Swatch colors={current.swatch} className="h-[18px] w-[18px]" />
      </button>
      {open && (
        <div className="menu absolute right-0 mt-2 w-60 p-1.5">
          <p className="flex items-center gap-2 px-3 pb-1.5 pt-2 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
            <Icon name="palette" className="h-3.5 w-3.5" /> Colour theme
          </p>
          <ThemeOptions onPicked={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
