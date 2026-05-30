/**
 * Отправка уведомления владельцу через Telegram Bot API.
 * Если токен/chat_id не заданы — работаем в mock-режиме (лог в консоль).
 * Цена в сообщении — серверная (пересчитана в route.ts), а не из запроса клиента.
 */

import type { LeadInput } from "@/lib/schema";
import type { TelegramUser } from "@/lib/telegram-initdata";
import { pricingConfig } from "@/config/pricing.config";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function labelForType(id: string): string {
  return pricingConfig.cleaningTypes.find((t) => t.id === id)?.label ?? id;
}

function labelForUrgency(id: string): string {
  return pricingConfig.urgency.find((u) => u.id === id)?.label ?? id;
}

function labelForOption(id: string): string {
  return pricingConfig.options.find((o) => o.id === id)?.label ?? id;
}

function userLine(user?: TelegramUser, verified?: boolean): string | null {
  if (!user) return null;
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
  const uname = user.username ? ` @${escapeHtml(user.username)}` : "";
  const mark = verified ? "✅ подпись проверена" : "⚠️ подпись не проверена";
  return `🆔 <b>TG:</b> ${escapeHtml(name || String(user.id))}${uname} (${mark})`;
}

export interface LeadMessageMeta {
  /** Серверно пересчитанная вилка цены. */
  min: number;
  max: number;
  /** Повторная (исправленная) заявка в рамках сессии. */
  isRepeat: boolean;
  /** Подпись initData валидна. */
  signatureVerified: boolean;
  user?: TelegramUser;
}

export function buildLeadMessage(lead: LeadInput, meta: LeadMessageMeta): string {
  const { name, phone, comment, calc } = lead;
  const optionLabels =
    calc.options.length > 0 ? calc.options.map(labelForOption).join(", ") : "—";

  const header = meta.isRepeat
    ? "🔁 <b>Повторная (исправленная) заявка — клининг</b>"
    : "🧾 <b>Новая заявка (клининг)</b>";

  const lines: (string | null)[] = [
    header,
    "",
    `👤 <b>Имя:</b> ${escapeHtml(name)}`,
    `📞 <b>Телефон:</b> ${escapeHtml(phone)}`,
    `💬 <b>Комментарий:</b> ${comment ? escapeHtml(comment) : "—"}`,
    userLine(meta.user, meta.signatureVerified),
    "",
    `🧹 <b>Тип уборки:</b> ${escapeHtml(labelForType(calc.type))}`,
    `📐 <b>Площадь:</b> ${calc.area} м²`,
    `⚡ <b>Срочность:</b> ${escapeHtml(labelForUrgency(calc.urgency))}`,
    `➕ <b>Доп-опции:</b> ${escapeHtml(optionLabels)}`,
    "",
    `💰 <b>Итог:</b> ≈ ${meta.min.toLocaleString("ru-RU")}–${meta.max.toLocaleString(
      "ru-RU"
    )} ${pricingConfig.currency}`,
  ];

  return lines.filter((l) => l !== null).join("\n");
}

/** Inline-кнопки статуса заявки для владельца (состояние живёт в сообщении). */
export function statusKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "🟡 В работе", callback_data: "status:progress" },
        { text: "✅ Обработано", callback_data: "status:done" },
      ],
    ],
  };
}

export interface SendResult {
  ok: boolean;
  mock: boolean;
  error?: string;
}

export async function sendLeadToTelegram(
  lead: LeadInput,
  meta: LeadMessageMeta
): Promise<SendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const message = buildLeadMessage(lead, meta);

  // Mock-режим: секретов нет — логируем и считаем успехом.
  if (!token || !chatId) {
    console.log("[lead:mock] TELEGRAM_BOT_TOKEN/CHAT_ID не заданы. Payload:");
    console.log(message);
    return { ok: true, mock: true };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: statusKeyboard(),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[lead:telegram] sendMessage failed:", res.status, body);
      // В демо не падаем: лид валиден, просто доставка не удалась.
      return { ok: false, mock: false, error: `Telegram API ${res.status}` };
    }

    return { ok: true, mock: false };
  } catch (err) {
    console.error("[lead:telegram] network error:", err);
    return {
      ok: false,
      mock: false,
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}
