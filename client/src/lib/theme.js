// theme.js
// Five colour themes. Each theme only swaps the accent colours (the `brand` and
// `accent` scales, gradients and glows), which are CSS variables defined in
// index.css. Semantic colours — errors, warnings, seat states such as booked or
// reserved — never change with the theme.
//
// The chosen theme is saved in localStorage and applied by a tiny inline script
// in public/index.html before the app loads, so there is no flash of the
// default colours on refresh.

import { useEffect, useState } from "react";

export const THEMES = [
  { id: "blue", name: "Electric Blue", swatch: ["#1E8CFF", "#8B5CF6"] },
  { id: "violet", name: "Royal Violet", swatch: ["#7C3AED", "#C026D3"] },
  { id: "crimson", name: "Crimson Red", swatch: ["#DC2626", "#F97316"] },
  { id: "emerald", name: "Emerald Green", swatch: ["#10B981", "#06B6D4"] },
  { id: "amber", name: "Amber Gold", swatch: ["#F59E0B", "#F97316"] },
];

export const DEFAULT_THEME = "blue";
export const THEME_STORAGE_KEY = "cinebook:theme";
export const THEME_EVENT = "cinebook:themechange";

const isTheme = (id) => THEMES.some((t) => t.id === id);

export const getTheme = () => {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(saved) ? saved : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
};

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

let transitionTimer;

/** Switches the theme everywhere, remembers it, and tells listeners (canvas, 3D). */
export const setTheme = (id) => {
  const next = isTheme(id) ? id : DEFAULT_THEME;
  const root = document.documentElement;
  if (root.dataset.colorTheme === next) return;

  // A short cross-fade of colours, skipped for people who prefer less motion.
  if (!reducedMotion()) {
    root.classList.add("theme-transition");
    clearTimeout(transitionTimer);
    transitionTimer = setTimeout(() => root.classList.remove("theme-transition"), 450);
  }
  root.dataset.colorTheme = next;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Private mode or blocked storage: the theme still applies for this visit.
  }
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: next }));
};

/** Makes sure the attribute is set (the inline script normally does this first). */
export const applyStoredTheme = () => {
  document.documentElement.dataset.colorTheme = getTheme();
};

/** Current theme id, re-rendering when it changes (also across browser tabs). */
export function useTheme() {
  const [theme, setLocal] = useState(getTheme);
  useEffect(() => {
    const onChange = () => setLocal(getTheme());
    const onStorage = (e) => {
      if (e.key === THEME_STORAGE_KEY) {
        document.documentElement.dataset.colorTheme = getTheme();
        onChange();
        window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: getTheme() }));
      }
    };
    window.addEventListener(THEME_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(THEME_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return [theme, setTheme];
}

/**
 * A theme colour as a CSS colour string, for places that can't use classes
 * (canvas drawing, three.js materials). `name` is a token such as "brand-500".
 */
export const themeColor = (name, fallback = "#1E8CFF") => {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
  const parts = raw.split(/\s+/).map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return fallback;
  return `rgb(${parts.join(", ")})`;
};

/** The given theme tokens as colour strings, updated when the theme changes. */
export function useThemeColors(names) {
  const [theme] = useTheme();
  const key = names.join("|");
  const [colors, setColors] = useState(() => Object.fromEntries(names.map((n) => [n, themeColor(n)])));
  useEffect(() => {
    setColors(Object.fromEntries(key.split("|").map((n) => [n, themeColor(n)])));
  }, [theme, key]);
  return colors;
}
