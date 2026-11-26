import React, { useEffect, useRef } from "react";
import Icon from "./Icon";
import { useFocusTrap, useScrollLock } from "../../lib/a11y";

/**
 * Off-canvas panel: slides in from the right (navigation, filters) or up from
 * the bottom (mobile sheets). A modal dialog: focus is trapped inside, Escape
 * and a backdrop press close it, focus returns to the opener, and the page
 * behind doesn't scroll.
 */
export default function Drawer({
  isOpen,
  onClose,
  label,
  title,
  side = "right",
  header,
  footer,
  children,
  className = "",
}) {
  const panelRef = useRef(null);
  useFocusTrap(panelRef, isOpen);
  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const panel =
    side === "bottom"
      ? "mt-auto max-h-[88vh] w-full rounded-t-panel border-t animate-sheet-up pb-[env(safe-area-inset-bottom)]"
      : "ml-auto h-full w-[86%] max-w-sm border-l animate-drawer-right";

  return (
    <div
      className="fixed inset-0 z-[90] flex bg-black/70 backdrop-blur-sm animate-fadeIn"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label || (typeof title === "string" ? title : undefined)}
        tabIndex={-1}
        className={`flex flex-col border-line-strong bg-surface-sunken shadow-overlay outline-none ${panel} ${className}`}
      >
        {(header || title) && (
          <div className="flex h-header shrink-0 items-center justify-between gap-3 border-b border-line px-4">
            {header || <h2 className="card-title">{title}</h2>}
            <button type="button" onClick={onClose} className="btn-icon" aria-label={`Close ${label ? label.toLowerCase() : "panel"}`}>
              <Icon name="close" className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && <div className="shrink-0 border-t border-line p-4">{footer}</div>}
      </aside>
    </div>
  );
}
