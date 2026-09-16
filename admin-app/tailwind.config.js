/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Classic Architectural Gold / Warm Brass (Refined, premium, non-garish)
        amber: {
          50: '#faf8f5',
          100: '#f4ede2',
          200: '#e6dbca',
          300: '#d5c4aa',
          400: '#c5aa7b', // Elegant Champagne Gold
          500: '#b28e4e', // Classic Warm Gold / Brass
          600: '#99763a', // Deep Rich Gold
          700: '#7a5a29',
          800: '#5e431c',
          900: '#422f12',
          950: '#261908'
        },
        brand: {
          50: '#faf8f5',
          100: '#f4ede2',
          200: '#e6dbca',
          300: '#d5c4aa',
          400: '#c5aa7b',
          500: '#b28e4e', // Classic Warm Gold / Brass
          600: '#99763a',
          700: '#7a5a29',
          800: '#5e431c',
          900: '#422f12',
          dark: '#0f172a',
          accent: '#1e3a8a' // Classic Royal / Navy Blue
        },
        // Deep executive slate canvas (soft on eyes, no pitch-black harsh contrast)
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
          900: '#111827',
          950: '#0b0f19'
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        'classic': '0 4px 20px -2px rgba(0, 0, 0, 0.4), 0 2px 6px -1px rgba(0, 0, 0, 0.2)',
        'classic-card': '0 10px 30px -5px rgba(0, 0, 0, 0.35)',
        'classic-gold': '0 4px 14px 0 rgba(178, 142, 78, 0.25)'
      }
    },
  },
  plugins: [],
}
