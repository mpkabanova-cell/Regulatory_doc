/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f0ff",
          100: "#ede4ff",
          500: "#8b5cf6",
          600: "#6d3df2",
          700: "#5b2cd8",
        },
      },
      boxShadow: {
        soft: "0 20px 60px rgba(98, 67, 180, 0.12)",
      },
    },
  },
  plugins: [],
};
