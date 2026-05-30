/**
 * Zod-схема заявки. Используется в API-роуте /api/lead для валидации.
 * Тип уборки, срочность и доп-опции проверяются по pricing.config —
 * единый источник правды, мусорные значения отсекаются.
 */

import { z } from "zod";
import { pricingConfig } from "@/config/pricing.config";

const typeIds = pricingConfig.cleaningTypes.map((t) => t.id);
const urgencyIds = pricingConfig.urgency.map((u) => u.id);
const optionIds = pricingConfig.options.map((o) => o.id);

/** Кол-во цифр в строке телефона. */
export function countDigits(s: string): number {
  return (s.match(/\d/g) ?? []).length;
}

export const calcSchema = z.object({
  type: z.string().refine((v) => typeIds.includes(v as never), "Неизвестный тип уборки"),
  area: z
    .number()
    .positive()
    .min(pricingConfig.area.min)
    .max(pricingConfig.area.max),
  urgency: z
    .string()
    .refine((v) => urgencyIds.includes(v as never), "Неизвестная срочность"),
  options: z
    .array(z.string().refine((v) => optionIds.includes(v as never), "Неизвестная опция"))
    .max(optionIds.length),
  // Клиентские min/max принимаем, но на сервере цена пересчитывается заново.
  min: z.number(),
  max: z.number(),
});

export const leadSchema = z.object({
  name: z.string().trim().min(2, "Укажите имя (минимум 2 символа)").max(100),
  phone: z
    .string()
    .trim()
    .regex(/^[\d\s()+\-]+$/, "Телефон может содержать только цифры и символы + ( ) -")
    .refine((v) => countDigits(v) >= 10, "Введите корректный телефон (минимум 10 цифр)"),
  comment: z.string().trim().max(1000).optional().or(z.literal("")),
  calc: calcSchema,
  // Номер попытки отправки в рамках сессии (для пометки «повторная заявка»).
  submissionCount: z.number().int().positive().optional(),
  // initData Telegram передаётся как есть; подпись проверяется на сервере.
  initData: z.string().optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;
export type CalcPayload = z.infer<typeof calcSchema>;
