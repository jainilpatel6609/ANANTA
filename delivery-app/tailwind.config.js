export default {
  /** @type {import('tailwindcss').Config} */
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Professional Navy + Refined Gold Brand Palette (Industrial / Heavy-Equipment Grade)
        amber: {
          50: '#fdf6ec',
          100: '#f9e8cc',
          200: '#f1cf94',
          300: '#e6b05c',
          400: '#d5953a',
          500: '#b45309', // Refined Deep Gold -- primary accent, used sparingly for CTAs
          600: '#92400e',
          700: '#78350f',
          800: '#5c2a0c',
          900: '#451a03',
          950: '#2c1002'
        },
        brand: {
          50: '#fdf6ec',
          100: '#f9e8cc',
          200: '#f1cf94',
          300: '#e6b05c',
          400: '#d5953a',
          500: '#b45309',
          600: '#92400e',
          700: '#78350f',
          800: '#5c2a0c',
          900: '#451a03',
          dark: '#0f172a', // Primary Navy
          accent: '#0f172a'
        },
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617'
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        'soft': '0 2px 10px -2px rgba(0, 0, 0, 0.05), 0 1px 4px -1px rgba(0, 0, 0, 0.03)',
        'card': '0 10px 25px -5px rgba(15, 23, 42, 0.06), 0 4px 6px -2px rgba(15, 23, 42, 0.03)',
        'classic': '0 4px 20px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
        'classic-card': '0 10px 30px -5px rgba(0, 0, 0, 0.08)',
        'classic-gold': '0 4px 14px 0 rgba(180, 83, 9, 0.25)'
      }
    },
  },
  plugins: [],
}
