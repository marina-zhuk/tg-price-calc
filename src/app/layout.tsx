import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

const description =
  "Витринный Telegram Mini App калькулятор: клиент считает стоимость услуги и оставляет заявку, а владелец получает её в Telegram.";

export const metadata: Metadata = {
  metadataBase: new URL("https://tg-price-calc.vercel.app"),
  title: "Telegram Mini App калькулятор стоимости",
  description,
  openGraph: {
    title: "Telegram Mini App калькулятор стоимости",
    description,
    type: "website",
    locale: "ru_RU",
  },
  twitter: {
    card: "summary",
    title: "Telegram Mini App калькулятор стоимости",
    description,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head>
        {/* Telegram WebApp SDK — должен загрузиться до интерактива. */}
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
