import forms from '@tailwindcss/forms'
import defaultTheme from 'tailwindcss/defaultTheme'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', ...defaultTheme.fontFamily.serif],
        body: ['"Manrope"', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        blush: {
          50: '#fff6f9',
          100: '#ffe9f0',
          200: '#ffd3e1',
          300: '#ffb9cf',
          400: '#ff8db1',
          500: '#f06292',
          600: '#e1468a',
          700: '#be2f71',
          800: '#9c275d',
          900: '#7d214c',
        },
        sage: {
          50: '#f3f8f6',
          100: '#e4f1eb',
          200: '#c5e2d3',
          300: '#9ecdb6',
          400: '#6cba92',
          500: '#45a177',
          600: '#348261',
          700: '#2d684f',
          800: '#25513e',
          900: '#1d3f31',
        },
      },
      boxShadow: {
        invitation: '0 20px 60px -20px rgba(16, 24, 40, 0.2)',
      },
      backgroundImage: {
        'hero-texture': "radial-gradient(circle at top left, rgba(255,255,255,0.6), transparent 55%), radial-gradient(circle at bottom right, rgba(240,98,146,0.25), transparent 45%)",
      },
    },
  },
  plugins: [forms],
}
