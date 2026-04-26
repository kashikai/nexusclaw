/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'nc-bg': '#131313',
        'nc-surface': '#201f1f',
        'nc-surface-hi': '#2a2a2a',
        'nc-surface-dim': '#0e0e0e',
        'nc-blue': '#abc7ff',
        'nc-cyan': '#00eefc',
        'nc-purple': '#f6adff',
        'nc-pink': '#e04cff',
        'nc-error': '#ffb4ab',
      },
      fontFamily: {
        headline: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
