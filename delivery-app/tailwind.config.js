export default {
  /** @type {import('tailwindcss').Config} */
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Charcoal Black & White Brand Palette -- true neutral monochrome, no blue/navy tint
        // NOTE: this scale is intentionally LIGHT-anchored at 500 (a refined silver-steel),
        // not dark. Dozens of primary CTA buttons app-wide use `bg-amber-500 text-slate-950`
        // (near-black text on top of this color) -- so 500 must stay light enough for that
        // text to read clearly. The genuinely dark charcoal/black tones live at 700-950,
        // used for hover/gradient-deepening, not as text-bearing surfaces.
        amber: {
          50: '#fafafa',
          100: '#f2f2f3',
          200: '#e2e2e4',
          300: '#cbcbce',
          400: '#b3b3b7',
          500: '#9a9a9f', // Refined Silver -- primary accent, used sparingly for CTAs
          600: '#6b6b70',
          700: '#4a4a4e',
          800: '#2c2c2f',
          900: '#18181b',
          950: '#0a0a0b'
        },
        brand: {
          50: '#fafafa',
          100: '#f2f2f3',
          200: '#e2e2e4',
          300: '#cbcbce',
          400: '#b3b3b7',
          500: '#9a9a9f',
          600: '#6b6b70',
          700: '#4a4a4e',
          800: '#2c2c2f',
          900: '#18181b',
          dark: '#18181b', // Primary Charcoal Black
          accent: '#18181b'
        },
        slate: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b'
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
        'classic-gold': '0 4px 14px 0 rgba(154, 154, 159, 0.25)'
      }
    },
  },
  plugins: [],
}
