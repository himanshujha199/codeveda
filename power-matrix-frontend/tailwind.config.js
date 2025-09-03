/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html","./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // fill these after I sample from your screenshots
        brand: {
          DEFAULT: "#4f46e5", // primary
          dark: "#3b34b2",
          light: "#6366f1",
        },
        bg: {
          DEFAULT: "#0b0b12",
          surface: "#12121a",
          muted: "#1a1a22",
          border: "#232334",
        },
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
      },
      boxShadow: {
        soft: "0 10px 30px rgba(0,0,0,0.25)",
      },
    },
  },
  plugins: [],
};
