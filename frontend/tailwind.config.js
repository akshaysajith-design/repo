/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      colors: {
        terminal: {
          bg: '#0d1117',
          surface: '#161b22',
          border: '#30363d',
          text: '#e6edf3',
          muted: '#7d8590',
          green: '#3fb950',
          blue: '#58a6ff',
          yellow: '#d29922',
          red: '#f85149',
          purple: '#bc8cff',
        }
      }
    }
  },
  plugins: []
}
