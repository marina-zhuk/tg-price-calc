import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Maps to Telegram theme params via CSS variables (see globals.css)
        tg: {
          bg: "var(--tg-bg, #ffffff)",
          text: "var(--tg-text, #111827)",
          hint: "var(--tg-hint, #6b7280)",
          link: "var(--tg-link, #2563eb)",
          button: "var(--tg-button, #2563eb)",
          buttonText: "var(--tg-button-text, #ffffff)",
          secondaryBg: "var(--tg-secondary-bg, #f3f4f6)",
        },
      },
    },
  },
  plugins: [],
};

export default config;
