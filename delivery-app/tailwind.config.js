export default {
  /** @type {import('tailwindcss').Config} */
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Black & Gold Luxury Brand Palette -- solid near-black surfaces (see `slate`)
        // paired with a rich, warm gold accent. Unlike a neutral gray, a saturated gold
        // hue at moderate lightness reads clearly both as light-on-dark accent text
        // (sidebars, badges) AND as a button/hero-banner background with dark text on
        // top -- so, unlike the earlier monochrome pass, one scale can serve both roles.
        amber: {
          50: '#fdf8ec',
          100: '#faedc7',
          200: '#f3da8e',
          300: '#eac15a',
          400: '#dca83a',
          500: '#c9a227', // Rich Gold -- primary accent
          600: '#a9841e',
          700: '#816417',
          800: '#5c4712',
          900: '#3a2c0c',
          950: '#211904'
        },
        brand: {
          50: '#fdf8ec',
          100: '#faedc7',
          200: '#f3da8e',
          300: '#eac15a',
          400: '#dca83a',
          500: '#c9a227',
          600: '#a9841e',
          700: '#816417',
          800: '#5c4712',
          900: '#3a2c0c',
          dark: '#0a0a0a', // Primary Black
          accent: '#0a0a0a'
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
        'classic-gold': '0 4px 14px 0 rgba(201, 162, 39, 0.25)'
      }
    },
  },
  plugins: [],
}
