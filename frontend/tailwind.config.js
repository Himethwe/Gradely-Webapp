/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // roboto condensed default
      fontFamily: {
        sans: ['"Roboto Condensed"', 'sans-serif'],
        handwriting: ['"Shadows Into Light"', 'cursive'],
        serifAccent: ['"Lora"', 'serif'],
      },
      // add color palette
      colors: {
        primary: {
          100: '#0077C2', // Main Brand Blue
          200: '#59a5f5', // Lighter Blue
          300: '#c8ffff', // Pale Blue
        },
        accent: {
          100: '#00BFFF', // Bright Cyan
          200: '#00619a', // Deep Cyan
        },
        text: {
          100: '#333333', // Main Text (Dark)
          200: '#5c5c5c', // Secondary Text (Grey)
        },
        bg: {
          100: '#FFFFFF', // Pure White
          200: '#f5f5f5', // Light Grey Background
          300: '#cccccc', // Darker Grey / Borders
        }
      }
    },
  },
  plugins: [],
}