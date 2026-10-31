import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { answerQueries, type QueryFn } from "@/test/db";

const db = vi.hoisted(() => {
  vi.stubEnv("DATA_ENCRYPTION_KEY", Buffer.alloc(32, 3).toString("base64"));
  return { query: vi.fn<QueryFn>() };
});

vi.mock("@/shared/api/db", () => ({ getPool: () => ({ query: db.query }), ensureSchema: () => Promise.resolve() }));

const mono = await import("./monobank");

const KEY_LIKE = "k".repeat(32);

// The sealed connections by account with their webhook hash, as the table has them
const rows = new Map<string, { secret: string; hash: string | null }>();

// The faked time, which only moves forward between tests
let clock = Date.parse("2026-10-18T10:00:00Z");

// Moves the clock past the bank's one call a minute
const nextMinute = () => {
  clock += mono.MONO_SPACING_MS;
  vi.setSystemTime(clock);
};

const fetchMock = vi.fn<typeof fetch>();

// The bank's next answer, a minute after the last call
const bankAnswers = (body: unknown, status = 200) => {
  nextMinute();
  fetchMock.mockResolvedValueOnce(new Response(body === "" ? "" : JSON.stringify(body), { status }));
};

// The URL, method, headers and body of a bank call
const callOf = (index: number) => {
  const [url, init] = fetchMock.mock.calls[index] ?? [];
  return { url: typeof url === "string" ? url : null, method: init?.method, headers: init?.headers, body: init?.body };
};

const CLIENT_INFO = {
  name: "Ann Smith",
  accounts: [
    { id: "card1", balance: 12_345, currencyCode: 980, type: "black", maskedPan: ["537541******1234"] },
    { id: "broken", currencyCode: 980 },
    { id: "card2", balance: 100, currencyCode: 826 },
    { id: "credit", balance: 5_120_000, creditLimit: 5_000_000, currencyCode: 980, maskedPan: ["444111******9999"] },
  ],
  jars: [{ id: "jar1", balance: 5000, currencyCode: 840, title: "Trip" }],
};

