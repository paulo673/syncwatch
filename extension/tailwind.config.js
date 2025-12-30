/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  //important: "#syncwatch-root",
  // Prefix is configured via CSS: @import "tailwindcss" prefix(sw);
  theme: {
    extend: {
      animation: {
        "message-in": "message-in 0.2s ease-out",
        "typing-dot": "typing-dot 1.4s infinite ease-in-out",
      },
      keyframes: {
        "message-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "typing-dot": {
          "0%, 60%, 100%": { transform: "translateY(0)", opacity: "0.4" },
          "30%": { transform: "translateY(-4px)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
}
