/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        primary: ["'Primary'", 'sans-serif'],
        display: ["'Display'", 'sans-serif'],
        mono: ["'Mono'", 'monospace'],
      },
    },
  },
  plugins: [],
};
