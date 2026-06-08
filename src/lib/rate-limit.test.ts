import { describe, it, expect, beforeEach, vi } from "vitest";
import { rateLimit, clientIp, __resetRateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => __resetRateLimit());

  it("пропускает до лимита, затем блокирует", () => {
    const key = "ip-a";
    for (let i = 0; i < 6; i++) {
      expect(rateLimit(key, 6, 60_000).allowed).toBe(true);
    }
    const blocked = rateLimit(key, 6, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("разные ключи (IP) считаются раздельно", () => {
    expect(rateLimit("ip-b", 1, 60_000).allowed).toBe(true);
    expect(rateLimit("ip-b", 1, 60_000).allowed).toBe(false);
    expect(rateLimit("ip-c", 1, 60_000).allowed).toBe(true);
  });

  it("сбрасывается после окна", () => {
    vi.useFakeTimers();
    const key = "ip-d";
    for (let i = 0; i < 3; i++) rateLimit(key, 3, 1000);
    expect(rateLimit(key, 3, 1000).allowed).toBe(false);
    vi.advanceTimersByTime(1100);
    expect(rateLimit(key, 3, 1000).allowed).toBe(true);
    vi.useRealTimers();
  });

  it("clientIp берёт первый адрес из x-forwarded-for", () => {
    const req = new Request("http://x", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(clientIp(req)).toBe("1.2.3.4");
  });
});
