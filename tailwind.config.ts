import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FAFAF8",
        surface: "#FFFFFF",
        primary: {
          DEFAULT: "#5A8A6E",
          hover: "#4A7A5E",
          foreground: "#FFFFFF",
        },
        accent: {
          DEFAULT: "#A8C5B2",
          foreground: "#2D3B35",
        },
        muted: {
          DEFAULT: "#8A9A8E",
          foreground: "#8A9A8E",
        },
        border: "#E8EDE9",
        destructive: {
          DEFAULT: "#D97B6C",
          foreground: "#FFFFFF",
        },
        warning: {
          DEFAULT: "#D4A853",
          foreground: "#FFFFFF",
        },
        text: {
          DEFAULT: "#2D3B35",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#2D3B35",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#2D3B35",
        },
        secondary: {
          DEFAULT: "#F0F4F1",
          foreground: "#2D3B35",
        },
        input: "#E8EDE9",
        ring: "#5A8A6E",
        foreground: "#2D3B35",
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
        xl: "0.75rem",
        "2xl": "1rem",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgba(45, 59, 53, 0.05)",
        DEFAULT: "0 1px 3px 0 rgba(45, 59, 53, 0.1), 0 1px 2px -1px rgba(45, 59, 53, 0.1)",
        md: "0 4px 6px -1px rgba(45, 59, 53, 0.1), 0 2px 4px -2px rgba(45, 59, 53, 0.1)",
        lg: "0 10px 15px -3px rgba(45, 59, 53, 0.1), 0 4px 6px -4px rgba(45, 59, 53, 0.1)",
      },
    },
  },
  plugins: [],
};

export default config;
