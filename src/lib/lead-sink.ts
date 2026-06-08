/**
 * Точка расширения для ХРАНЕНИЯ заявок (намеренно не реализовано сейчас).
 *
 * Где лучше всего сделать: Google Apps Script Web App → Google Sheets.
 * Это самый дешёвый и быстрый способ без БД и серверов:
 *   1. В Google Sheets: Расширения → Apps Script → опубликовать как Web App
 *      (doPost, который пишет строку в таблицу), получить URL.
 *   2. Добавить env GOOGLE_APPS_SCRIPT_WEBHOOK_URL.
 *   3. В функции ниже сделать fetch(url, { method: "POST", body: JSON ... }).
 *
 * Альтернативы: Vercel KV / Upstash Redis (быстрый ключ-значение),
 * Postgres/Supabase (если нужны выборки и статусы в БД).
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
  const url = process.env.GOOGLE_APPS_SCRIPT_WEBHOOK_URL;
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
