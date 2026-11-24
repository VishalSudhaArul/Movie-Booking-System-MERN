import React, { useEffect, useRef } from "react";
import Icon from "./Icon";

/**
 * Accessible modal shell: closes on Escape and backdrop click,
 * locks page scroll and restores focus when closed.
 */
export default function Modal({ isOpen, onClose, title, subtitle, children, footer, size = "md" }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previouslyFocused = document.activeElement;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
    };
  }, [isOpen, onClose]);

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
        aria-label={typeof title === "string" ? title : undefined}
        tabIndex={-1}
        className={`flex max-h-[90vh] w-full ${widths[size]} flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-ink-850 shadow-2xl outline-none animate-modalScaleIn sm:rounded-2xl`}
      >
        {(title || onClose) && (
          <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
            <div className="min-w-0">
              {title && <h2 className="truncate text-lg font-bold text-white">{title}</h2>}
              {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
            </div>
            {onClose && (
              <button onClick={onClose} className="btn-icon h-9 w-9" aria-label="Close">
                <Icon name="close" className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="border-t border-white/[0.07] bg-ink-900 px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}
