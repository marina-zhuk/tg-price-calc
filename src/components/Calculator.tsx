"use client";

import { pricingConfig } from "@/config/pricing.config";
import type { CalcInput, CalcResult } from "@/lib/pricing";

interface CalculatorProps {
  input: CalcInput;
  onChange: (next: CalcInput) => void;
  result: CalcResult;
}

export default function Calculator({
  input,
  onChange,
  result,
}: CalculatorProps) {
  const { cleaningTypes, urgency, options, area, currency } = pricingConfig;

  const toggleOption = (id: string) => {
    const has = input.options.includes(id);
    onChange({
      ...input,
      options: has
        ? input.options.filter((o) => o !== id)
        : [...input.options, id],
    });
  };

  return (
    <section className="space-y-6">
      {/* Тип уборки */}
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Тип уборки</legend>
        <div className="grid grid-cols-1 gap-2">
          {cleaningTypes.map((t) => {
            const active = input.type === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onChange({ ...input, type: t.id })}
                aria-pressed={active}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                  active
                    ? "border-tg-button bg-tg-button/10 ring-1 ring-tg-button"
                    : "border-black/10 bg-tg-secondaryBg"
                }`}
              >
                <span className="font-medium">{t.label}</span>
                <span className="text-sm text-tg-hint">
                  {t.ratePerSqm} {currency}/м²
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Площадь */}
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">
          Площадь, м²
        </legend>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={area.min}
            max={area.max}
            step={area.step}
            value={input.area}
            onChange={(e) =>
              onChange({ ...input, area: Number(e.target.value) })
            }
            className="h-2 flex-1 cursor-pointer accent-tg-button"
            aria-label="Площадь, м² (ползунок)"
          />
          <input
            type="number"
            inputMode="numeric"
            min={area.min}
            max={area.max}
            value={input.area}
            onChange={(e) => {
              const raw = Number(e.target.value);
              const clamped = Number.isFinite(raw)
                ? Math.min(area.max, Math.max(area.min, raw))
                : area.min;
              onChange({ ...input, area: clamped });
            }}
            className="w-24 rounded-lg border border-black/10 bg-tg-bg px-3 py-2 text-right tabular-nums"
            aria-label="Площадь, м²"
          />
        </div>
      </fieldset>

      {/* Срочность */}
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Срочность</legend>
        <div className="grid grid-cols-2 gap-2">
          {urgency.map((u) => {
            const active = input.urgency === u.id;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => onChange({ ...input, urgency: u.id })}
                aria-pressed={active}
                className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
                  active
                    ? "border-tg-button bg-tg-button/10 ring-1 ring-tg-button"
                    : "border-black/10 bg-tg-secondaryBg"
                }`}
              >
                {u.label}
                {u.multiplier !== 1 && (
                  <span className="ml-1 text-tg-hint">×{u.multiplier}</span>
                )}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Доп-опции */}
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">
          Дополнительные услуги
        </legend>
        <div className="grid grid-cols-1 gap-2">
          {options.map((o) => {
            const checked = input.options.includes(o.id);
            return (
              <label
                key={o.id}
                className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition ${
                  checked
                    ? "border-tg-button bg-tg-button/10 ring-1 ring-tg-button"
                    : "border-black/10 bg-tg-secondaryBg"
                }`}
              >
                <span className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleOption(o.id)}
                    className="h-5 w-5 accent-tg-button"
                  />
                  <span className="font-medium">{o.label}</span>
                </span>
                <span className="text-sm text-tg-hint">
                  +{o.price} {currency}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Итог + breakdown */}
      <PriceSummary result={result} currency={currency} />
    </section>
  );
}

function PriceSummary({
  result,
  currency,
}: {
  result: CalcResult;
  currency: string;
}) {
  return (
    <div className="sticky bottom-2 rounded-2xl border border-black/10 bg-tg-secondaryBg p-4 shadow-sm">
      <div className="text-sm text-tg-hint">Примерная стоимость</div>
      <div className="text-2xl font-bold tabular-nums">
        ≈ {result.min.toLocaleString("ru-RU")}–
        {result.max.toLocaleString("ru-RU")} {currency}
      </div>

      <ul className="mt-3 space-y-1 text-sm">
        {result.breakdown.map((item, i) => (
          <li key={i} className="flex justify-between gap-3">
            <span className="text-tg-hint">{item.label}</span>
            <span className="shrink-0 tabular-nums">
              {item.amount >= 0 ? "+" : "−"}
              {Math.abs(Math.round(item.amount)).toLocaleString("ru-RU")}{" "}
              {currency}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
