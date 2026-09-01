import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0A0D12",
          surface: "#12161D",
          raised: "#171C24",
          overlay: "#1C222C"
        },
        line: {
          DEFAULT: "#232933",
          subtle: "#1A1F28"
        },
        ink: {
          DEFAULT: "#E6E9EF",
          muted: "#9198A8",
          faint: "#5B6472"
        },
        brand: {
          DEFAULT: "#4DD8C0",
          dim: "#2B7A6D",
          bright: "#7CF2DA"
        },
        indigo: {
          DEFAULT: "#5B7CFA"
        },
        status: {
          critical: "#F2506B",
          high: "#F5934D",
          medium: "#F0C94D",
          low: "#4DD8C0",
          unknown: "#5B6472"
        }
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"]
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.02), 0 8px 24px -12px rgba(0,0,0,0.6)"
      },
      keyframes: {
        pulse_line: {
          "0%": { strokeDashoffset: "240" },
          "100%": { strokeDashoffset: "0" }
        },
        fade_up: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        pulse_line: "pulse_line 2.4s linear infinite",
        fade_up: "fade_up 0.5s ease forwards"
      }
    }
  },
  plugins: []
};

export default config;
