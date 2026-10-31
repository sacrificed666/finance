import { afterEach, describe, expect, it, vi } from "vitest";

import {
  bankStatusOf,
  connectBank,
  disconnectBank,
  fetchBankStatus,
  fetchStatement,
  loadStatement,
  lastDays,
  refreshBankStatus,
  setBankWebhook,
} from "./bank";

// A fetch that fails as an offline browser does
const offline = () => vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockRejectedValue(new TypeError("offline")));

// A fetch that answers with this reply
const answer = (reply: Response) => {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(reply);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

describe("bank status", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the well-formed accounts of the answer", () => {
    const status = bankStatusOf({
      connected: true,
      name: "Taras",
      accounts: [
        { id: "a", kind: "jar", currency: "UAH", balance: 500, title: "Trip" },
        { id: "b", currency: "GBP", balance: 1 },
        { currency: "UAH", balance: 1 },
      ],
      fetchedAt: 100,
      webhook: true,
    });
    expect(status.accounts).toEqual([
      expect.objectContaining({ id: "a", kind: "jar", title: "Trip" }),
      expect.objectContaining({ id: "b", currency: null }),
    ]);
    expect(status).toMatchObject({ connected: true, name: "Taras", webhook: true, fetchedAt: 100 });
    expect(bankStatusOf(null)).toMatchObject({ connected: false, accounts: [] });
  });

  it("reads the status and tells a busy bank from a failure", async () => {
    answer(Response.json({ connected: true, accounts: [] }));
    await expect(fetchBankStatus()).resolves.toMatchObject({ connected: true });
    answer(Response.json({ error: "wait:40" }, { status: 429 }));
    await expect(refreshBankStatus()).resolves.toEqual({ waitSeconds: "40" });
    answer(Response.json({ error: "token" }, { status: 400 }));
    await expect(refreshBankStatus("bad")).resolves.toEqual({ failed: true });
    answer(new Response(null, { status: 500 }));
    await expect(fetchBankStatus()).resolves.toBeNull();
  });
});

describe("linking and statements", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("tells a bad token from a limit when linking", async () => {
    answer(Response.json({ error: "token" }, { status: 400 }));
    await expect(connectBank("bad")).resolves.toEqual({ ok: false, problem: { kind: "token" } });
    answer(Response.json({ error: "wait:30" }, { status: 429 }));
    await expect(setBankWebhook(true)).resolves.toEqual({ ok: false, problem: { kind: "wait", seconds: 30 } });
  });

  it("reads a statement's operations and skips the malformed ones", async () => {
    answer(
      Response.json({
        items: [
          { id: "op", time: 1_760_000_000, description: "Silpo", mcc: 5411, amount: -12_000, opCurrency: "GBP" },
          { id: "broken" },
        ],
      }),
    );
    await expect(fetchStatement("acc", 1, 2)).resolves.toEqual({
      ok: true,
      items: [
        {
          id: "op",
          time: 1_760_000_000,
          description: "Silpo",
          comment: undefined,
          mcc: 5411,
          amount: -12_000,
          opAmount: undefined,
          opCurrency: undefined,
        },
      ],
    });
  });

  it("waits out the bank's limit and asks again", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ error: "wait:2" }, { status: 429 }))
      .mockResolvedValueOnce(Response.json({ items: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const waits: number[] = [];
    const loading = loadStatement("acc", 1, 2, {
      stopped: () => false,
      onLoad: () => null,
      onWait: (seconds) => waits.push(seconds),
    });
    await vi.runAllTimersAsync();
    await expect(loading).resolves.toEqual({ ok: true, items: [] });
    expect(waits).toEqual([2, 1]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("treats an offline browser and a broken answer as a failure", async () => {
    offline();
    await expect(fetchBankStatus()).resolves.toBeNull();
    await expect(refreshBankStatus("token")).resolves.toEqual({ failed: true });
    await expect(connectBank("token")).resolves.toEqual({ ok: false, problem: { kind: "failed" } });
    await expect(fetchStatement("acc", 1, 2)).resolves.toEqual({ ok: false, problem: { kind: "failed" } });
    await expect(disconnectBank()).resolves.toBeUndefined();
    answer(new Response("not json", { status: 200 }));
    await expect(fetchBankStatus()).resolves.toMatchObject({ connected: false });
    answer(new Response("not json", { status: 500 }));
    await expect(setBankWebhook(true)).resolves.toEqual({ ok: false, problem: { kind: "failed" } });
  });

  it("links, refreshes and reads the https problem and odd waits", async () => {
    const fetchMock = answer(Response.json({ connected: true, name: "Ann", accounts: [] }));
    await expect(connectBank("token")).resolves.toMatchObject({ ok: true, status: { name: "Ann" } });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/monobank",
      expect.objectContaining({ body: JSON.stringify({ token: "token" }) }),
    );
    answer(Response.json({ connected: true, accounts: [] }));
    await expect(refreshBankStatus()).resolves.toMatchObject({ status: { connected: true } });
    answer(Response.json({ error: "https" }, { status: 400 }));
    await expect(setBankWebhook(true)).resolves.toEqual({ ok: false, problem: { kind: "https" } });
    answer(Response.json({ error: "wait:soon" }, { status: 429 }));
    await expect(fetchStatement("acc", 1, 2)).resolves.toEqual({ ok: false, problem: { kind: "wait", seconds: 60 } });
    const deleting = answer(new Response(null));
    await disconnectBank();
    expect(deleting).toHaveBeenCalledWith("/api/monobank", { method: "DELETE" });
  });

  it("stops when the card goes away, before or while waiting", async () => {
    vi.useFakeTimers();
    answer(Response.json({ error: "wait:3" }, { status: 429 }));
    await expect(
      loadStatement("acc", 1, 2, { stopped: () => true, onLoad: () => null, onWait: () => null }),
    ).resolves.toBeNull();
    let calls = 0;
    const loading = loadStatement("acc", 1, 2, {
      stopped: () => (calls += 1) > 2,
      onLoad: () => null,
      onWait: () => null,
    });
    await vi.runAllTimersAsync();
    await expect(loading).resolves.toBeNull();
  });

  it("spans the last days in seconds", () => {
    vi.useFakeTimers({ now: new Date("2026-10-18T00:00:00Z"), toFake: ["Date"] });
    const to = Date.parse("2026-10-18T00:00:00Z") / 1000;
    expect(lastDays(7)).toEqual({ from: to - 7 * 86_400, to });
  });
});
