import { describe, it, expect } from "vitest";
import { leadSchema } from "@/lib/schema";

const baseCalc = {
  type: "general",
  area: 50,
  urgency: "normal",
  options: ["windows"],
  min: 7500,
  max: 9000,
};
const baseLead = {
  name: "Иван",
  phone: "+7 (900) 123-45-67",
  address: "Москва, Тверская 1, кв 5",
  calc: baseCalc,
};

describe("leadSchema", () => {
  it("принимает корректную заявку", () => {
    expect(leadSchema.safeParse(baseLead).success).toBe(true);
  });

  it("отклоняет слишком короткое имя", () => {
    expect(leadSchema.safeParse({ ...baseLead, name: "И" }).success).toBe(false);
  });

  it("отклоняет телефон с количеством цифр < 10", () => {
    expect(leadSchema.safeParse({ ...baseLead, phone: "+7 999" }).success).toBe(
      false
    );
  });

  it("требует адрес уборки", () => {
    const noAddr = { name: baseLead.name, phone: baseLead.phone, calc: baseCalc };
    expect(leadSchema.safeParse(noAddr).success).toBe(false);
  });

  it("отклоняет неизвестный тип уборки", () => {
    const bad = { ...baseLead, calc: { ...baseCalc, type: "hacker" } };
    expect(leadSchema.safeParse(bad).success).toBe(false);
  });

  it("отклоняет неизвестную доп-опцию", () => {
    const bad = { ...baseLead, calc: { ...baseCalc, options: ["windows", "evil"] } };
    expect(leadSchema.safeParse(bad).success).toBe(false);
  });

  it("отклоняет площадь вне допустимого диапазона", () => {
    const bad = { ...baseLead, calc: { ...baseCalc, area: 99999 } };
    expect(leadSchema.safeParse(bad).success).toBe(false);
  });

  it("принимает опциональные дату/время и комментарий", () => {
    const ok = {
      ...baseLead,
      datetime: "5 июня, с 10:00",
      comment: "домофон 25",
    };
    expect(leadSchema.safeParse(ok).success).toBe(true);
  });
});
