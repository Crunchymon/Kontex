import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#131315",
        "surface-dim": "#131315",
        "surface-bright": "#39393b",
        "surface-container-lowest": "#0e0e10",
        "surface-container-low": "#1c1b1d",
        "surface-container": "#201f22",
        "surface-container-high": "#2a2a2c",
        "surface-container-highest": "#353437",
        "on-surface": "#e5e1e4",
        "on-surface-variant": "#c2c6d6",
        "inverse-surface": "#e5e1e4",
        "inverse-on-surface": "#313032",
        outline: "#8c909f",
        "outline-variant": "#424754",
        "surface-tint": "#adc6ff",
        primary: "#adc6ff",
        "on-primary": "#002e6a",
        "primary-container": "#4d8eff",
        "on-primary-container": "#00285d",
        "inverse-primary": "#005ac2",
        secondary: "#c0c1ff",
        "on-secondary": "#1000a9",
        "secondary-container": "#3131c0",
        "on-secondary-container": "#b0b2ff",
        tertiary: "#c6c6cf",
        "on-tertiary": "#2f3037",
        "tertiary-container": "#909099",
        "on-tertiary-container": "#282930",
        error: "#ffb4ab",
        "on-error": "#690005",
        "error-container": "#93000a",
        "on-error-container": "#ffdad6",
        "primary-fixed": "#d8e2ff",
        "primary-fixed-dim": "#adc6ff",
        "on-primary-fixed": "#001a42",
        "on-primary-fixed-variant": "#004395",
        "secondary-fixed": "#e1e0ff",
        "secondary-fixed-dim": "#c0c1ff",
        "on-secondary-fixed": "#07006c",
        "on-secondary-fixed-variant": "#2f2ebe",
        "tertiary-fixed": "#e2e1eb",
        "tertiary-fixed-dim": "#c6c6cf",
        "on-tertiary-fixed": "#1a1b22",
        "on-tertiary-fixed-variant": "#45464e",
        background: "#131315",
        "on-background": "#e5e1e4",
        "surface-variant": "#353437",
        success: "#10b981",
        warning: "#f59e0b"
      },
      borderRadius: {
        DEFAULT: "0.125rem",
        lg: "0.25rem",
        xl: "0.5rem",
        full: "9999px"
      },
      spacing: {
        "stack-md": "1rem",
        "stack-lg": "2rem",
        gutter: "1.5rem",
        "stack-xs": "0.25rem",
        "margin-mobile": "1rem",
        "container-max": "1440px",
        "stack-sm": "0.5rem"
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"]
      },
      fontSize: {
        "label-sm": ["11px", { lineHeight: "14px", letterSpacing: "0.02em", fontWeight: "500" }],
        "label-md": ["12px", { lineHeight: "16px", letterSpacing: "0em", fontWeight: "500" }],
        "body-md": ["14px", { lineHeight: "20px", letterSpacing: "-0.01em", fontWeight: "400" }],
        "body-lg": ["16px", { lineHeight: "24px", letterSpacing: "-0.01em", fontWeight: "400" }],
        "headline-md": ["18px", { lineHeight: "24px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-lg": ["24px", { lineHeight: "32px", letterSpacing: "-0.02em", fontWeight: "600" }],
        "headline-xl": ["36px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "600" }],
        "headline-2xl": ["48px", { lineHeight: "56px", letterSpacing: "-0.03em", fontWeight: "700" }],
        "mono-sm": ["12px", { lineHeight: "16px", fontWeight: "400" }]
      }
    }
  },
  plugins: []
};

export default config;
