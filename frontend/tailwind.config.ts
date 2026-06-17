import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#0a0a0a",
        "canvas-soft": "#1a1c20",
        "canvas-card": "#191919",
        "canvas-mid": "#363a3f",
        hairline: "#212327",
        ink: "#ffffff",
        "ink-hover": "#fafaf7",
        body: "#dadbdf",
        "body-mid": "#7d8187",
        "accent-sunset": "#ff7a17",
        "accent-sunset-soft": "#ffc285",
        "accent-dusk": "#7c3aed",
        "accent-twilight": "#c4b5fd",
        "accent-breeze": "#a0c3ec",
        "accent-midnight": "#0d1726"
      },
      fontFamily: {
        display: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "Geist Mono", "monospace"]
      },
      letterSpacing: {
        "display-xl": "-2.4px",
        "display-lg": "-1.8px",
        "display-md": "-1.2px",
        "display-sm": "-0.6px",
        "mono": "1.4px",
        "mono-sm": "1.2px"
      },
      borderRadius: {
        sm: "8px",
        pill: "9999px"
      }
    }
  },
  plugins: []
};

export default config;
