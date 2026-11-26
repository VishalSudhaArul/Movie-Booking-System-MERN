/** @type {import('tailwindcss').Config} */
// Design tokens. The values live as CSS variables in src/index.css (so the
// five colour themes, canvas drawing and three.js can read them too); this file
// maps them to Tailwind class names. See docs/design-system.md for the roles.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      screens: {
        xs: "420px",
      },
      colors: {
        // Primitive navy ramp (darkest to lightest). Prefer the semantic
        // surface names below in new code.
        ink: {
          950: "#05070F",
          900: "#090D1A",
          850: "#0D1324",
          800: "#121A30",
          700: "#1B2541",
          600: "#283454",
        },
        // Semantic surfaces
        canvas: v("surface-canvas"), // page background
        surface: {
          sunken: v("surface-sunken"), // wells, inputs, nav bars
          DEFAULT: v("surface-raised"), // cards and panels
          overlay: v("surface-overlay"), // menus, popovers, toasts
          highlight: v("surface-highlight"), // selected rows, hovered overlays
        },
        // Text roles. gray-* stays available; these name the roles.
        fg: {
          DEFAULT: v("fg-strong"), // headings, key numbers
          body: v("fg-body"), // paragraphs
          secondary: v("fg-secondary"), // supporting text
          muted: v("fg-muted"), // labels, metadata
          subtle: v("fg-subtle"), // captions, hints (still AA on every surface)
        },
        // Neutral greys. 500 is re-tuned so captions pass WCAG AA (4.5:1) on
        // every surface; Tailwind's default #6B7280 managed only 3.1-4.2:1 here.
        gray: {
          500: "#848CA0",
        },
        // Hairlines and translucent fills (fixed alpha, so no /opacity)
        line: {
          subtle: "var(--line-subtle)",
          DEFAULT: "var(--line)",
          strong: "var(--line-strong)",
        },
        fill: {
          subtle: "var(--fill-subtle)",
          DEFAULT: "var(--fill)",
          strong: "var(--fill-strong)",
          emphasis: "var(--fill-emphasis)",
        },
        // Theme accents. Values come from CSS variables so the five colour
        // themes (src/lib/theme.js, index.css) can swap them at runtime.
        brand: {
          200: v("brand-200"),
          300: v("brand-300"),
          400: v("brand-400"),
          500: v("brand-500"),
          600: v("brand-600"),
          700: v("brand-700"),
          // Solid fill that carries text: always >= 4.5:1 against on-brand.
          solid: v("brand-solid"),
        },
        accent: {
          200: v("accent-200"),
          300: v("accent-300"),
          400: v("accent-400"),
          500: v("accent-500"),
          600: v("accent-600"),
          700: v("accent-700"),
        },
        // Text and icons drawn on a solid brand fill (white or near-black,
        // whichever reads better on that theme's accent)
        "on-brand": v("on-brand"),
        "on-accent": v("on-accent"),
        // Status colours. Fixed across themes so their meaning never changes.
        success: {
          200: v("success-200"),
          300: v("success-300"),
          400: v("success-400"),
          500: v("success-500"),
          600: v("success-600"),
          700: v("success-700"),
        },
        warning: {
          300: v("warning-300"),
          400: v("warning-400"),
          500: v("warning-500"),
        },
        info: {
          200: v("info-200"),
          300: v("info-300"),
          400: v("info-400"),
          500: v("info-500"),
        },
        danger: {
          300: v("danger-300"),
          400: v("danger-400"),
          500: v("danger-500"),
          600: v("danger-600"),
        },
        // Older name for warning; kept so existing classes keep working.
        gold: {
          400: v("warning-400"),
          500: v("warning-500"),
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        display: ["Outfit", "Inter", "system-ui", "sans-serif"],
      },
      // Type scale additions: tiny labels and the display sizes used for page
      // titles and heroes. Body sizes are Tailwind's (xs to xl).
      fontSize: {
        "3xs": ["0.625rem", { lineHeight: "0.875rem" }], // 10px: dense counters only
        "2xs": ["0.6875rem", { lineHeight: "1rem" }], // 11px: overlines, badges
        md: ["0.9375rem", { lineHeight: "1.5rem" }], // 15px: touch menus
        "display-sm": ["1.75rem", { lineHeight: "2.125rem", letterSpacing: "-0.015em" }],
        "display-md": ["2.25rem", { lineHeight: "2.625rem", letterSpacing: "-0.02em" }],
        "display-lg": ["3rem", { lineHeight: "3.25rem", letterSpacing: "-0.025em" }],
        "display-xl": ["3.75rem", { lineHeight: "1.05", letterSpacing: "-0.03em" }],
      },
      letterSpacing: {
        overline: "0.18em",
      },
      spacing: {
        header: "4rem", // main navigation height
      },
      minHeight: {
        "screen-nav": "calc(100vh - 4rem)", // viewport minus the main navigation
      },
      maxWidth: {
        page: "80rem", // default content width (= 7xl)
      },
      borderRadius: {
        control: "0.75rem", // buttons, inputs, segmented controls
        card: "1rem", // cards, panels, dialogs
        panel: "1.5rem", // hero panels and large feature blocks
      },
      boxShadow: {
        // Elevation: card (resting), popover (menus, tooltips), overlay (dialogs, drawers)
        card: "0 1px 0 rgba(255,255,255,0.05) inset, 0 18px 40px -20px rgba(0,0,0,0.85)",
        popover: "0 0 0 1px rgba(255,255,255,0.04), 0 16px 40px -12px rgba(0,0,0,0.8)",
        overlay: "0 0 0 1px rgba(255,255,255,0.04), 0 32px 80px -16px rgba(0,0,0,0.9)",
        glow: "0 10px 30px -10px rgb(var(--brand-500) / 0.6)",
        "glow-accent": "0 10px 30px -10px rgb(var(--accent-500) / 0.55)",
        "inner-line": "inset 0 0 0 1px rgba(255,255,255,0.06)",
        focus: "0 0 0 3px rgb(var(--brand-500) / 0.35)",
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, rgb(var(--grad-from)) 0%, rgb(var(--grad-via)) 55%, rgb(var(--grad-to)) 100%)",
        "brand-gradient-soft":
          "linear-gradient(135deg, rgb(var(--brand-500) / 0.16) 0%, rgb(var(--accent-500) / 0.14) 100%)",
        "surface-gradient": "linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.01) 100%)",
      },
      backdropBlur: {
        glass: "16px",
      },
      // Motion tokens (mirrored as CSS variables in index.css and lib/motion.js)
      transitionDuration: {
        fast: "120ms",
        base: "200ms",
        slow: "320ms",
        slower: "480ms",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(0.2, 0, 0, 1)",
        emphasized: "cubic-bezier(0.16, 1, 0.3, 1)",
        exit: "cubic-bezier(0.4, 0, 1, 1)",
      },
      scale: {
        press: "0.97",
      },
      // Entrances end on transform: none so, once finished, they leave no
      // transform behind (a transform would trap position: fixed children).
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        fadeUp: {
          "0%": { opacity: 0, transform: "translateY(8px)" },
          "100%": { opacity: 1, transform: "none" },
        },
        popIn: {
          "0%": { opacity: 0, transform: "translateY(-4px) scale(0.98)" },
          "100%": { opacity: 1, transform: "none" },
        },
        slideInRight: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "none" },
        },
        slideInUp: {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "none" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s infinite",
        fadeUp: "fadeUp 320ms cubic-bezier(0.16, 1, 0.3, 1) both",
        enter: "fadeUp 320ms cubic-bezier(0.16, 1, 0.3, 1) both", // page entrance
        pop: "popIn 160ms cubic-bezier(0.16, 1, 0.3, 1) both", // menus, tooltips
        "drawer-right": "slideInRight 320ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "sheet-up": "slideInUp 320ms cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [],
};
