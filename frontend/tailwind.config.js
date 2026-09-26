/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eefbff',
          100: '#d8f3ff',
          200: '#b8e8ff',
          300: '#87d7ff',
          400: '#4ab6ff',
          500: '#1d8ef2',
          600: '#156ed5',
          700: '#1757ad',
          800: '#1a4b8e',
          900: '#1b3d71',
        },
      },
      boxShadow: {
        soft: '0 20px 45px rgba(15, 23, 42, 0.12)',
      },
    },
  },
  plugins: [],
};
