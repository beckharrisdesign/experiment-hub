import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          primary: "#0d2b2e",
          secondary: "#112f33",
          tertiary: "#163538",
        },
        text: {
          primary: "#c8dde0",
          secondary: "#7ab8be",
          muted: "#4d8a90",
        },
        border: "#1e3f43",
        accent: {
          primary: "#4ecdc4",
          secondary: "#3bb8af",
        },
        success: "#3ecf8e",
        warning: "#f0c060",
        error: "#f87171",
      },
      fontFamily: {
        mono: ["'SF Mono'", "'Monaco'", "'Inconsolata'", "'Fira Code'", "monospace"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
  darkMode: "class",
};

export default config;

