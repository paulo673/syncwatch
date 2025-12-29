/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // Prefix all Tailwind classes to avoid conflicts with YouTube styles
  prefix: "sw-",
  theme: {
    extend: {
      colors: {
        // SyncWatch brand colors
        primary: {
          DEFAULT: "#0ea5e9",
          dark: "#0284c7",
        },
        background: {
          DEFAULT: "#1a1a2e",
          secondary: "#16213e",
        },
      },
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
