"use client";

import { useEffect, useState } from "react";
import type { TelegramWebApp } from "@/lib/telegram-webapp";

export interface UseTelegramResult {
  /** Готов ли SDK (мы внутри Telegram). */
  isTelegram: boolean;
  webApp: TelegramWebApp | null;
}

/**
 * Инициализация Telegram WebApp:
 * - .ready() и .expand(),
 * - применение themeParams к CSS-переменным (см. globals.css / tailwind.config).
 * Если SDK нет (обычный браузер) — isTelegram = false, рендерим обычный UI.
 */
export function useTelegram(): UseTelegramResult {
  const [isTelegram, setIsTelegram] = useState(false);
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);

  useEffect(() => {
    const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;
    if (!tg) return;

    // telegram-web-app.js создаёт WebApp-заглушку и в обычном браузере.
    // Реальный Telegram отличаем по непустому initData или известной платформе
    // (вне Telegram platform === "unknown"). Иначе — обычный браузерный режим.
    const inTelegram =
      (typeof tg.initData === "string" && tg.initData.length > 0) ||
      (typeof tg.platform === "string" && tg.platform !== "unknown");

    tg.ready();
    applyTheme(tg);

    if (!inTelegram) return; // обычный браузер: рендерим обычную кнопку отправки

    tg.expand();
    setWebApp(tg);
    setIsTelegram(true);
  }, []);

  return { isTelegram, webApp };
}

function applyTheme(tg: TelegramWebApp) {
  const p = tg.themeParams || {};
  const root = document.documentElement;
  const set = (name: string, value?: string) => {
    if (value) root.style.setProperty(name, value);
  };
  set("--tg-bg", p.bg_color);
  set("--tg-text", p.text_color);
  set("--tg-hint", p.hint_color);
  set("--tg-link", p.link_color);
  set("--tg-button", p.button_color);
  set("--tg-button-text", p.button_text_color);
  set("--tg-secondary-bg", p.secondary_bg_color);
}
