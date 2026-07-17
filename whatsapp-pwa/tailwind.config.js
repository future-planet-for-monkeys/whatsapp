/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // WhatsApp-like color palette
        whatsapp: {
          teal: '#075E54',
          green: '#128C7E',
          lightGreen: '#25D366',
          blue: '#34B7F1',
          bg: '#ECE5DD',
          chatBg: '#efeae2',
          darkBg: '#111b21',
          darkHeader: '#202c33',
          darkBubbleMe: '#005c4b',
          darkBubbleOther: '#202c33',
        }
      }
    },
  },
  plugins: [],
}
