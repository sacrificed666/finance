import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StateChanges } from "@/features/data/model/changes";
import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Settings, Transaction } from "@/features/data/model/types";
import type { MonoItem, MonoStored } from "@/features/import/api/monobank";
import type { PushMessage } from "@/features/notifications/model/reminders";
import { answerOf, request } from "@/test/http";

const deps = vi.hoisted(() => ({
  findMonoByWebhookKey: vi.fn<(key: string) => Promise<{ userId: string; stored: MonoStored } | null>>(),
  recordMonoBalance: vi.fn<(userId: string, account: string, items: MonoItem[]) => Promise<void>>(),
  loadState: vi.fn<(userId: string) => Promise<{ state: AppState; revision: string }>>(),
  saveChanges: vi.fn<(userId: string, changes: StateChanges, base: string | null) => Promise<object>>(),
  pushTo: vi.fn<(userId: string, message: PushMessage) => Promise<object>>(),
  logError: vi.fn<(route: string, error: unknown) => Promise<void>>(),
}));

vi.mock("@/features/import/api/monobank", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  findMonoByWebhookKey: deps.findMonoByWebhookKey,
  recordMonoBalance: deps.recordMonoBalance,
}));
vi.mock("@/features/data/api/repo", () => ({ loadState: deps.loadState, saveChanges: deps.saveChanges }));
vi.mock("@/features/notifications/model/push", () => ({ pushTo: deps.pushTo }));
vi.mock("@/features/settings/api/errorLog", () => ({ logError: deps.logError }));

const { GET, POST } = await import("./route");

const KEY = "k".repeat(32);
const STORED: MonoStored = {
  token: "t",
  webhookKey: KEY,
  webhookUrl: "https://money.example/hook",
  accounts: [
    { id: "card1", kind: "card", currency: "UAH", type: "black", maskedPan: "", balance: 0 },
    { id: "odd", kind: "card", currency: null, type: "black", maskedPan: "", balance: 0 },
  ],
};

// A line the bank reports for a card
const line = (id: string, account = "card1", amount = -12_000) => ({
  type: "StatementItem",
  data: {
    account,
    statementItem: { id, time: 1_776_204_000, description: "Coffee", mcc: 5814, amount, balance: 500_000 },
  },
});

// The state of an account with its card linked, and what it asked to be told
const linkedState = (settings: Partial<Settings> = {}): AppState => ({
  ...DEFAULT_STATE,
  settings: { ...DEFAULT_STATE.settings, bankLinks: { card1: "acc1" }, ...settings },
});

// The bank's call for a key, from an address
const hook = (body: unknown, key = KEY, ip = "10.2.0.1") =>
  POST(request(`/api/monobank/webhook/${key}`, "POST", body, { "x-forwarded-for": ip }), {
    params: Promise.resolve({ key }),
  });

describe("/api/monobank/webhook/[key]", () => {
  beforeEach(() => {
    for (const mock of Object.values(deps)) mock.mockReset();
    deps.findMonoByWebhookKey.mockImplementation((key) =>
      Promise.resolve(key === KEY ? { userId: "u1", stored: STORED } : null),
    );
    deps.loadState.mockResolvedValue({ state: linkedState(), revision: "r" });
    deps.saveChanges.mockResolvedValue({});
    deps.pushTo.mockResolvedValue({ sent: 1, failed: 0 });
  });

  it("answers the bank's check of the address", () => {
    expect(GET().status).toBe(200);
  });

  it("books a linked card's operation and tells the account", async () => {
    await expect(answerOf(await hook(line("op1")))).resolves.toEqual({ status: 200, body: { ok: true } });
    expect(deps.recordMonoBalance).toHaveBeenCalledWith("u1", "card1", [
      expect.objectContaining({ id: "op1", balance: 5000 }),
    ]);
    const changes = deps.saveChanges.mock.calls[0]?.[1];
    expect(changes?.transactions?.upsert).toEqual([
      expect.objectContaining({
        externalId: "mono:op1",
        type: "expense",
        amount: 120,
        currency: "UAH",
        accountId: "acc1",
        date: "2026-04-15",
      }),
    ]);
    expect(deps.pushTo).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ url: expect.stringMatching(/^\/transactions\?tx=/u) }),
    );
  });

  it("stays quiet when the account turned the messages off", async () => {
    deps.loadState.mockResolvedValue({
      state: linkedState({ notify: { operations: false, budgets: false } }),
      revision: "r",
    });
    await hook(line("op2"));
    expect(deps.saveChanges).toHaveBeenCalledOnce();
    expect(deps.pushTo).not.toHaveBeenCalled();
  });

  it("books nothing for unlinked cards, known operations and other events", async () => {
    deps.loadState.mockResolvedValue({ state: { ...DEFAULT_STATE }, revision: "r" });
    await hook(line("op3"));
    expect(deps.recordMonoBalance).toHaveBeenCalledOnce();
    const booked: Transaction = {
      id: "t1",
      type: "expense",
      amount: 120,
      currency: "UAH",
      categoryId: "other",
      date: "2026-04-15",
      externalId: "mono:op4",
    };
    deps.loadState.mockResolvedValue({ state: { ...linkedState(), transactions: [booked] }, revision: "r" });
    await hook(line("op4"));
    expect((await hook({ type: "Other" })).status).toBe(200);
    expect((await hook(line("op5", "unknown"))).status).toBe(200);
    expect((await hook(line("op6", "odd"))).status).toBe(200);
    expect((await hook("{")).status).toBe(200);
    expect(deps.saveChanges).not.toHaveBeenCalled();
  });

  it("logs a failed booking and refuses unknown keys", async () => {
    deps.loadState.mockRejectedValue(new Error("db down"));
    await expect(answerOf(await hook(line("op7")))).resolves.toEqual({ status: 500, body: { error: "not saved" } });
    expect(deps.logError).toHaveBeenCalledWith("api/monobank/webhook/[key]", expect.any(Error));
    expect((await hook(line("op8"), "x".repeat(32))).status).toBe(404);
  });

  it("books the operations of one account one at a time", async () => {
    const order: string[] = [];
    deps.recordMonoBalance.mockImplementation(async (_user, _account, [item]) => {
      order.push(`start:${item?.id ?? ""}`);
      await new Promise((resolve) => setTimeout(resolve, item?.id === "slow" ? 20 : 0));
      order.push(`end:${item?.id ?? ""}`);
    });
    deps.loadState.mockRejectedValueOnce(new Error("first fails"));
    await Promise.all([hook(line("slow")), hook(line("fast"))]);
    expect(order).toEqual(["start:slow", "end:slow", "start:fast", "end:fast"]);
  });

  it("slows down a flood from one address", async () => {
    const answers = await Promise.all(Array.from({ length: 121 }, () => hook({ type: "Other" }, KEY, "10.2.0.9")));
    expect(answers.at(-1)?.status).toBe(429);
  });
});
