import React from "react";
import Icon from "./Icon";

/**
 * Consistent page heading: optional eyebrow and icon, title, supporting text
 * and actions on the right (they wrap below on small screens).
 */
export default function PageHeader({ eyebrow, title, subtitle, icon, actions, className = "" }) {
  return (
    <header className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      <div className="flex min-w-0 items-start gap-4">
        {icon && (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient-soft text-brand-300 shadow-inner-line">
            <Icon name={icon} className="h-6 w-6" />
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-gray-400">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** A labelled number for dashboards. `tone` tints the icon. */
export function StatCard({ label, value, icon, tone = "brand", hint }) {
  const tones = {
    brand: "bg-brand-500/15 text-brand-300",
    accent: "bg-accent-500/15 text-accent-300",
    green: "bg-emerald-500/15 text-emerald-300",
    gold: "bg-gold-500/15 text-gold-400",
  };
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between gap-3">
        <p className="stat-label">{label}</p>
        {icon && (
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone] || tones.brand}`}>
            <Icon name={icon} className="h-5 w-5" />
          </span>
        )}
      </div>
      <p className="stat-value">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}
