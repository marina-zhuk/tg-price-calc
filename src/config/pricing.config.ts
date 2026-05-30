/**
 * ПРАЙС-КОНФИГ НИШИ — единственная точка смены ниши.
 * Чтобы перенести калькулятор на другую услугу, меняем только этот файл и тексты.
 * Код расчёта (src/lib/pricing.ts) и отправки заявки не трогаем.
 *
 * Ниша демо: клининг. Все суммы в рублях (₽).
 */

export type CleaningTypeId = "maintenance" | "general" | "postRenovation";
export type UrgencyId = "normal" | "rush24";

export interface PricingOption {
  id: string;
  label: string;
  price: number; // фиксированная цена, ₽
}

export interface CleaningType {
  id: CleaningTypeId;
  label: string;
  ratePerSqm: number; // ставка за м², ₽
}

export interface UrgencyOption {
  id: UrgencyId;
  label: string;
  multiplier: number; // коэффициент срочности
}

export interface PricingConfig {
  currency: string;
  minOrder: number; // минимальный заказ, ₽
  maxMultiplier: number; // верхняя граница вилки цены
  area: {
    min: number;
    max: number;
    default: number;
    step: number;
  };
  cleaningTypes: CleaningType[];
  urgency: UrgencyOption[];
  options: PricingOption[];
  /** Контакты и тексты для экрана заявки/успеха (точка кастомизации под клиента). */
  contact: {
    /** Username менеджера в Telegram без @ (ссылка t.me/...). Плейсхолдер — заменить. */
    managerTelegram: string;
    /** Обещание по обратной связи на экране успеха. */
    callbackPromise: string;
  };
}

export const pricingConfig: PricingConfig = {
  currency: "₽",
  minOrder: 2500,
  maxMultiplier: 1.2,
  area: {
    min: 1,
    max: 500,
    default: 50,
    step: 1,
  },
  cleaningTypes: [
    { id: "maintenance", label: "Поддерживающая", ratePerSqm: 60 },
    { id: "general", label: "Генеральная", ratePerSqm: 120 },
    { id: "postRenovation", label: "После ремонта", ratePerSqm: 180 },
  ],
  urgency: [
    { id: "normal", label: "Обычная", multiplier: 1.0 },
    { id: "rush24", label: "В течение 24 ч", multiplier: 1.2 },
  ],
  options: [
    { id: "windows", label: "Мытьё окон", price: 1500 },
    { id: "sofa", label: "Химчистка дивана", price: 2000 },
    { id: "carpet", label: "Химчистка ковра", price: 1500 },
    { id: "oven", label: "Мытьё духовки", price: 800 },
    { id: "fridge", label: "Мытьё холодильника", price: 600 },
    { id: "ironing", label: "Глажка белья", price: 700 },
  ],
  contact: {
    managerTelegram: "prssfff",
    callbackPromise: "Перезвоним в течение ~15 минут в рабочее время.",
  },
};
