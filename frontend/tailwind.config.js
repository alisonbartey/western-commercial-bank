/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Western Commercial Bank Corporate Palette
        navy: {
          DEFAULT: '#0F172A',      // Deep Navy primary
          50: '#F0F4F8',
          100: '#D9E2EC',
          600: '#1E3A5F',
          700: '#0F172A',
          800: '#0B1120',
          900: '#020617'
        },
        slate: {
          DEFAULT: '#64748B',
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B'
        },
        accent: {
          DEFAULT: '#3B82F6',      // Subtle blue accent
          light: '#60A5FA'
        },
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}
