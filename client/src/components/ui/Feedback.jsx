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
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-gray-400" role="status">
      <Spinner className="h-8 w-8 text-brand-500" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ icon = "film", title, message, action }) {
  return (
    <div className="card-muted flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.05] text-gray-400">
        <Icon name={icon} className="h-7 w-7" />
      </span>
      <h3 className="text-lg font-bold text-white">{title}</h3>
      {message && <p className="mt-1.5 max-w-sm text-sm text-gray-400">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", message, onRetry }) {
  return (
    <EmptyState
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
