"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Calculator from "@/components/Calculator";
import LeadForm from "@/components/LeadForm";
import { calculatePrice, type CalcInput } from "@/lib/pricing";
import { pricingConfig } from "@/config/pricing.config";
import { useTelegram } from "@/lib/useTelegram";

type View = "calc" | "form";

const defaultInput = (): CalcInput => ({
  type: pricingConfig.cleaningTypes[0].id,
  area: pricingConfig.area.default,
  urgency: pricingConfig.urgency[0].id,
  options: [],
});

export default function Home() {
  const { isTelegram, webApp } = useTelegram();

  const [input, setInput] = useState<CalcInput>(defaultInput);
  const [view, setView] = useState<View>("calc");

  const result = useMemo(() => calculatePrice(pricingConfig, input), [input]);

  const goToCalc = useCallback(() => setView("calc"), []);

  const handleNewRequest = useCallback(() => {
    setInput(defaultInput());
    setView("calc");
  }, []);

  // Telegram BackButton: в форме — назад к калькулятору.
  useEffect(() => {
    if (!isTelegram || !webApp) return;
    const bb = webApp.BackButton;
    if (view === "form") {
      bb.show();
      const h = () => goToCalc();
      bb.onClick(h);
      return () => {
        bb.offClick(h);
        bb.hide();
      };
    }
    bb.hide();
  }, [isTelegram, webApp, view, goToCalc]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-4 pb-28 pt-6">
      <header className="mb-6">
        <h1 className="text-xl font-bold">Калькулятор стоимости клининга</h1>
        <p className="mt-1 text-sm text-tg-hint">
          Задайте параметры — узнайте цену сразу и оставьте заявку.
        </p>
      </header>

      {view === "calc" ? (
        <>
          <Calculator input={input} onChange={setInput} result={result} />
          <button
            type="button"
            onClick={() => setView("form")}
            className="mt-6 w-full rounded-xl bg-tg-button px-4 py-3.5 font-semibold text-tg-buttonText transition"
          >
            Перейти к заявке · ≈{result.min.toLocaleString("ru-RU")}–
            {result.max.toLocaleString("ru-RU")} ₽
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={goToCalc}
            className="mb-4 inline-flex items-center gap-1 text-sm text-tg-link"
          >
            ← Изменить расчёт
          </button>

          <div className="mb-5 rounded-2xl border border-black/10 bg-tg-secondaryBg p-4">
            <div className="text-sm text-tg-hint">Ваш расчёт</div>
            <div className="text-xl font-bold tabular-nums">
              ≈ {result.min.toLocaleString("ru-RU")}–
              {result.max.toLocaleString("ru-RU")} ₽
            </div>
          </div>

          <LeadForm
            input={input}
            result={result}
            webApp={webApp}
            isTelegram={isTelegram}
            onNewRequest={handleNewRequest}
          />
        </>
      )}

      <footer className="mt-10 text-center text-xs text-tg-hint">
        Демо-кейс · Telegram Mini App
      </footer>
    </main>
  );
}
