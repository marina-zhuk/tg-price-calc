import { describe, it, expect } from "vitest";
import { calculatePrice } from "@/lib/pricing";
import { pricingConfig } from "@/config/pricing.config";

const cfg = pricingConfig;

describe("calculatePrice", () => {
  it("базовый расчёт: поддерживающая, обычная срочность, без опций", () => {
    const r = calculatePrice(cfg, {
      type: "maintenance",
      area: 50,
      urgency: "normal",
      options: [],
    });
    // 60 * 50 = 3000
    expect(r.min).toBe(3000);
    expect(r.max).toBe(3600); // 3000 * 1.2
    expect(r.appliedMinOrder).toBe(false);
  });

  it("ставки по типам различаются", () => {
    const gen = calculatePrice(cfg, {
      type: "general",
      area: 50,
      urgency: "normal",
      options: [],
    });
    const post = calculatePrice(cfg, {
      type: "postRenovation",
      area: 50,
      urgency: "normal",
      options: [],
    });
    expect(gen.min).toBe(6000); // 120 * 50
    expect(post.min).toBe(9000); // 180 * 50
  });

  it("срочность ×1.2 увеличивает базу и попадает в breakdown", () => {
    const r = calculatePrice(cfg, {
      type: "maintenance",
      area: 100,
      urgency: "rush24",
      options: [],
    });
    // 60 * 100 * 1.2 = 7200
    expect(r.min).toBe(7200);
    expect(
      r.breakdown.some((b) => b.label.toLowerCase().includes("срочность"))
    ).toBe(true);
  });

  it("опции суммируются фиксированной ценой", () => {
    const r = calculatePrice(cfg, {
      type: "general",
      area: 50,
      urgency: "normal",
      options: ["windows", "carpet"], // 1500 + 1500
    });
    // 6000 + 3000 = 9000
    expect(r.min).toBe(9000);
  });

  it("неизвестные id опций игнорируются", () => {
    const r = calculatePrice(cfg, {
      type: "general",
      area: 50,
      urgency: "normal",
      options: ["windows", "does-not-exist"],
    });
    expect(r.min).toBe(7500); // 6000 + 1500
  });

  it("минимальный заказ применяется, когда итог ниже порога", () => {
    const r = calculatePrice(cfg, {
      type: "maintenance",
      area: 10,
      urgency: "normal",
      options: [],
    });
    // 60 * 10 = 600 < 2500
    expect(r.min).toBe(cfg.minOrder);
    expect(r.max).toBe(Math.round(cfg.minOrder * cfg.maxMultiplier));
    expect(r.appliedMinOrder).toBe(true);
    expect(
      r.breakdown.some((b) => b.label.toLowerCase().includes("минимальн"))
    ).toBe(true);
  });

  it("вилка: max = round(total * maxMultiplier)", () => {
    const r = calculatePrice(cfg, {
      type: "postRenovation",
      area: 73,
      urgency: "rush24",
      options: ["sofa"],
    });
    // 180 * 73 * 1.2 = 15768; + 2000 = 17768
    expect(r.min).toBe(17768);
    expect(r.max).toBe(Math.round(17768 * cfg.maxMultiplier));
  });

  it("некорректная площадь (0) не ломает расчёт — срабатывает минимальный заказ", () => {
    const r = calculatePrice(cfg, {
      type: "general",
      area: 0,
      urgency: "normal",
      options: [],
    });
    expect(r.min).toBe(cfg.minOrder);
    expect(r.appliedMinOrder).toBe(true);
  });
});
