// motion.js
// Motion tokens for JavaScript (framer-motion, requestAnimationFrame, three.js
// camera moves). They mirror the CSS variables in index.css and the Tailwind
// duration-* / ease-* classes, so CSS and JS animation feel the same.
//
// Conventions
// - fast (120 ms): hover and press feedback, small colour changes
// - base (200 ms): menus, tooltips, tabs, most state changes
// - slow (320 ms): page entrances, drawers, dialogs, section reveals
// - emphasized easing for things entering, standard for state changes,
//   exit easing for things leaving.
// - Only opacity and transform are animated, so nothing shifts layout.
// - Everything becomes instant when the visitor prefers reduced motion.

import { useEffect, useState } from "react";

export const DURATION = { fast: 0.12, base: 0.2, slow: 0.32, slower: 0.48 }; // seconds
export const EASE = {
  standard: [0.2, 0, 0, 1],
  emphasized: [0.16, 1, 0.3, 1],
  exit: [0.4, 0, 1, 1],
};

const QUERY = "(prefers-reduced-motion: reduce)";

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(QUERY).matches;

/** True while the visitor prefers reduced motion; follows changes live. */
export function useReducedMotionPreference() {
  const [reduce, setReduce] = useState(prefersReducedMotion);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(QUERY);
    const onChange = () => setReduce(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduce;
}

/** framer-motion variants for a fade-and-rise entrance. */
export const fadeUp = (reduce, delay = 0) =>
  reduce
    ? { hidden: { opacity: 1, y: 0 }, show: { opacity: 1, y: 0 } }
    : {
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: DURATION.slow, ease: EASE.emphasized, delay } },
      };
