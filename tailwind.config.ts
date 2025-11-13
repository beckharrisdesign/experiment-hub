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
          primary: "#0d1117",
          secondary: "#161b22",
          tertiary: "#21262d",
        },
        text: {
          primary: "#c9d1d9",
          secondary: "#8b949e",
          muted: "#6e7681",
        },
        border: "#30363d",
        accent: {
          primary: "#58a6ff",
          secondary: "#79c0ff",
        },
        success: "#3fb950",
        warning: "#d29922",
        error: "#f85149",
      },
      fontFamily: {
        mono: ["'SF Mono'", "'Monaco'", "'Inconsolata'", "'Fira Code'", "monospace"],
        sans: ["-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "sans-serif"],
      },
    },
  },
  plugins: [],
  darkMode: "class",
};

export default config;

