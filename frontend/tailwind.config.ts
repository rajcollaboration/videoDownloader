import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        border: "hsl(var(--border))",
        card: "hsl(var(--card))",
        accent: "hsl(var(--accent))",
        primary: "hsl(var(--primary))",
        secondary: "hsl(var(--secondary))"
      },
      boxShadow: {
        soft: "0 20px 60px -25px rgba(19, 33, 68, 0.35)",
        glow: "0 0 30px -8px hsl(var(--primary) / 0.45)"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"]
      },
      backgroundImage: {
        mesh: "radial-gradient(circle at top left, rgba(35, 113, 255, 0.22), transparent 35%), radial-gradient(circle at top right, rgba(16, 185, 129, 0.18), transparent 28%), linear-gradient(135deg, rgba(255,255,255,0.96), rgba(245,248,255,0.84))",
        "mesh-dark": "radial-gradient(circle at top left, rgba(35,113,255,0.18), transparent 38%), radial-gradient(circle at bottom right, rgba(16,185,129,0.12), transparent 32%), linear-gradient(135deg, rgba(14,20,40,0.99), rgba(10,15,35,0.97))",
        "shimmer-bar": "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)"
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "200% center" },
          "100%": { backgroundPosition: "-200% center" }
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" }
        },
        "parallax-drift": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(8px, -10px) scale(1.03)" }
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        shimmer: "shimmer 2s linear infinite",
        float: "float 3s ease-in-out infinite",
        "parallax-drift": "parallax-drift 6s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.5s ease-out both"
      }
    }
  },
  plugins: []
};

export default config;
