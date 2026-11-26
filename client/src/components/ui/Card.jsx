import React from "react";

/**
 * A content panel with an optional header (title, description, actions).
 * `as` changes the element (e.g. "section"); `padded` controls body padding.
 * When there is a title, the panel is labelled by it for screen readers.
 */
export default function Card({
  as: Tag = "section",
  title,
  description,
  actions,
  padded = true,
  muted = false,
  className = "",
  bodyClassName = "",
  children,
  headingLevel = 2,
  ...rest
}) {
  const H = `h${headingLevel}`;
  const headingId = rest.id ? `${rest.id}-title` : undefined;
  return (
    <Tag
      className={`${muted ? "card-muted" : "card"} overflow-hidden ${className}`}
      aria-labelledby={title && headingId ? headingId : undefined}
      {...rest}
    >
      {(title || actions) && (
        <div className="card-header">
          <div className="min-w-0">
            {title && (
              <H id={headingId} className="card-title">
                {title}
              </H>
            )}
            {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={`${padded ? "p-5" : ""} ${bodyClassName}`}>{children}</div>
    </Tag>
  );
}
