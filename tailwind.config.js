/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ivory: "#FBF7F0",
        terracotta: "#C45D3A",
        terracottaDark: "#A8482E",
        maroonDeep: "#6B2C1F",
        gold: "#F4C463",
        flame: "#DE8E2E",
        charcoal: "#3C332C",
        textMuted: "#8A7F73",
        border: "#EDE4D6",
        cream: "#FBF3EC",
        mandala: "#F4D9B8",
        gradientMid: "#D68A4A",
      },
      fontFamily: {
        serif: ["Fraunces"],
        sans: ["Inter"],
      },
    },
  },
  plugins: [],
};
