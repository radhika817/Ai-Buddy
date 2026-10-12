/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'Cambria', '"Times New Roman"', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        frame: '28px',
        panel: '24px',
        card: '20px',
        table: '16px',
        input: '12px',
        pill: '9999px',
      },
      colors: {
        // DESIGN.md clean tokens
        canvas: '#CFDCE5',
        frame: '#F6F5F3',
        surface: '#FFFFFF',
        lavender: '#DDD9F0',
        ink: {
          DEFAULT: '#1D1618',
          900: '#1C1917',
          800: '#292524',
          700: '#44403C',
          600: '#57534E',
          500: '#78716C',
        },
        muted: '#6A6468',
        hairline: '#DEDAD6',

        // Canonical status colors from DESIGN.md
        'status-ready': {
          bg: '#E6F3EB',
          text: '#2C5E40',
        },
        'status-analyzing': {
          bg: '#E8F0F8',
          text: '#2E5580',
        },
        'status-failed': {
          bg: '#FBEAE8',
          text: '#9A2D22',
        },
        'status-warning': {
          bg: '#FAF4E8',
          text: '#BE8A2E',
        },

        // Complementary functional tints
        'chip-blue': '#D9E3ED',
        'chat-bubble-ai': '#EDE9F7',

        // Backward compatibility for existing pages until rebuilt
        background: '#090d16',
        paper: {
          50: '#FDFCF9',
          100: '#FAF8F4',
          200: '#F5F2EB',
          300: '#ECE8DF',
        },
        pine: {
          600: '#166534',
          700: '#14532D',
          800: '#15803D',
        },
        accent: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
      },
    },
  },
  plugins: [],
}
