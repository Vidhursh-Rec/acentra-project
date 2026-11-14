/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f0f4ff',
          500: '#4f6ef7',
          600: '#3b56e8',
          700: '#2f46cc',
        },
        danger: { DEFAULT: '#ef4444', dark: '#b91c1c' },
        warn: { DEFAULT: '#f59e0b', dark: '#b45309' },
        ok: { DEFAULT: '#10b981', dark: '#065f46' },
      },
    },
  },
  plugins: [],
}
