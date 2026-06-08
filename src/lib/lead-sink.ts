/**
 * Точка расширения для ХРАНЕНИЯ заявок (намеренно не реализовано сейчас).
 *
 * Как подключаем Google Sheets:
 *   1. В таблице: Расширения → Apps Script — пишем небольшой скрипт (doPost),
 *      который дописывает строку с заявкой.
 *   2. Публикуем скрипт как веб-приложение → Google выдаёт URL.
 *   3. Кладём этот URL в env GOOGLE_SHEETS_URL — и функция ниже шлёт на него
 *      данные каждой заявки. Кода в проекте больше менять не нужно.
 *
 * Альтернативы, если понадобится: Vercel KV / Upstash Redis или Postgres/Supabase.
 *
 * Вызывается из /api/lead ПОСЛЕ серверного пересчёта цены. Не должно ронять
 * ответ клиенту: любые ошибки логируем и проглатываем.
 */

import type { LeadInput } from "@/lib/schema";

export interface LeadRecord {
  lead: LeadInput;
  price: { min: number; max: number };
  signatureVerified: boolean;
  receivedAt: string; // ISO
}

export async function persistLead(record: LeadRecord): Promise<void> {
  const url = process.env.GOOGLE_SHEETS_URL;
  if (!url) {
    // Хранилище не подключено — штатно ничего не делаем (заявка ушла в Telegram).
    return;
  }

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
  } catch (err) {
    // Не мешаем основному потоку: лид уже доставлен владельцу в Telegram.
    console.error("[lead-sink] persist failed:", err);
  }
}
