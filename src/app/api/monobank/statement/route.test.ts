import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MonoItem, MonoStored } from "@/features/import/api/monobank";
import { answerOf, request } from "@/test/http";

const deps = vi.hoisted(() => ({
  currentUserId: vi.fn<() => Promise<string | null>>(),
  loadMono: vi.fn<(userId: string) => Promise<MonoStored | null>>(),
  monoStatement:
    vi.fn<(userId: string, token: string, account: string, from: number, to: number) => Promise<MonoItem[]>>(),
  recordMonoBalance: vi.fn<(userId: string, account: string, items: MonoItem[]) => Promise<void>>(),
  logError: vi.fn<(route: string, error: unknown) => Promise<void>>(),
}));

vi.mock("@/features/auth/model/currentUser", () => ({ currentUserId: deps.currentUserId }));
vi.mock("@/features/import/api/monobank", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  loadMono: deps.loadMono,
  monoStatement: deps.monoStatement,
  recordMonoBalance: deps.recordMonoBalance,
}));
vi.mock("@/features/settings/api/errorLog", () => ({ logError: deps.logError }));

const { MonoError } = await import("@/features/import/api/monobank");
const { GET } = await import("./route");

const STORED: MonoStored = {
  token: "token",
  accounts: [{ id: "card1", kind: "card", currency: "UAH", type: "black", maskedPan: "", balance: 0 }],
};
const ITEMS: MonoItem[] = [{ id: "a", time: 150, description: "Coffee", mcc: 5814, amount: -80 }];

// The statement answer for a query
const statement = async (query: string) => answerOf(await GET(request(`/api/monobank/statement?${query}`, "GET")));

describe("GET /api/monobank/statement", () => {
  beforeEach(() => {
    deps.currentUserId.mockResolvedValue("u1");
    deps.loadMono.mockResolvedValue(STORED);
    deps.monoStatement.mockReset().mockResolvedValue(ITEMS);
  });

  it("gives the lines and keeps the balance they report", async () => {
    await expect(statement("account=card1&from=100&to=200")).resolves.toEqual({ status: 200, body: { items: ITEMS } });
    expect(deps.monoStatement).toHaveBeenCalledWith("u1", "token", "card1", 100, 200);
    expect(deps.recordMonoBalance).toHaveBeenCalledWith("u1", "card1", ITEMS);
  });

  it("refuses unknown accounts and bad ranges", async () => {
    expect((await statement("account=other&from=100&to=200")).body).toEqual({ error: "account" });
    expect((await statement("account=card1&from=200&to=100")).body).toEqual({ error: "range" });
    expect((await statement("account=card1&from=1.5&to=200")).body).toEqual({ error: "range" });
    expect((await statement(`account=card1&from=0&to=${String(32 * 86_400)}`)).body).toEqual({ error: "range" });
    expect(deps.monoStatement).not.toHaveBeenCalled();
  });

  it("answers bank failures", async () => {
    deps.monoStatement.mockRejectedValueOnce(new MonoError(429, "wait:30"));
    await expect(statement("account=card1&from=100&to=200")).resolves.toEqual({
      status: 429,
      body: { error: "wait:30" },
    });
    deps.monoStatement.mockRejectedValueOnce(new Error("socket"));
    await expect(statement("account=card1&from=100&to=200")).resolves.toEqual({
      status: 502,
      body: { error: "unreachable" },
    });
    expect(deps.logError).toHaveBeenCalledOnce();
  });

  it("needs an account and a connection", async () => {
    deps.currentUserId.mockResolvedValueOnce(null);
    expect((await statement("account=card1&from=100&to=200")).status).toBe(401);
    deps.loadMono.mockResolvedValue(null);
    expect((await statement("account=card1&from=100&to=200")).status).toBe(409);
  });
});
