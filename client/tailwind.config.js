/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      screens: {
        xs: "420px",
      },
      colors: {
        // Page and surface layers, darkest to lightest
        ink: {
          950: "#07080C",
          900: "#0B0D13",
          850: "#10131B",
          800: "#161A24",
          700: "#1F2430",
          600: "#2B3140",
        },
        // Primary accent
        brand: {
          300: "#FF8A90",
          400: "#FF5C66",
          500: "#F5333F",
          600: "#DC1F2E",
          700: "#B31524",
        },
        gold: {
          400: "#F7C55A",
          500: "#EFAF2E",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        display: ["Outfit", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.04) inset, 0 12px 32px -12px rgba(0,0,0,0.7)",
        glow: "0 10px 30px -10px rgba(245,51,63,0.55)",
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
