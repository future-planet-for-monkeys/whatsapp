/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        whatsapp: {
          primary: '#075e54',
          secondary: '#128c7e',
          accent: '#25d366',
          'light-bg': '#efeae2',
          'chat-bg': '#e5ddd5',
          'bubble-out': '#d9fdd3',
          'bubble-in': '#ffffff',
          'header-bg': '#075e54',
          'input-bg': '#f0f2f5',
        },
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
      screens: {
        xs: '320px',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};