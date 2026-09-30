// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Light mode (default)
        bg: '#f7f8fc',
        surface: '#ffffff', 
        'surface-hover': '#f0eff8',
        text: '#242039',
        'text-muted': '#706b82',
        border: '#e4e1ee',
        'accent-start': '#6d28d9',
        'accent-end': '#a855f7',
        primary: '#6d28d9',
        'primary-pressed': '#581c87',
        'primary-soft': '#ede9fe',
        violet: '#8b5cf6',
        'violet-soft': '#f3efff',
        ink: '#2e1b4f',
        ocean: '#0f766e',
        'ocean-soft': '#d9f1eb',
        'ocean-deep': '#075e57',
        sun: '#d97706',
        'sun-soft': '#fff4d6',
        berry: '#e05269',
        'berry-soft': '#fde8ed',
        success: '#25855f',
        'success-soft': '#def4e9',
        danger: '#c2415f',
        'danger-soft': '#fbe7eb',
        info: '#3974b8',
        'info-soft': '#e6f0fb',
        mist: '#f1f0f7',
        'message-out': '#ede9fe',
        'message-in': '#ffffff',

        // Dark mode variants (used via dark: prefix)
        'bg-dark': '#171326',
        'surface-dark': '#241b38',
        'surface-hover-dark': '#32254b',
        'text-dark': '#f8f5ff',
        'text-muted-dark': '#b7aecb',
        'border-dark': '#44345d',
        'message-out-dark': '#4a2c79',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        display: ['SpaceGrotesk', 'Inter', 'ui-sans-serif', 'system-ui'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};
