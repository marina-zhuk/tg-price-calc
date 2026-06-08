import { NextResponse } from "next/server";
import { leadSchema } from "@/lib/schema";
import { sendLeadToTelegram } from "@/lib/telegram";
import { calculatePrice } from "@/lib/pricing";
import { pricingConfig } from "@/config/pricing.config";
import { verifyInitData } from "@/lib/telegram-initdata";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import type { CleaningTypeId, UrgencyId } from "@/config/pricing.config";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Анти-спам: ограничиваем число заявок с одного IP.
  const limit = rateLimit(`lead:${clientIp(req)}`);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "Слишком много заявок. Попробуйте позже." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Тело запроса не является валидным JSON" },
      { status: 400 }
    );
  }

  const parsed = leadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const lead = parsed.data;

  // Цена считается ЗАНОВО на сервере по конфигу — клиентским min/max не доверяем.
  const priced = calculatePrice(pricingConfig, {
    type: lead.calc.type as CleaningTypeId,
    area: lead.calc.area,
    urgency: lead.calc.urgency as UrgencyId,
    options: lead.calc.options,
  });

  // Подлинность Telegram-данных (если пришли из Mini App): подпись + свежесть.
  const initCheck = verifyInitData(lead.initData, process.env.TELEGRAM_BOT_TOKEN);

  // Валидный ввод: в демо НИКОГДА не падаем.
  const result = await sendLeadToTelegram(lead, {
    min: priced.min,
    max: priced.max,
    isRepeat: (lead.submissionCount ?? 1) > 1,
    signatureVerified: initCheck.valid,
    user: initCheck.user,
  });

  return NextResponse.json({
    ok: true,
    mock: result.mock,
    delivered: result.ok,
    price: { min: priced.min, max: priced.max },
    signatureVerified: initCheck.valid,
    ...(initCheck.expired ? { signatureExpired: true } : {}),
    ...(result.error ? { deliveryError: result.error } : {}),
  });
}
