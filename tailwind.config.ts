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
        darkbg: {
          DEFAULT: "#0C0314",
          card: "#170A24",
          elevated: "#231235",
          border: "#351D4D",
          text: "#F5EBE6",
          heading: "#FFF8F0",
          muted: "#A592A4",
        },
        // Legacy fallbacks aliased to warm peach aesthetic
        ink: {
          DEFAULT: "#382A22",
          raised: "#FFF8F0",
          hairline: "#F0E2D2",
        },
        wax: {
          DEFAULT: "#E88B60",
          dim: "#D67448",
        },
        gold: {
          DEFAULT: "#E88B60",
          dim: "#B86640",
        },
        primary: {
          DEFAULT: "#FFE5B4",
          hover: "#FCD34D",
          focus: "#F59E0B",
          foreground: "#382A22",
        },
        peach: {
          DEFAULT: "#FFE5B4",
          text: "#6C4221",
        },
        ivory: "#FFFDF9",
        ash: {
          DEFAULT: "#857367",
          dim: "#A39992",
        },
        success: "#065F46",
        warn: "#713F12",
        danger: "#E88B60",

        // Warm Peach Stationery Palette (#FFE5B4)
        stationery: {
          canvas: "#FFFDF9",
          card: "#FFF8F0",
          border: "#F0E2D2",
          text: "#382A22",
          muted: "#857367",
          wax: {
            DEFAULT: "#E88B60",
            hover: "#D67448",
          },
          peach: {
            DEFAULT: "#FFE5B4",
            text: "#6C4221",
          },
          lavender: {
            DEFAULT: "#FCE7F3",
            text: "#831843",
          },
          sage: {
            DEFAULT: "#D1FAE5",
            text: "#065F46",
          },
          buttercup: {
            DEFAULT: "#FEF08A",
            text: "#713F12",
          },
          skymist: {
            DEFAULT: "#E0F2FE",
            text: "#1E4868",
          },
        },
        // Scrapbook alias for compatibility
        scrapbook: {
          canvas: "#FFFDF9",
          surface: "#FFF8F0",
          border: "#F0E2D2",
          text: "#382A22",
          muted: "#857367",
          coral: {
            DEFAULT: "#E88B60",
            hover: "#D67448",
          },
          lilac: "#FCE7F3",
          yellow: "#FEF08A",
          mint: "#D1FAE5",
          sky: "#E0F2FE",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "var(--font-bn-paper)", "serif"],
        ui: ["var(--font-ui)", "var(--font-bn-ui)", "sans-serif"],
        hand: ["var(--font-hand)", "var(--font-bn-paper)", "cursive", "serif"],
        calligraphy: ["var(--font-calligraphy)", "var(--font-bn-paper)", "cursive", "serif"],
        pencil: ["var(--font-pencil)", "var(--font-bn-paper)", "cursive", "serif"],
        "mono-paper": ["var(--font-mono-paper)", "var(--font-bn-paper)", "monospace"],
        "bn-ui": ["var(--font-bn-ui)", "sans-serif"],
        "bn-paper": ["var(--font-bn-paper)", "serif"],
        "bn-hand-1": ["var(--font-bn-hand-1)", "var(--font-bn-paper)", "cursive", "serif"],
        "bn-hand-2": ["var(--font-bn-hand-2)", "var(--font-bn-ui)", "cursive", "sans-serif"],
        "bn-hand-3": ["var(--font-bn-hand-3)", "var(--font-bn-ui)", "cursive", "sans-serif"],
      },
      borderRadius: {
        input: "1rem",
        btn: "9999px",
        card: "1.5rem",
        envelope: "1.75rem",
      },
      boxShadow: {
        modal: "0 20px 48px -16px rgba(70, 48, 32, 0.12)",
        hairline: "0 1px 0 rgba(240, 226, 210, 0.6) inset",
        stationery: "0 12px 32px -8px rgba(70, 48, 32, 0.08)",
        "stationery-card": "0 12px 32px -8px rgba(70, 48, 32, 0.08), 0 2px 8px rgba(70, 48, 32, 0.04)",
        scrapbook: "0 12px 32px -8px rgba(70, 48, 32, 0.08)",
        "scrapbook-card": "0 12px 32px -8px rgba(70, 48, 32, 0.08), 0 2px 8px rgba(70, 48, 32, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
