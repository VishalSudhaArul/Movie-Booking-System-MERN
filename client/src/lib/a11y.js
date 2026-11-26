// a11y.js
// Small behaviour hooks shared by dialogs, drawers, menus and popovers.

import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

export const focusableIn = (root) =>
  root
    ? [...root.querySelectorAll(FOCUSABLE)].filter(
        (el) => !el.hasAttribute("inert") && el.getClientRects().length > 0
      )
    : [];

/**
 * Keeps Tab / Shift+Tab inside `ref` while `active`, focuses the panel when it
 * opens and returns focus to whatever was focused before when it closes.
 */
export function useFocusTrap(ref, active) {
  useEffect(() => {
    if (!active) return undefined;
    const previouslyFocused = document.activeElement;
    const root = ref.current;
    if (root && !root.contains(document.activeElement)) root.focus({ preventScroll: true });

    const onKey = (e) => {
      if (e.key !== "Tab" || !ref.current) return;
      const items = focusableIn(ref.current);
      if (items.length === 0) {
        e.preventDefault();
        ref.current.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      // Return focus only if it would otherwise be lost (still inside the closing
      // panel, or dropped to <body>). If something else already took it, such as
      // a page the drawer navigated to that focused its own field, leave it there.
      const now = document.activeElement;
      const lost = !now || now === document.body || (root && root.contains(now));
      if (lost && previouslyFocused && previouslyFocused.isConnected && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [ref, active]);
}

// Several overlays can be open at once (a drawer, then a dialog from it), so
// scroll locking is reference-counted and only restored by the last one.
let lockCount = 0;
let savedOverflow = "";

/** Stops the page behind an overlay from scrolling while `active`. */
export function useScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    if (lockCount === 0) {
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    lockCount += 1;
    return () => {
      lockCount -= 1;
      if (lockCount === 0) document.body.style.overflow = savedOverflow;
    };
  }, [active]);
}

/**
 * Calls `onDismiss` on Escape or on a pointer press outside every ref in
 * `refs` while `active` (menus, popovers, pickers).
 */
export function useDismiss(refs, active, onDismiss) {
  // Latest values in refs, so callers can pass inline functions and arrays.
  const handler = useRef(onDismiss);
  handler.current = onDismiss;
  const inside = useRef(refs);
  inside.current = Array.isArray(refs) ? refs : [refs];
  useEffect(() => {
    if (!active) return undefined;
    const onPointer = (e) => {
      if (inside.current.some((r) => r.current && r.current.contains(e.target))) return;
      handler.current?.(e);
    };
    const onKey = (e) => {
      if (e.key === "Escape") handler.current?.(e);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [active]);
}

/**
 * Arrow-key movement for a group of controls (tabs, segmented buttons,
 * radio-like cards). Returns an onKeyDown handler for the group container.
 * `orientation` limits which arrows apply.
 */
export function rovingKeyDown(e, { selector = '[role="tab"]', orientation = "horizontal", activate = true } = {}) {
  const keys =
    orientation === "vertical" ? ["ArrowUp", "ArrowDown", "Home", "End"] : ["ArrowLeft", "ArrowRight", "Home", "End"];
  if (!keys.includes(e.key)) return;
  const items = [...e.currentTarget.querySelectorAll(selector)].filter((el) => !el.disabled);
  if (items.length === 0) return;
  const index = items.indexOf(document.activeElement);
  let next = index;
  if (e.key === "Home") next = 0;
  else if (e.key === "End") next = items.length - 1;
  else if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (index + 1) % items.length;
  else next = (index - 1 + items.length) % items.length;
  e.preventDefault();
  items[next].focus();
  if (activate) items[next].click();
}
