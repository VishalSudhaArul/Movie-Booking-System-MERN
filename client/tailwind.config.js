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
        // Primary accent: electric blue
        brand: {
          200: "#BFE0FF",
          300: "#8CC8FF",
          400: "#4DA8FF",
          500: "#1E8CFF",
          600: "#0A6FE0",
          700: "#0857B3",
        },
        // Secondary accent: violet
        accent: {
          200: "#DDD6FE",
          300: "#C4B5FD",
          400: "#A78BFA",
          500: "#8B5CF6",
          600: "#7C3AED",
          700: "#6D28D9",
        },
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
        glow: "0 10px 30px -10px rgba(30,140,255,0.6)",
        "glow-accent": "0 10px 30px -10px rgba(139,92,246,0.55)",
        "inner-line": "inset 0 0 0 1px rgba(255,255,255,0.06)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #1E8CFF 0%, #6D5CF6 55%, #8B5CF6 100%)",
        "brand-gradient-soft":
          "linear-gradient(135deg, rgba(30,140,255,0.16) 0%, rgba(139,92,246,0.14) 100%)",
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
