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
          primary: "#194b31", // dark green (main bg, hero)
          secondary: "#113723", // darker green (header, footer)
          tertiary: "#1e5c3a", // hover states on dark bg
          light: "#f7fff8", // near-white (experiment list section)
          mint: "#cff7d3", // mint (recent activity band)
          active: "rgba(20,174,92,0.1)", // active nav item bg
          overlay: "rgba(255,255,255,0.2)", // subtle white overlay on dark sections
        },
        text: {
          primary: "#cff7d3", // light mint on dark bg
          secondary: "#78ffb7", // brighter mint, secondary on dark
          muted: "#4d9a60", // muted on dark bg
          dark: "#194b31", // dark text for light sections
          "dark-secondary": "#2d6b47", // secondary text on light sections
          logo: "#f5f5f5", // logo/wordmark text
        },
        border: "rgba(20,174,92,0.2)",
        "border-dark": "#194b31", // border on light sections
        accent: {
          primary: "#14ae5c", // green
          secondary: "#0e8a49",
        },
        success: "#3ecf8e",
        warning: "#f0c060",
        error: "#f87171",
        score: {
          5: "#3ecf8e", // success green
          4: "#a3e635", // lime
          3: "#f0c060", // warning yellow
          2: "#fb923c", // orange
          1: "#f87171", // error red
        },
      },
      fontFamily: {
        mono: [
          "'SF Mono'",
          "'Monaco'",
          "'Inconsolata'",
          "'Fira Code'",
          "monospace",
        ],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        heading: ["var(--font-fraunces)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
  darkMode: "class",
};

export default config;
