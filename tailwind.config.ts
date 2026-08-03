import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Fondo dark neon (sacortech.xyz)
        ink: {
          950: "#050510",
          900: "#07071a",
          850: "#0a0a20",
          800: "#0f0f2a",
          700: "#171738",
          600: "#20204a",
          500: "#2b2b5e",
        },
        // Accent primario: cyan neón
        brand: {
          50: "#e6feff",
          100: "#b3fbff",
          200: "#80f8ff",
          300: "#4df5ff",
          400: "#22d3ee",
          500: "#00f5ff",
          600: "#06b6d4",
          700: "#0891b2",
          800: "#155e75",
          900: "#164e63",
        },
        violet: {
          400: "#a855f7",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
        },
        pink: {
          400: "#f472b6",
          500: "#ec4899",
          600: "#db2777",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        neon: "0 0 0 1px rgba(0,245,255,0.15), 0 8px 30px -10px rgba(0,245,255,0.25)",
        "neon-violet":
          "0 0 0 1px rgba(124,58,237,0.2), 0 8px 30px -10px rgba(124,58,237,0.35)",
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, #00f5ff 0%, #7c3aed 50%, #ec4899 100%)",
        "brand-gradient-2": "linear-gradient(135deg, #00f5ff 0%, #7c3aed 100%)",
      },
    },
  },
  plugins: [],
} satisfies Config;
