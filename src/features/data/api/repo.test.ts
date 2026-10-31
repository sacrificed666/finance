import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Category, Transaction } from "@/features/data/model/types";
import { answerQueries, result, statements, type QueryFn } from "@/test/db";

const db = vi.hoisted(() => {
  vi.stubEnv("DATA_ENCRYPTION_KEY", Buffer.alloc(32, 7).toString("base64"));
  return { query: vi.fn<QueryFn>() };
});
const prune = vi.hoisted(() => vi.fn<(client: unknown, userId: string, keep: string[]) => Promise<void>>());

vi.mock("@/shared/api/db", () => ({
  getPool: () => ({ query: db.query }),
  ensureSchema: () => Promise.resolve(),
  withTransaction: (work: (client: { query: QueryFn }) => Promise<unknown>) => work({ query: db.query }),
}));
vi.mock("@/features/transactions/api/attachments", () => ({ pruneAttachments: prune }));

const { openRecord, sealedIn, sealRecord } = await import("@/shared/lib/secrets");
const { forgetOpenedStates, loadState, saveChanges, stateRevision } = await import("./repo");
const { DEFAULT_STATE } = await import("@/features/data/model/defaults");

const REVISION = "2026-10-01T10:00:00.000000Z";

const FOOD: Category = { id: "food", name: "Food", icon: "🍔", colorSlot: 1, kind: "expense" };
const LUNCH: Transaction = {
  id: "t1",
  type: "expense",
  amount: 120,
  currency: "UAH",
  categoryId: "food",
  date: "2026-10-01",
};

// A month of the rent rule as it books it, or with another amount
const planned = (month: string, amount = 9000): Transaction => ({
  id: `rec:rent:${month}`,
  type: "expense",
  amount,
  currency: "UAH",
  categoryId: "food",
  date: `${month}-01`,
  recurringId: "rent",
});

// A stored settings row with its revision
const SETTINGS = { locale: "en", secret: "", revision: REVISION };

// The key a record is stored under: its id, category or date
const keyFor = (item: unknown): string => {
  const record = item !== null && typeof item === "object" ? Object.fromEntries(Object.entries(item)) : {};
  return String(record.id ?? record.categoryId ?? record.date ?? "");
};

// A row of the records table holding this item
const sealed = (collection: string, item: unknown) => ({
  collection,
  id: keyFor(item),
  secret: sealRecord(item, sealedIn.record("u1", collection, keyFor(item))),
});

// Settings sealed as the account u1 keeps them
const sealedSettings = (value: unknown) => sealRecord(value, sealedIn.settings("u1"));

// Answers loads with this settings row and these records, after the extras
const stored = (
  settings: typeof SETTINGS | null,
  records: Array<{ collection: string; id?: string; secret: string }>,
  extras: Parameters<typeof answerQueries>[1] = [],
) =>
  answerQueries(db.query, [
    ...extras,
    [/FROM settings WHERE user_id = \$1(?: FOR UPDATE)?$/u, () => (settings ? [settings] : [])],
    [/FROM records WHERE user_id = \$1$/u, () => records],
  ]);

// The parameters of the first statement that starts with this text
const paramsOf = (start: string): readonly unknown[] => {
  const call = db.query.mock.calls.find(([sql]) => sql.trimStart().startsWith(start));
  if (!call) throw new Error(`No statement starting with ${start}`);
  return call[1] ?? [];
};

// The statements that start with this text
const callsOf = (start: string) => db.query.mock.calls.filter(([sql]) => sql.trimStart().startsWith(start));

// The most queries the fake database ran at once while the work ran
const mostAtOnce = async (work: () => Promise<unknown>): Promise<number> => {
  const answer = db.query.getMockImplementation();
  let running = 0;
  let most = 0;
  db.query.mockImplementation(async (sql, params) => {
    running += 1;
    most = Math.max(most, running);
    await new Promise((resolve) => setTimeout(resolve, 0));
    running -= 1;
    return answer ? answer(sql, params) : result();
  });
  await work();
  return most;
};

