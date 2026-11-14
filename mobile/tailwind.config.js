/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // Tokens from design-carebridge.md
      colors: {
        brand: { DEFAULT: "#16a34a", dark: "#15803d" },
        ink: "#111827",
        muted: "#6b7280",
        line: "#e5e7eb",
        surface: "#f9fafb",
        alert: "#dc2626",
        warn: "#d97706",
      },
    },
  },
  plugins: [],
};
