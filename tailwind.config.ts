import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // TODO: add more colors, fonts, etc as needed
  theme: {
    extend: {
      colors: {
        fileRed: '#C71408',
        fileOrange: '#C76408',
        fileBlue: '#0877C7',
        fileLightTeal: '#08C79A',
        fileGreen: '#0CC708',
        accentPrimary: '#00A3FF',
        accentSecondary: '#03ADAE',
        bgPrimary: '#1A111F',
        bgSecondary: '#130E16',
        textPrimary: '#FFFFFF',
        textSecondary: '#BFBFBF',
      },
      fontFamily: {
        sans: ['Inter'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
};
export default config;
