/**
 * Лёгкий in-memory rate-limit (fixed window) — анти-спам для /api/lead.
 *
 * Ограничение: память не разделяется между serverless-инстансами Vercel,
 * поэтому это защита от бытовых всплесков, а не распределённый лимитер.
 * Для жёсткого контроля — вынести в Upstash Redis / Vercel KV (апсейл).
 */

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Секунд до сброса окна (для заголовка Retry-After). */
  retryAfter: number;
}

export function rateLimit(
  key: string,
  limit = 6,
  windowMs = 60_000
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    maybeCleanup(now);
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count, retryAfter: 0 };
}

/** Достаём IP клиента из заголовков прокси (Vercel ставит x-forwarded-for). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/** Изредка чистим протухшие ключи, чтобы Map не рос бесконечно. */
function maybeCleanup(now: number) {
  if (store.size < 1000) return;
  store.forEach((v, k) => {
    if (now >= v.resetAt) store.delete(k);
  });
}

/** Только для тестов. */
export function __resetRateLimit() {
  store.clear();
}
