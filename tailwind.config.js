/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#dd1c2e',
          50: '#fef2f3',
          100: '#fde3e5',
          200: '#fac5cb',
          500: '#dd1c2e',
          600: '#c41726',
          700: '#a3131f',
        },
        ink: {
          DEFAULT: '#111827',
          muted: '#6b7280',
          soft: '#9ca3af',
        },
        bg: {
          DEFAULT: '#ffffff',
          soft: '#f9fafb',
        },
        border: {
          DEFAULT: '#e5e7eb',
        },
      },
      spacing: {
        input: '48px',
        button: '48px',
        header: '48px',
      },
      borderRadius: {
        input: '10px',
        card: '12px',
        'card-lg': '16px',
        frame: '28px',
      },
      fontSize: {
        h1: ['24px', { lineHeight: '32px', fontWeight: '700' }],
        h2: ['20px', { lineHeight: '28px', fontWeight: '600' }],
        body: ['16px', { lineHeight: '24px' }],
        caption: ['14px', { lineHeight: '20px' }],
        small: ['12px', { lineHeight: '16px' }],
      },
    },
  },
  plugins: [],
};