describe("monobank", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    nextMinute();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    rows.clear();
    answerQueries(db.query, [
      [
        /^SELECT secret FROM integrations WHERE user_id/u,
        ([user]) => (rows.has(String(user)) ? [{ secret: rows.get(String(user))?.secret }] : []),
      ],
      [
        /^SELECT user_id, secret FROM integrations WHERE provider/u,
        ([hash]) =>
          [...rows].filter(([, row]) => row.hash === hash).map(([user_id, row]) => ({ user_id, secret: row.secret })),
      ],
      [
        /^INSERT INTO integrations/u,
        ([user, secret, hash]) => (rows.set(String(user), { secret: String(secret), hash: String(hash) }), []),
      ],
      [/^DELETE FROM integrations/u, ([user]) => (rows.delete(String(user)), [])],
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("dates bank moments in Kyiv", () => {
    expect(mono.monoDate(1_776_204_000)).toBe("2026-04-15");
    expect(mono.monoDate(1_776_200_000)).toBe("2026-04-14");
  });

  it("reads statement lines in whole units and skips broken ones", () => {
    expect(
      mono.monoItem({
        id: 42,
        time: 1_776_204_000,
        description: "Coffee",
        comment: "Morning",
        mcc: 5814,
        amount: -8000,
        operationAmount: -200,
        currencyCode: 840,
        balance: 100_000,
      }),
    ).toEqual({
      id: "42",
      time: 1_776_204_000,
      description: "Coffee",
      comment: "Morning",
      mcc: 5814,
      amount: -80,
      opAmount: 2,
      opCurrency: "USD",
      balance: 1000,
    });
    expect(mono.monoItem({ id: "a", time: 1, amount: 100 })).toEqual({
      id: "a",
      time: 1,
      description: "",
      mcc: 0,
      amount: 1,
    });
    expect(mono.monoItem({ id: "a", time: 1.5, amount: 1 })).toBeNull();
    expect(mono.monoItem({ id: "a", time: 1 })).toBeNull();
    expect(mono.monoItem({ time: 1, amount: 1 })).toBeNull();
    expect(mono.monoItem("line")).toBeNull();
  });

  it("connects, keeps the cards and jars sealed and shows the browser no token", async () => {
    bankAnswers(CLIENT_INFO);
    const stored = await mono.connectMono("u1", "token-1");
    expect(callOf(0)).toMatchObject({
      url: "https://api.monobank.ua/personal/client-info",
      method: "GET",
      headers: { "X-Token": "token-1" },
      body: null,
    });
    expect(stored.accounts).toEqual([
      {
        id: "card1",
        kind: "card",
        currency: "UAH",
        type: "black",
        maskedPan: "537541******1234",
        balance: 123.45,
        balanceAt: clock / 1000,
      },
      { id: "card2", kind: "card", currency: null, type: "black", maskedPan: "", balance: 1, balanceAt: clock / 1000 },
      {
        id: "credit",
        kind: "card",
        currency: "UAH",
        type: "black",
        maskedPan: "444111******9999",
        balance: 1200,
        balanceAt: clock / 1000,
        creditLimit: 50_000,
      },
      {
        id: "jar1",
        kind: "jar",
        currency: "USD",
        type: "jar",
        maskedPan: "",
        balance: 50,
        balanceAt: clock / 1000,
        title: "Trip",
      },
    ]);
    expect(rows.get("u1")?.secret).toMatch(/^enc\.v2\./u);
    await expect(mono.loadMono("u1")).resolves.toEqual(stored);
    expect(mono.publicMono(stored)).toEqual({
      connected: true,
      name: "Ann Smith",
      accounts: stored.accounts,
      fetchedAt: clock,
      webhook: false,
    });
    expect(JSON.stringify(mono.publicMono(stored))).not.toContain("token-1");
    expect(mono.publicMono(null)).toMatchObject({ connected: false, accounts: [] });

    await mono.deleteMono("u1");
    await expect(mono.loadMono("u1")).resolves.toBeNull();
  });

  it("calls the bank once a minute and names what went wrong", async () => {
    bankAnswers(CLIENT_INFO);
    await mono.connectMono("u2", "token-2");
    vi.setSystemTime(clock + 30_000);
    expect(mono.monoWait("u2")).toBe(31_000);
    await expect(mono.connectMono("u2", "token-2")).rejects.toMatchObject({ status: 429, message: "wait:31" });

    bankAnswers({}, 401);
    await expect(mono.connectMono("u2", "bad")).rejects.toMatchObject({
      name: "MonoError",
      status: 403,
      message: "token",
    });
    bankAnswers({}, 429);
    await expect(mono.connectMono("u2", "token-2")).rejects.toMatchObject({ status: 429, message: "wait:60" });
    bankAnswers({}, 500);
    await expect(mono.connectMono("u2", "token-2")).rejects.toMatchObject({ status: 502, message: "monobank:500" });
  });

  it("points the webhook at the site, finds the account by its key and turns it off", async () => {
    await expect(mono.setMonoWebhook("u3", "https://money.example")).rejects.toMatchObject({ status: 409 });
    bankAnswers(CLIENT_INFO);
    await mono.connectMono("u3", "token-3");
    bankAnswers("");
    const on = await mono.setMonoWebhook("u3", "https://money.example/");
    const key = on.webhookKey ?? "";
    expect(key).toMatch(/^[\w-]{32}$/u);
    expect(callOf(1)).toMatchObject({
      method: "POST",
      headers: { "X-Token": "token-3", "Content-Type": "application/json" },
      body: JSON.stringify({ webHookUrl: `https://money.example/api/monobank/webhook/${key}` }),
    });
    await expect(mono.findMonoByWebhookKey(key)).resolves.toMatchObject({
      userId: "u3",
      stored: { webhookUrl: on.webhookUrl },
    });
    await expect(mono.findMonoByWebhookKey(KEY_LIKE)).resolves.toBeNull();
    const queries = db.query.mock.calls.length;
    await expect(mono.findMonoByWebhookKey("short")).resolves.toBeNull();
    expect(db.query).toHaveBeenCalledTimes(queries);

    bankAnswers(CLIENT_INFO);
    await expect(mono.connectMono("u3", "token-3")).resolves.toMatchObject({
      webhookKey: key,
      webhookUrl: on.webhookUrl,
    });
    bankAnswers("");
    const off = await mono.setMonoWebhook("u3", null);
    expect(off).not.toHaveProperty("webhookUrl");
    expect(callOf(3).body).toBe(JSON.stringify({ webHookUrl: "" }));
    await expect(mono.findMonoByWebhookKey(key)).resolves.toBeNull();
  });

  it("reads a statement and keeps the newest balance it reports", async () => {
    bankAnswers(CLIENT_INFO);
    await mono.connectMono("u4", "token-4");
    const at = clock / 1000;
    bankAnswers([
      { id: "a", time: at + 10, amount: -100, balance: 12_000 },
      { id: "b", time: at + 20, amount: -200 },
      { id: "c", time: at + 5, amount: -300, balance: 13_000 },
      "broken",
    ]);
    const items = await mono.monoStatement("u4", "token-4", "card/1", 100, 200);
    expect(callOf(1).url).toBe("https://api.monobank.ua/personal/statement/card%2F1/100/200");
    expect(items.map((item) => item.id)).toEqual(["a", "b", "c"]);

    await mono.recordMonoBalance("u4", "card1", items);
    const saved = await mono.loadMono("u4");
    expect(saved?.accounts?.find((account) => account.id === "card1")).toMatchObject({
      balance: 120,
      balanceAt: at + 10,
    });

    await mono.recordMonoBalance("u4", "card1", [
      { id: "old", time: at, description: "", mcc: 0, amount: 1, balance: 1 },
    ]);
    await mono.recordMonoBalance("u4", "card1", [{ id: "none", time: at + 99, description: "", mcc: 0, amount: 1 }]);
    await mono.recordMonoBalance("u4", "missing", items);
    await expect(mono.loadMono("u4")).resolves.toEqual(saved);

    bankAnswers({ error: "not a list" });
    await expect(mono.monoStatement("u4", "token-4", "card1", 100, 200)).resolves.toEqual([]);
  });

  it("leaves the credit limit out of a balance an operation reports", async () => {
    bankAnswers(CLIENT_INFO);
    await mono.connectMono("u6", "token-6");
    const at = clock / 1000;
    await mono.recordMonoBalance("u6", "credit", [
      { id: "spent", time: at + 30, description: "", mcc: 0, amount: -50_000, balance: 49_800 },
    ]);
    const saved = await mono.loadMono("u6");
    expect(saved?.accounts?.find((account) => account.id === "credit")).toMatchObject({
      balance: -200,
      creditLimit: 50_000,
    });
  });
});
