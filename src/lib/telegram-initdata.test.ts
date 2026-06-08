import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { verifyInitData } from "@/lib/telegram-initdata";

const TOKEN = "123456:TEST_TOKEN";

/** Собирает корректно подписанный initData (как Telegram). */
function sign(fields: Record<string, string>): string {
  const dcs = Object.entries(fields)
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(TOKEN).digest();
  const hash = crypto.createHmac("sha256", secret).update(dcs).digest("hex");
  return new URLSearchParams({ ...fields, hash }).toString();
}

const user = JSON.stringify({ id: 42, first_name: "Аня", username: "anya" });
const nowSec = Math.floor(Date.now() / 1000);

describe("verifyInitData", () => {
  it("валидная свежая подпись → valid + user", () => {
    const initData = sign({ auth_date: String(nowSec), user });
    const r = verifyInitData(initData, TOKEN);
    expect(r.valid).toBe(true);
    expect(r.user?.id).toBe(42);
    expect(r.user?.username).toBe("anya");
  });

  it("неверный токен → невалидно", () => {
    const initData = sign({ auth_date: String(nowSec), user });
    const r = verifyInitData(initData, "999:WRONG");
    expect(r.valid).toBe(false);
  });

  it("просроченные данные → невалидно и expired", () => {
    const old = String(nowSec - 48 * 3600);
    const initData = sign({ auth_date: old, user });
    const r = verifyInitData(initData, TOKEN);
    expect(r.valid).toBe(false);
    expect(r.expired).toBe(true);
  });

  it("свежесть в пределах окна → valid", () => {
    const initData = sign({ auth_date: String(nowSec - 10), user });
    const r = verifyInitData(initData, TOKEN, 60);
    expect(r.valid).toBe(true);
  });

  it("отсутствие initData → absent", () => {
    const r = verifyInitData(undefined, TOKEN);
    expect(r.absent).toBe(true);
    expect(r.valid).toBe(false);
  });

  it("без токена (mock) → невалидно, но user парсится", () => {
    const initData = sign({ auth_date: String(nowSec), user });
    const r = verifyInitData(initData, undefined);
    expect(r.valid).toBe(false);
    expect(r.user?.id).toBe(42);
  });
});
