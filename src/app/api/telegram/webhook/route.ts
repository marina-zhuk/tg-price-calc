/**
 * Telegram webhook: обработка нажатий статуса заявки (callback_query)
 * и команды /start (онбординг + кнопка запуска Mini App).
 *
 * Статус заявки хранится прямо в inline-кнопках сообщения — БД не нужна.
 * Безопасность: проверяем секретный заголовок setWebhook(secret_token).
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";

const API = (method: string) =>
  `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`;

async function tg(method: string, body: Record<string, unknown>) {
  return fetch(API(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function nowMsk(): string {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  }).format(new Date());
}

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://tg-price-calc.vercel.app"
  );
}

export async function POST(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    // Mock-режим: webhook не настроен.
    return NextResponse.json({ ok: true, mock: true });
  }

  // Проверка секрета вебхука.
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const got = req.headers.get("x-telegram-bot-api-secret-token");
    if (got !== secret) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  let update: TgUpdate;
  try {
    update = (await req.json()) as TgUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  try {
    if (update.callback_query) {
      await handleCallback(update.callback_query);
    } else if (update.message?.text?.startsWith("/start")) {
      await handleStart(update.message);
    }
  } catch (err) {
    console.error("[webhook] error:", err);
  }

  // Telegram ждёт 200 на любой апдейт.
  return NextResponse.json({ ok: true });
}

async function handleCallback(cb: TgCallbackQuery) {
  const data = cb.data ?? "";
  const msg = cb.message;
  const who = cb.from.first_name || "—";

  let toast = "Обновлено";
  let keyboard;

  if (data === "status:progress") {
    toast = "🟡 Взято в работу";
    keyboard = {
      inline_keyboard: [
        [
          { text: `🟡 В работе · ${who}`, callback_data: "status:progress" },
          { text: "✅ Обработано", callback_data: "status:done" },
        ],
      ],
    };
  } else if (data === "status:done") {
    toast = "✅ Заявка обработана";
    keyboard = {
      inline_keyboard: [
        [
          {
            text: `✅ Обработано · ${who}, ${nowMsk()}`,
            callback_data: "status:done",
          },
        ],
      ],
    };
  }

  await tg("answerCallbackQuery", { callback_query_id: cb.id, text: toast });

  if (keyboard && msg) {
    await tg("editMessageReplyMarkup", {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      reply_markup: keyboard,
    });
  }
}

async function handleStart(msg: TgMessage) {
  await tg("sendMessage", {
    chat_id: msg.chat.id,
    text:
      "👋 Это калькулятор стоимости клининга.\n\n" +
      "Нажмите кнопку ниже — задайте параметры, узнайте цену сразу и оставьте заявку.",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🧮 Открыть калькулятор", web_app: { url: appUrl() } }],
      ],
    },
  });
}

// ---- Минимальные типы Telegram update ----
interface TgUpdate {
  callback_query?: TgCallbackQuery;
  message?: TgMessage;
}
interface TgCallbackQuery {
  id: string;
  data?: string;
  from: { first_name?: string };
  message?: TgMessage;
}
interface TgMessage {
  message_id: number;
  text?: string;
  chat: { id: number };
}
