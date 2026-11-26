import React, { useEffect, useId, useRef } from "react";
import Icon from "./Icon";
import { useFocusTrap, useScrollLock } from "../../lib/a11y";

/**
 * Accessible modal dialog: traps keyboard focus, closes on Escape and backdrop
 * press, locks page scroll and returns focus to the opener when closed.
 * On phones it rises from the bottom as a sheet; from `sm` up it is centred.
 */
export default function Modal({ isOpen, onClose, title, subtitle, children, footer, size = "md" }) {
  const panelRef = useRef(null);
  const titleId = useId();
  useFocusTrap(panelRef, isOpen);
  useScrollLock(isOpen);

  // Kept separate from the focus trap so a new onClose function on every
  // parent render doesn't move focus around.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") closeRef.current?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  if (!isOpen) return null;

  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm animate-fadeIn sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={`flex max-h-[90vh] w-full ${widths[size]} flex-col overflow-hidden rounded-t-card border border-line-strong bg-surface shadow-overlay outline-none animate-modalScaleIn sm:rounded-card`}
      >
        {(title || onClose) && (
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              {title && (
                <h2 id={titleId} className="truncate text-lg font-bold text-fg">
                  {title}
                </h2>
              )}
              {subtitle && <p className="mt-0.5 text-xs text-fg-muted">{subtitle}</p>}
            </div>
            {onClose && (
              <button type="button" onClick={onClose} className="btn-icon h-9 w-9" aria-label="Close">
                <Icon name="close" className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && <div className="border-t border-line bg-surface-sunken px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}
