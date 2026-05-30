"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CalcInput, CalcResult } from "@/lib/pricing";
import type { TelegramWebApp } from "@/lib/telegram-webapp";
import { pricingConfig } from "@/config/pricing.config";

interface LeadFormProps {
  input: CalcInput;
  result: CalcResult;
  webApp: TelegramWebApp | null;
  isTelegram: boolean;
  /** Сброс к калькулятору для новой заявки. */
  onNewRequest: () => void;
}

type Status = "idle" | "submitting" | "success" | "error";

function countDigits(s: string): number {
  return (s.match(/\d/g) ?? []).length;
}

/** Живая маска российского номера: +7 (XXX) XXX-XX-XX. */
function formatRuPhone(value: string): string {
  let d = value.replace(/\D/g, "");
  if (d.length === 0) return "";
  if (d.startsWith("8")) d = "7" + d.slice(1);
  if (!d.startsWith("7")) d = "7" + d;
  d = d.slice(0, 11);
  const a = d.slice(1, 4);
  const b = d.slice(4, 7);
  const c = d.slice(7, 9);
  const e = d.slice(9, 11);
  let r = "+7";
  if (a) r += " (" + a;
  if (a.length === 3) r += ")";
  if (b) r += " " + b;
  if (c) r += "-" + c;
  if (e) r += "-" + e;
  return r;
}

export default function LeadForm({
  input,
  result,
  webApp,
  isTelegram,
  onNewRequest,
}: LeadFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const submissionCount = useRef(0);

  const isValid = name.trim().length >= 2 && countDigits(phone) >= 11;

  const buttonLabel = `Оставить заявку · ≈${result.min.toLocaleString(
    "ru-RU"
  )}–${result.max.toLocaleString("ru-RU")} ₽`;

  // Свежие значения для колбэка MainButton (регистрируется один раз).
  const latest = useRef({ name, phone, comment, status, isValid });
  latest.current = { name, phone, comment, status, isValid };

  const submit = useCallback(async () => {
    const cur = latest.current;
    if (cur.status === "submitting") return;

    if (cur.name.trim().length < 2) {
      setStatus("error");
      setErrorMsg("Укажите имя (минимум 2 символа).");
      return;
    }
    if (countDigits(cur.phone) < 11) {
      setStatus("error");
      setErrorMsg("Введите корректный телефон: +7 (___) ___-__-__");
      return;
    }

    setStatus("submitting");
    setErrorMsg("");
    submissionCount.current += 1;
    webApp?.MainButton.showProgress();

    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cur.name.trim(),
          phone: cur.phone.trim(),
          comment: cur.comment.trim() || undefined,
          calc: {
            type: input.type,
            area: input.area,
            urgency: input.urgency,
            options: input.options,
            min: result.min,
            max: result.max,
          },
          submissionCount: submissionCount.current,
          initData: webApp?.initData,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        setStatus("error");
        setErrorMsg(
          data?.errors
            ? "Проверьте правильность заполнения полей."
            : "Не удалось отправить заявку. Попробуйте ещё раз."
        );
        webApp?.HapticFeedback?.notificationOccurred("error");
        return;
      }

      setStatus("success");
      webApp?.HapticFeedback?.notificationOccurred("success");
    } catch {
      setStatus("error");
      setErrorMsg("Сеть недоступна. Попробуйте ещё раз.");
      webApp?.HapticFeedback?.notificationOccurred("error");
    } finally {
      webApp?.MainButton.hideProgress();
    }
  }, [input, result, webApp]);

  const handleNewRequest = useCallback(() => {
    setName("");
    setPhone("");
    setComment("");
    setStatus("idle");
    setErrorMsg("");
    onNewRequest();
  }, [onNewRequest]);

  // Telegram MainButton: в форме — отправка; на успехе — «Новая заявка».
  useEffect(() => {
    if (!isTelegram || !webApp) return;
    const mb = webApp.MainButton;

    if (status === "success") {
      mb.setText("🆕 Новая заявка");
      mb.show();
      mb.enable();
      const h = () => handleNewRequest();
      mb.onClick(h);
      return () => mb.offClick(h);
    }

    mb.setText(buttonLabel);
    mb.show();
    if (isValid) mb.enable();
    else mb.disable();
    const h = () => void submit();
    mb.onClick(h);
    return () => mb.offClick(h);
  }, [isTelegram, webApp, buttonLabel, submit, status, isValid, handleNewRequest]);

  // Экран успеха: «что дальше».
  if (status === "success") {
    const managerUrl = `https://t.me/${pricingConfig.contact.managerTelegram}`;
    return (
      <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6 text-center">
        <div className="text-4xl">✅</div>
        <h2 className="mt-2 text-lg font-bold">Заявка принята!</h2>
        <p className="mt-1 text-sm text-tg-hint">
          {pricingConfig.contact.callbackPromise}
        </p>
        <p className="mt-1 text-sm text-tg-hint">
          Предварительная стоимость{" "}
          <span className="font-semibold text-tg-text">
            ≈ {result.min.toLocaleString("ru-RU")}–
            {result.max.toLocaleString("ru-RU")} ₽
          </span>
          .
        </p>

        <div className="mt-5 space-y-2">
          <a
            href={managerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-xl bg-tg-button px-4 py-3 font-semibold text-tg-buttonText"
          >
            💬 Написать менеджеру
          </a>
          {!isTelegram && (
            <button
              type="button"
              onClick={handleNewRequest}
              className="block w-full rounded-xl border border-black/10 bg-tg-secondaryBg px-4 py-3 font-medium"
            >
              🆕 Новая заявка
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-semibold">
          Имя
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Как к вам обращаться"
          autoComplete="name"
          className="w-full rounded-xl border border-black/10 bg-tg-bg px-4 py-3 outline-none focus:ring-2 focus:ring-tg-button"
        />
      </div>

      <div>
        <label htmlFor="phone" className="mb-1 block text-sm font-semibold">
          Телефон
        </label>
        <input
          id="phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(formatRuPhone(e.target.value))}
          placeholder="+7 (___) ___-__-__"
          autoComplete="tel"
          className="w-full rounded-xl border border-black/10 bg-tg-bg px-4 py-3 outline-none focus:ring-2 focus:ring-tg-button"
        />
      </div>

      <div>
        <label htmlFor="comment" className="mb-1 block text-sm font-semibold">
          Комментарий{" "}
          <span className="font-normal text-tg-hint">(необязательно)</span>
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Адрес, удобное время, детали"
          rows={3}
          className="w-full resize-none rounded-xl border border-black/10 bg-tg-bg px-4 py-3 outline-none focus:ring-2 focus:ring-tg-button"
        />
      </div>

      {status === "error" && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600"
        >
          {errorMsg}
        </div>
      )}

      {/* Своя кнопка — только вне Telegram (там работает MainButton). */}
      {!isTelegram && (
        <button
          type="submit"
          disabled={status === "submitting" || !isValid}
          className="w-full rounded-xl bg-tg-button px-4 py-3.5 font-semibold text-tg-buttonText transition disabled:opacity-50"
        >
          {status === "submitting" ? "Отправляем…" : buttonLabel}
        </button>
      )}

      {isTelegram && (
        <p className="text-center text-xs text-tg-hint">
          {isValid
            ? "Нажмите кнопку внизу экрана, чтобы отправить заявку."
            : "Заполните имя и телефон — кнопка отправки появится внизу."}
        </p>
      )}
    </form>
  );
}
