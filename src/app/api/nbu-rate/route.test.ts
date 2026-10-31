import { beforeEach, describe, expect, it, vi } from "vitest";

import { answerOf, request } from "@/test/http";

const deps = vi.hoisted(() => ({
  currentUserId: vi.fn<() => Promise<string | null>>(),
  dayRate: vi.fn<(currency: string, date: string) => Promise<number | null>>(),
  monthAverages: vi.fn<(month: string) => Promise<object | null>>(),
}));

vi.mock("@/features/auth/model/currentUser", () => ({ currentUserId: deps.currentUserId }));
vi.mock("@/features/market/api/nbuBank", () => ({
  dayRate: deps.dayRate,
  monthAverages: deps.monthAverages,
  kyivMonth: () => "2026-10",
  kyivDay: () => "2026-10-30",
}));

const { GET } = await import("./route");

// The answer to a query of the route
const ask = async (query: string) => answerOf(await GET(request(`/api/nbu-rate?${query}`, "GET")));

describe("GET /api/nbu-rate", () => {
  beforeEach(() => {
    deps.currentUserId.mockResolvedValue("u1");
    deps.dayRate.mockResolvedValue(41.25);
    deps.monthAverages.mockResolvedValue({ USD: 41, EUR: 45 });
  });

  it("gives a day's rate", async () => {
    await expect(ask("currency=USD&date=2026-10-01")).resolves.toEqual({ status: 200, body: { rate: 41.25 } });
    expect(deps.dayRate).toHaveBeenCalledWith("USD", "2026-10-01");
  });

  it("gives the averages of an ended month", async () => {
    await expect(ask("month=2026-09")).resolves.toEqual({ status: 200, body: { USD: 41, EUR: 45 } });
    expect((await ask("month=2026-10")).status).toBe(400);
    expect((await ask("month=2026-13")).status).toBe(400);
  });

  it("refuses bad queries and days to come", async () => {
    expect((await ask("currency=GBP&date=2026-10-01")).status).toBe(400);
    expect((await ask("currency=EUR&date=1.10.2026")).status).toBe(400);
    expect((await ask("currency=EUR&date=2999-01-01")).status).toBe(404);
    expect((await ask("currency=EUR&date=2026-10-31")).status).toBe(404);
    expect(deps.dayRate).not.toHaveBeenCalled();
    expect((await ask("currency=EUR&date=2026-10-30")).status).toBe(200);
  });

  it("says when the bank does not answer", async () => {
    deps.dayRate.mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce(null);
    expect((await ask("currency=EUR&date=2026-10-01")).status).toBe(502);
    expect((await ask("currency=EUR&date=2026-10-01")).status).toBe(502);
    deps.monthAverages.mockRejectedValueOnce(new Error("down"));
    expect((await ask("month=2026-09")).status).toBe(502);
  });

  it("needs an account", async () => {
    deps.currentUserId.mockResolvedValue(null);
    expect((await ask("month=2026-09")).status).toBe(401);
  });
});
