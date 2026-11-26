import React from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon";

/**
 * Breadcrumb trail. items: [{ label, to? }]; the last item is the current page.
 */
export function Breadcrumbs({ items, className = "" }) {
  if (!items?.length) return null;
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1 text-xs font-medium text-fg-muted">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex min-w-0 items-center gap-1">
              {item.to && !last ? (
                <Link to={item.to} className="truncate rounded px-0.5 transition duration-fast hover:text-fg">
                  {item.label}
                </Link>
              ) : (
                <span className={`truncate px-0.5 ${last ? "text-fg-secondary" : ""}`} aria-current={last ? "page" : undefined}>
                  {item.label}
                </span>
              )}
              {!last && <Icon name="chevronRight" className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Page numbers to show: always the first and last, the current page and its
// neighbours, with gaps marked as null.
export const pageList = (page, pages) => {
  const out = [];
  for (let p = 1; p <= pages; p += 1) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) out.push(p);
    else if (out[out.length - 1] !== null) out.push(null);
  }
  return out;
};

/**
 * Page navigation for long lists and tables. 1-based `page`.
 * Shows "Showing 21–40 of 87" for context when `total` and `pageSize` are set.
 */
export function Pagination({ page, pageCount, onChange, total, pageSize, label = "Pagination", className = "" }) {
  if (pageCount <= 1) return null;
  const from = total != null && pageSize ? (page - 1) * pageSize + 1 : null;
  const to = from != null ? Math.min(page * pageSize, total) : null;
  const btn =
    "inline-flex h-9 min-w-[36px] items-center justify-center rounded-lg px-2 text-sm font-semibold transition duration-fast disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <nav aria-label={label} className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
      {from != null ? (
        <p className="text-xs text-fg-muted" aria-live="polite">
          Showing <span className="font-semibold text-fg-secondary">{from}–{to}</span> of {total}
        </p>
      ) : (
        <span />
      )}
      <ul className="flex items-center gap-1">
        <li>
          <button
            type="button"
            className={`${btn} text-fg-secondary hover:bg-fill-strong`}
            onClick={() => onChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <Icon name="chevronLeft" className="h-4 w-4" />
          </button>
        </li>
        {pageList(page, pageCount).map((p, i) =>
          p === null ? (
            <li key={`gap-${i}`} className="px-1 text-fg-subtle" aria-hidden="true">
              …
            </li>
          ) : (
            <li key={p}>
              <button
                type="button"
                className={`${btn} ${p === page ? "bg-fill-emphasis text-fg shadow-inner-line" : "text-fg-muted hover:bg-fill-strong hover:text-fg"}`}
                onClick={() => onChange(p)}
                aria-current={p === page ? "page" : undefined}
                aria-label={`Page ${p}`}
              >
                {p}
              </button>
            </li>
          )
        )}
        <li>
          <button
            type="button"
            className={`${btn} text-fg-secondary hover:bg-fill-strong`}
            onClick={() => onChange(page + 1)}
            disabled={page >= pageCount}
            aria-label="Next page"
          >
            <Icon name="chevronRight" className="h-4 w-4" />
          </button>
        </li>
      </ul>
    </nav>
  );
}
