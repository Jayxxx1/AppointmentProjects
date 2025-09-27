/** @type {import('tailwindcss').Config} */

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", 
    "./src/components/**/*.{js,ts,jsx,tsx}", 
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        mitr: ['Mitr', 'sans-serif'],
        sans: ['Mitr', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
}