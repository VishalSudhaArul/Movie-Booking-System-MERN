import React from "react";
import Icon from "./Icon";
import { Breadcrumbs } from "./Navigation";

/**
 * Consistent page heading: optional breadcrumbs, eyebrow and icon, the page
 * title (the page's only h1), supporting text, and actions on the right
 * (they wrap below on small screens).
 */
export default function PageHeader({ eyebrow, title, subtitle, icon, actions, breadcrumbs, className = "" }) {
  return (
    <header className={className}>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} className="mb-4" />}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {icon && (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-card bg-brand-gradient-soft text-brand-300 shadow-inner-line">
              <Icon name={icon} className="h-6 w-6" />
            </span>
          )}
          <div className="min-w-0">
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h1 className="page-title mt-1">{title}</h1>
            {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-fg-muted">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/** A labelled number for dashboards. `tone` tints the icon. */
export function StatCard({ label, value, icon, tone = "brand", hint }) {
  const tones = {
    brand: "bg-brand-500/15 text-brand-300",
    accent: "bg-accent-500/15 text-accent-300",
    green: "bg-success-500/15 text-success-300",
    success: "bg-success-500/15 text-success-300",
    gold: "bg-warning-500/15 text-warning-400",
    warning: "bg-warning-500/15 text-warning-400",
  };
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between gap-3">
        <p className="stat-label">{label}</p>
        {icon && (
          <span className={`flex h-9 w-9 items-center justify-center rounded-control ${tones[tone] || tones.brand}`} aria-hidden="true">
            <Icon name={icon} className="h-5 w-5" />
          </span>
        )}
      </div>
      <p className="stat-value">{value}</p>
      {hint && <p className="caption mt-1">{hint}</p>}
    </div>
  );
}
