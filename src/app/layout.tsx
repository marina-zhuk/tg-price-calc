import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

const description =
  "Telegram Mini App: рассчитайте стоимость уборки и оставьте заявку за минуту.";

export const metadata: Metadata = {
  title: "Калькулятор стоимости клининга",
  description,
  openGraph: {
    title: "Калькулятор стоимости клининга",
    description,
    type: "website",
    locale: "ru_RU",
  },
  twitter: {
    card: "summary",
    title: "Калькулятор стоимости клининга",
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
