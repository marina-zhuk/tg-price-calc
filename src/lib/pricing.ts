/**
 * Чистая функция расчёта стоимости клининга.
 * Зависит только от (config, input) → { min, max, breakdown }.
 * Никакой niche-специфики тут нет — всё берётся из pricing.config.ts.
 */

import type {
  PricingConfig,
  CleaningTypeId,
  UrgencyId,
} from "@/config/pricing.config";

export interface CalcInput {
  type: CleaningTypeId;
  area: number;
  urgency: UrgencyId;
  options: string[]; // выбранные id доп-опций
}

export interface BreakdownItem {
  label: string;
  amount: number;
}

export interface CalcResult {
  min: number;
  max: number;
  breakdown: BreakdownItem[];
  appliedMinOrder: boolean;
}

/**
 * total = ставка[тип] * площадь * коэф_срочности + сумма выбранных опций
 * затем минимальный заказ (если total < minOrder → minOrder).
 * min = round(total), max = round(total * maxMultiplier).
 */
export function calculatePrice(
  config: PricingConfig,
  input: CalcInput
): CalcResult {
  const cleaningType =
    config.cleaningTypes.find((t) => t.id === input.type) ??
    config.cleaningTypes[0];

  const urgency =
    config.urgency.find((u) => u.id === input.urgency) ?? config.urgency[0];

  const safeArea = Number.isFinite(input.area) && input.area > 0 ? input.area : 0;

  const breakdown: BreakdownItem[] = [];

  // Базовая стоимость уборки
  const baseAmount = cleaningType.ratePerSqm * safeArea;
  breakdown.push({
    label: `${cleaningType.label}: ${cleaningType.ratePerSqm} ₽/м² × ${safeArea} м²`,
    amount: baseAmount,
  });

  // Срочность (показываем только если есть наценка)
  const baseWithUrgency = baseAmount * urgency.multiplier;
  if (urgency.multiplier !== 1) {
    breakdown.push({
      label: `Срочность «${urgency.label}» (×${urgency.multiplier})`,
      amount: baseWithUrgency - baseAmount,
    });
  }

  // Доп-опции
  let optionsSum = 0;
  for (const optId of input.options) {
    const opt = config.options.find((o) => o.id === optId);
    if (opt) {
      optionsSum += opt.price;
      breakdown.push({ label: opt.label, amount: opt.price });
    }
  }

  let total = baseWithUrgency + optionsSum;

  // Минимальный заказ
  let appliedMinOrder = false;
  if (total < config.minOrder) {
    appliedMinOrder = true;
    breakdown.push({
      label: `Доплата до минимального заказа (${config.minOrder} ₽)`,
      amount: config.minOrder - total,
    });
    total = config.minOrder;
  }

  const min = Math.round(total);
  const max = Math.round(total * config.maxMultiplier);

  return { min, max, breakdown, appliedMinOrder };
}
