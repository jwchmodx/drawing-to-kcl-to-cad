/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        void: '#08090b',
        surface: '#0d1117',
        elevated: '#151b23',
        raised: '#1c232d',
        cyan: '#00d4ff',
        'cyan-dim': '#0099cc',
        orange: '#ff6b35',
        green: '#00ff88',
        red: '#ff3366',
        text: '#e6edf3',
        'text-muted': '#7d8590',
        'text-dim': '#484f58',
        primary: '#00d4ff',
        'background-dark': '#08090b',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        display: ['"Outfit"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
