import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/pages-layer/**/*.{ts,tsx}',
    './src/widgets/**/*.{ts,tsx}',
    './src/features/**/*.{ts,tsx}',
    './src/entities/**/*.{ts,tsx}',
    './src/shared/**/*.{ts,tsx}',
    './src/processes/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0a0a0a',
          50: '#161616',
          100: '#1c1c1c',
          200: '#262626',
          300: '#3a3a3a',
        },
        accent: {
          DEFAULT: '#ffffff',
        },
        yes: {
          DEFAULT: '#3fb950',
          soft: 'rgba(63,185,80,0.12)',
        },
        no: {
          DEFAULT: '#f85149',
          soft: 'rgba(248,81,73,0.12)',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        pill: '9999px',
      },
    },
  },
  plugins: [],
};

export default config;
