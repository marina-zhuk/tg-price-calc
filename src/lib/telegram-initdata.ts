/**
 * Проверка подлинности Telegram WebApp initData (HMAC-SHA256) и парсинг
 * пользователя. Спецификация:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * Алгоритм:
 *   secret_key   = HMAC_SHA256(key="WebAppData", data=bot_token)
 *   data_check   = отсортированные по ключу пары "k=v", кроме hash, через \n
 *   expected     = HMAC_SHA256(key=secret_key, data=data_check) в hex
 *   валидно, если expected === hash
 */

import crypto from "crypto";

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface InitDataResult {
  valid: boolean;
  user?: TelegramUser;
  /** true, если initData отсутствует (обычный браузер / демо без Telegram). */
  absent: boolean;
}

export function verifyInitData(
  initData: string | undefined,
  botToken: string | undefined
): InitDataResult {
  if (!initData) return { valid: false, absent: true };
  if (!botToken) {
    // Нет токена (mock-режим): подпись проверить нечем, но user попробуем достать.
    return { valid: false, absent: false, user: parseUser(initData) };
  }

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return { valid: false, absent: false };

    const pairs: string[] = [];
    params.forEach((value, key) => {
      if (key !== "hash") pairs.push(`${key}=${value}`);
    });
    pairs.sort();
    const dataCheckString = pairs.join("\n");

    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();
    const expected = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    const valid =
      expected.length === hash.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hash));

    return { valid, absent: false, user: parseUser(initData) };
  } catch {
    return { valid: false, absent: false };
  }
}

function parseUser(initData: string): TelegramUser | undefined {
  try {
    const raw = new URLSearchParams(initData).get("user");
    if (!raw) return undefined;
    const u = JSON.parse(raw) as TelegramUser;
    return typeof u?.id === "number" ? u : undefined;
  } catch {
    return undefined;
  }
}
