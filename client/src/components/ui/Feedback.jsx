import React from "react";
import Icon from "./Icon";

export function Spinner({ className = "h-5 w-5" }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
    </svg>
  );
}

export function PageLoader({ label = "Loading…" }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-fg-muted" role="status" aria-live="polite">
      <Spinner className="h-8 w-8 text-brand-500" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

/** Inline "working" indicator for a section that is refreshing. */
export function InlineLoader({ label = "Loading…", className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2 text-sm text-fg-muted ${className}`} role="status" aria-live="polite">
      <Spinner className="h-4 w-4 text-brand-400" />
      {label}
    </span>
  );
}

/**
 * Nothing to show (yet). `compact` suits panels and tables; the default suits
 * a whole page section.
 */
export function EmptyState({ icon = "film", title, message, action, compact = false }) {
  return (
    <div className={`card-muted flex flex-col items-center text-center ${compact ? "px-5 py-8" : "px-6 py-14"}`}>
      <span className={`mb-4 flex items-center justify-center rounded-card bg-fill text-fg-muted ${compact ? "h-11 w-11" : "h-14 w-14"}`}>
        <Icon name={icon} className={compact ? "h-5 w-5" : "h-7 w-7"} />
      </span>
      <h3 className={`font-bold text-fg ${compact ? "text-base" : "text-lg"}`}>{title}</h3>
      {message && <p className="mt-1.5 max-w-sm text-sm text-fg-muted">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", message, onRetry, compact }) {
  return (
    <EmptyState
      compact={compact}
      icon="alert"
      title={title}
      message={message || "We couldn't load this right now. Please check your connection and try again."}
      action={
        onRetry && (
          <button className="btn-secondary" onClick={onRetry}>
            <Icon name="refresh" className="h-4 w-4" /> Try again
          </button>
        )
      }
    />
  );
}

export function MovieCardSkeleton() {
  return (
    <div>
      <div className="skeleton aspect-[2/3] w-full rounded-2xl" />
      <div className="skeleton mt-3 h-4 w-3/4" />
      <div className="skeleton mt-2 h-3 w-1/2" />
    </div>
  );
}

export function MovieGridSkeleton({ count = 10 }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <MovieCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** A grey placeholder block with a shimmer (hidden from screen readers). */
export function Skeleton({ className = "h-4 w-full" }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

/** A few lines of placeholder text; the last line is shorter. */
export function SkeletonText({ lines = 3, className = "" }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`skeleton h-3.5 ${i === lines - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

/** Placeholder rows shaped like a data table while it loads. */
export function TableSkeleton({ rows = 5, columns = 4, label = "Loading table" }) {
  return (
    <div className="table-wrap" role="status" aria-label={label}>
      <div className="divide-y divide-line">
        <div className="flex gap-4 bg-fill-subtle px-4 py-3">
          {Array.from({ length: columns }).map((_, c) => (
            <div key={c} className="skeleton h-3 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 px-4 py-3.5">
            {Array.from({ length: columns }).map((_, c) => (
              <div key={c} className={`skeleton h-3.5 flex-1 ${c === 0 ? "max-w-[40%]" : ""}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
