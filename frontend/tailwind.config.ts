import type { Config } from 'tailwindcss';

// WCT River Observatories — design tokens (authoritative WCT brand reference).
// Primary WCT green #007F40 · body text #444444 · white background
// light surfaces #F7FAFC / #EDF2F7 · borders #E5E7EB · Open Sans.
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#FFFFFF',
        foreground: '#444444',
        heading: '#333333',
        muted: { DEFAULT: '#F7FAFC', foreground: '#667085' },
        surface: '#EDF2F7',
        border: '#E5E7EB',
        input: '#D1D5DB',
        ring: '#007F40',
        primary: { DEFAULT: '#007F40', foreground: '#FFFFFF', dark: '#006B36' },
        brand: {
          50: '#E8F5EE',
          100: '#CFE9DA',
          200: '#A6D5BC',
          300: '#74BD97',
          400: '#3F9A6B',
          500: '#007F40',
          600: '#006B36',
          700: '#00592E',
          800: '#004827',
          900: '#003B20',
        },
        accent: { DEFAULT: '#007F40', foreground: '#FFFFFF' },
        destructive: { DEFAULT: '#B3261E', foreground: '#FFFFFF' },
        card: { DEFAULT: '#FFFFFF', foreground: '#444444' },
        'wct-green': {
          50: '#E8F5EE',
          100: '#CFE9DA',
          200: '#A6D5BC',
          300: '#74BD97',
          400: '#3F9A6B',
          500: '#007F40',
          600: '#006B36',
          700: '#00592E',
          800: '#004827',
          900: '#003B20',
        },
      },
      borderRadius: { lg: '0.5rem', md: '0.375rem', sm: '0.25rem' },
      fontFamily: {
        sans: ['"Open Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.05)',
        soft: '0 1px 3px rgba(16, 24, 40, 0.07)',
      },
    },
  },
  plugins: [],
};

export default config;