describe("repo", () => {
  beforeEach(() => {
    db.query.mockReset();
    prune.mockReset();
    forgetOpenedStates();
  });

  it("opens every record into its collection and skips broken ones", async () => {
    stored({ ...SETTINGS, secret: sealedSettings({ baseCurrency: "USD", theme: "light" }) }, [
      sealed("categories", FOOD),
      sealed("transactions", LUNCH),
      sealed("budgets", { categoryId: "food", limit: 3000, currency: "UAH" }),
      sealed("receivables", { id: "r1", name: "Ann", amount: 200, currency: "UAH", date: "2026-10-01" }),
      { collection: "transactions", id: "broken", secret: "not json" },
      sealed("unknown", { id: "x" }),
    ]);
    const { state, revision } = await loadState("u1", "uk");
    expect(revision).toBe(REVISION);
    expect(state.settings).toMatchObject({ baseCurrency: "USD", theme: "light", locale: "en" });
    expect(state.categories).toEqual(expect.arrayContaining([expect.objectContaining(FOOD)]));
    expect(state.transactions).toEqual([expect.objectContaining(LUNCH)]);
    expect(state.budgets).toEqual([expect.objectContaining({ categoryId: "food", limit: 3000 })]);
    expect(state.receivables).toEqual([expect.objectContaining({ id: "r1", name: "Ann" })]);
    expect(state).not.toHaveProperty("unknown");
  });

  it("gives a new account the defaults in its language and no revision", async () => {
    stored(null, []);
    const { state, revision } = await loadState("u1", "de");
    expect(revision).toBe("");
    expect(state.settings.locale).toBe("de");
    expect(state.categories.length).toBeGreaterThan(0);
    await expect(stateRevision("u1")).resolves.toBe("");
    stored(SETTINGS, []);
    await expect(stateRevision("u1")).resolves.toBe(REVISION);
  });

  it("writes a first save sealed, with the settings", async () => {
    stored(null, [], [[/^INSERT INTO settings/u, () => [{ revision: REVISION }]]]);
    const saved = await saveChanges("u1", { transactions: { upsert: [LUNCH], remove: [] } }, null);
    expect(saved).toMatchObject({ revision: REVISION, stale: false });
    const params = paramsOf("INSERT INTO records");
    const lunch = params.indexOf("t1");
    expect(params[0]).toBe("u1");
    expect(params[lunch - 1]).toBe("transactions");
    expect(openRecord(String(params[lunch + 1]), sealedIn.record("u1", "transactions", "t1"))).toMatchObject(LUNCH);
    expect(statements(db.query).some((sql) => sql.includes("ON CONFLICT (user_id, collection, id)"))).toBe(true);
    const settings = paramsOf("INSERT INTO settings");
    expect(settings.slice(0, 2)).toEqual(["u1", "en"]);
    expect(openRecord(String(settings[2]), sealedIn.settings("u1"))).toMatchObject({ locale: "en" });
    expect(prune).toHaveBeenCalledWith(expect.anything(), "u1", []);
  });

  it("writes nothing when nothing changed and says when the base was outdated", async () => {
    stored({ ...SETTINGS, secret: sealedSettings({ baseCurrency: "UAH" }) }, [
      sealed("categories", FOOD),
      sealed("transactions", LUNCH),
    ]);
    await expect(saveChanges("u1", {}, REVISION)).resolves.toEqual({ revision: REVISION, stale: false, written: 0 });
    await expect(saveChanges("u1", { transactions: { upsert: [LUNCH], remove: [] } }, "older")).resolves.toEqual({
      revision: REVISION,
      stale: true,
      written: 0,
    });
    expect(statements(db.query).some((sql) => sql.startsWith("INSERT") || sql.startsWith("DELETE"))).toBe(false);
  });

  it("deletes removed items and keeps the photos of the rest", async () => {
    const photo = { ...LUNCH, id: "t2", attachmentIds: ["a1"] };
    stored(
      { ...SETTINGS, secret: sealedSettings({}) },
      [sealed("categories", FOOD), sealed("transactions", LUNCH), sealed("transactions", photo)],
      [[/^INSERT INTO settings/u, () => [{ revision: "next" }]]],
    );
    const saved = await saveChanges("u1", { transactions: { upsert: [], remove: ["t1"] } }, REVISION);
    expect(saved).toEqual({ revision: "next", stale: false, written: 2 });
    expect(paramsOf("DELETE FROM records")).toEqual(["u1", ["transactions"], ["t1"]]);
    expect(callsOf("INSERT INTO records")).toEqual([]);
    expect(prune).toHaveBeenCalledWith(expect.anything(), "u1", ["a1"]);
  });

  it("writes a large import in batches and changed settings alone", async () => {
    const next: Parameters<typeof answerQueries>[1] = [[/^INSERT INTO settings/u, () => [{ revision: "next" }]]];
    stored({ ...SETTINGS, secret: sealedSettings({}) }, [], next);
    const many = Array.from({ length: 1001 }, (_, i) => ({ ...LUNCH, id: `t${String(i)}` }));
    const saved = await saveChanges("u1", { transactions: { upsert: many, remove: [] } }, REVISION);
    const defaults = DEFAULT_STATE.categories.length;
    expect(saved.written).toBe(1001 + defaults + 1);
    expect(callsOf("INSERT INTO records").map(([, params]) => params?.length)).toEqual([3001, 1 + 3 * (1 + defaults)]);
    db.query.mockClear();
    const categories = DEFAULT_STATE.categories.map((category) => sealed("categories", category));
    stored({ ...SETTINGS, secret: sealedSettings({ theme: "dark" }) }, categories, next);
    const { state } = await loadState("u1");
    await saveChanges("u1", { settings: { ...state.settings, theme: "light" } }, REVISION);
    expect(callsOf("INSERT INTO records")).toEqual([]);
    expect(openRecord(String(paramsOf("INSERT INTO settings")[2]), sealedIn.settings("u1"))).toMatchObject({
      theme: "light",
    });
  });

  it("books planned months on load and stores only the ones that need it", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-15T12:00:00"), toFake: ["Date"] });
    const rule = {
      id: "rent",
      type: "expense",
      amount: 9000,
      currency: "UAH",
      categoryId: "food",
      dayOfMonth: 1,
      startMonth: "2026-10",
    };
    stored(
      { ...SETTINGS, secret: sealedSettings({}) },
      [sealed("categories", FOOD), sealed("recurring", rule), sealed("transactions", planned("2026-12"))],
      [[/^INSERT INTO settings/u, () => [{ revision: "next" }]]],
    );
    const { state } = await loadState("u1");
    expect(state.transactions.map((tx) => tx.id).toSorted()).toContain("rec:rent:2027-09");
    await saveChanges("u1", { transactions: { upsert: [planned("2027-01", 9500)], remove: [] } }, REVISION);
    const written = callsOf("INSERT INTO records").flatMap(([, params]) =>
      (params ?? []).filter((_, i) => i % 3 === 2),
    );
    expect(written.toSorted((a, b) => String(a).localeCompare(String(b)))).toEqual([
      "rec:rent:2026-10",
      "rec:rent:2027-01",
    ]);
    expect(paramsOf("DELETE FROM records")).toEqual(["u1", ["transactions"], ["rec:rent:2026-12"]]);
    vi.useRealTimers();
  });

  it("keeps the default categories when one of them changes on a new account", async () => {
    stored(null, [], [[/^INSERT INTO settings/u, () => [{ revision: "next" }]]]);
    const { state } = await loadState("u1");
    const [first] = state.categories;
    if (!first) throw new Error("No default categories");
    await saveChanges("u1", { categories: { upsert: [{ ...first, name: "Food & drink" }], remove: [] } }, null);
    const ids = callsOf("INSERT INTO records").flatMap(([, params]) => (params ?? []).filter((_, i) => i % 3 === 2));
    expect(ids).toHaveLength(DEFAULT_STATE.categories.length);
  });

  it("opens a state once per revision and again once it moves on", async () => {
    stored(SETTINGS, [sealed("transactions", LUNCH)], [[/^INSERT INTO settings/u, () => [{ revision: "next" }]]]);
    await loadState("u1");
    await loadState("u1");
    expect(callsOf("SELECT collection, id, secret FROM records")).toHaveLength(1);
    await saveChanges("u1", { transactions: { upsert: [{ ...LUNCH, amount: 9 }], remove: [] } }, REVISION);
    stored({ ...SETTINGS, revision: "next" }, []);
    expect((await loadState("u1")).state.transactions[0]?.amount).toBe(9);
    expect(callsOf("SELECT collection, id, secret FROM records")).toHaveLength(1);
    stored({ ...SETTINGS, revision: "later" }, [sealed("transactions", { ...LUNCH, amount: 5 })]);
    expect((await loadState("u1")).state.transactions[0]?.amount).toBe(5);
    expect(callsOf("SELECT collection, id, secret FROM records")).toHaveLength(2);
  });

  it("never runs two queries at once on a connection", async () => {
    stored(SETTINGS, [sealed("transactions", LUNCH)], [[/^INSERT INTO settings/u, () => [{ revision: "next" }]]]);
    await expect(mostAtOnce(() => loadState("u1"))).resolves.toBe(1);
    await expect(
      mostAtOnce(() => saveChanges("u1", { transactions: { upsert: [], remove: ["t1"] } }, REVISION)),
    ).resolves.toBe(1);
  });
});
