/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      screens: {
        xs: "420px",
      },
      colors: {
        // Page and surface layers, darkest to lightest (deep navy)
        ink: {
          950: "#05070F",
          900: "#090D1A",
          850: "#0D1324",
          800: "#121A30",
          700: "#1B2541",
          600: "#283454",
        },
        // Primary accent. Values come from CSS variables so the five colour
        // themes (src/lib/theme.js, index.css) can swap them at runtime.
        brand: {
          200: "rgb(var(--brand-200) / <alpha-value>)",
          300: "rgb(var(--brand-300) / <alpha-value>)",
          400: "rgb(var(--brand-400) / <alpha-value>)",
          500: "rgb(var(--brand-500) / <alpha-value>)",
          600: "rgb(var(--brand-600) / <alpha-value>)",
          700: "rgb(var(--brand-700) / <alpha-value>)",
        },
        // Secondary accent, also themed
        accent: {
          200: "rgb(var(--accent-200) / <alpha-value>)",
          300: "rgb(var(--accent-300) / <alpha-value>)",
          400: "rgb(var(--accent-400) / <alpha-value>)",
          500: "rgb(var(--accent-500) / <alpha-value>)",
          600: "rgb(var(--accent-600) / <alpha-value>)",
          700: "rgb(var(--accent-700) / <alpha-value>)",
        },
        // Text and icons drawn on a solid brand fill (white or near-black,
        // whichever reads better on that theme's accent)
        "on-brand": "rgb(var(--on-brand) / <alpha-value>)",
        "on-accent": "rgb(var(--on-accent) / <alpha-value>)",
        // Errors and destructive actions
        danger: {
          300: "#FDA4AF",
          400: "#FB7185",
          500: "#F43F5E",
          600: "#E11D48",
        },
        // Warnings and "attention" states
        gold: {
          400: "#FCD34D",
          500: "#F5B83D",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        display: ["Outfit", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.05) inset, 0 18px 40px -20px rgba(0,0,0,0.85)",
        glow: "0 10px 30px -10px rgb(var(--brand-500) / 0.6)",
        "glow-accent": "0 10px 30px -10px rgb(var(--accent-500) / 0.55)",
        "inner-line": "inset 0 0 0 1px rgba(255,255,255,0.06)",
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, rgb(var(--grad-from)) 0%, rgb(var(--grad-via)) 55%, rgb(var(--grad-to)) 100%)",
        "brand-gradient-soft":
          "linear-gradient(135deg, rgb(var(--brand-500) / 0.16) 0%, rgb(var(--accent-500) / 0.14) 100%)",
        "surface-gradient": "linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.01) 100%)",
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        fadeUp: {
          "0%": { opacity: 0, transform: "translateY(8px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s infinite",
        fadeUp: "fadeUp 0.35s ease-out both",
      },
    },
  },
  plugins: [],
};
