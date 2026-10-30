/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b', // Dominant Ga South Municipal Crimson (#991B1B)
          900: '#7f1d1d', // Deep Maroon
          950: '#000000', // Secondary Obsidian Black (#000000)
        },
        gasouth: {
          crimson: '#991b1b', // #991B1B
          black: '#000000',   // #000000
          dark: '#0a0a0a',
          maroon: '#7f1d1d',
          gold: '#d97706',
          goldLight: '#fef3c7',
          goldHover: '#b45309',
          sky: '#0284c7',
          skyLight: '#e0f2fe',
          skyBg: '#38bdf8',
          green: '#15803d',
          greenLight: '#dcfce7',
          greenDark: '#166534',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};
