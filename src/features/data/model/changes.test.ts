import { describe, expect, it } from "vitest";

import {
  applyChanges,
  changeSize,
  COLLECTION_NAMES,
  describeChanges,
  diffState,
  isEmptyChange,
  parseChanges,
  stableJson,
} from "@/features/data/model/changes";
import { DEFAULT_STATE } from "@/features/data/model/defaults";
import { normalizeState } from "@/features/data/model/normalize";
import type { AppState, Transaction } from "@/features/data/model/types";

// An expense with an id, amount and date
const tx = (id: string, amount = 100, date = "2026-09-01"): Transaction => ({
  id,
  type: "expense",
  amount,
  currency: "UAH",
  categoryId: "cat-food",
  date,
});

// The default state with these entries
const withTx = (...transactions: Transaction[]): AppState => ({ ...DEFAULT_STATE, transactions });

describe("diffState", () => {
  it("finds nothing between a state and itself", () => {
    const s = withTx(tx("a"), tx("b"));
    expect(isEmptyChange(diffState(s, s))).toBe(true);
  });

  it("sends only the record that was edited, added or removed", () => {
    const a = tx("a");
    const b = tx("b");
    const before = withTx(a, b);
    const after = { ...before, transactions: [a, { ...b, amount: 250 }, tx("c")] };
    const changes = diffState(before, after);
    expect(changes.transactions?.upsert.map((t) => t.id)).toEqual(["b", "c"]);
    expect(changes.transactions?.remove).toEqual([]);
    expect(changes.categories).toBeUndefined();

    const removed = diffState(before, { ...before, transactions: [a] });
    expect(removed.transactions).toEqual({ upsert: [], remove: ["b"] });
  });

  it("keys budgets by category and snapshots by date", () => {
    const before: AppState = { ...DEFAULT_STATE, budgets: [{ categoryId: "cat-food", limit: 100, currency: "UAH" }] };
    const after: AppState = { ...before, budgets: [{ categoryId: "cat-food", limit: 200, currency: "UAH" }] };
    expect(diffState(before, after).budgets?.upsert[0]?.limit).toBe(200);
  });

  it("notices settings only when they were replaced", () => {
    const s = withTx();
    expect(diffState(s, { ...s, settings: { ...s.settings, theme: "light" } }).settings?.theme).toBe("light");
    expect(diffState(s, { ...s, transactions: [tx("a")] }).settings).toBeUndefined();
  });

  it("names the fields of an edited record and sends a new one whole", () => {
    const a = tx("a");
    const before = withTx(a);
    const after = { ...before, transactions: [{ ...a, amount: 7, note: "taxi" }, tx("b")] };
    expect(diffState(before, after).transactions?.fields).toEqual({ a: ["amount", "note"] });
  });

  it("skips a record copied without a change", () => {
    const before = withTx(tx("a"));
    expect(diffState(before, { ...before, transactions: [tx("a")] })).toEqual({});
  });

  it("names the settings that changed and single keys of their maps", () => {
    const s = withTx();
    const after = { ...s, settings: { ...s.settings, theme: "dark" as const, taxPaid: { "2026-q3": "2026-10-20" } } };
    expect(diffState(s, after).settingsFields).toEqual(["theme", "taxPaid.2026-q3"]);
    expect(diffState(s, { ...s, settings: { ...s.settings } })).toEqual({});
  });
});

describe("applyChanges", () => {
  it("replays a diff to reach the same state", () => {
    const before = withTx(tx("a"), tx("b"), tx("c"));
    const after = { ...before, transactions: [tx("a", 5), before.transactions[2]!, tx("d")] };
    const rebuilt = applyChanges(before, diffState(before, after));
    expect(stableJson(rebuilt.transactions)).toBe(stableJson(after.transactions));
  });

  it("merges edits from two devices that touched different records", () => {
    const server = withTx(tx("a"), tx("b"));
    const mine = diffState(server, { ...server, transactions: [tx("a", 1), server.transactions[1]!] });
    const theirs = diffState(server, { ...server, transactions: [server.transactions[0]!, tx("b", 2)] });
    const merged = applyChanges(applyChanges(server, theirs), mine);
    expect(merged.transactions.map((t) => t.amount)).toEqual([1, 2]);
  });

  it("merges two devices' edits to different fields of one record", () => {
    const server = withTx(tx("a"));
    const base = server.transactions[0]!;
    const mine = diffState(server, { ...server, transactions: [{ ...base, amount: 1 }] });
    const theirs = diffState(server, { ...server, transactions: [{ ...base, note: "lunch" }] });
    const merged = applyChanges(applyChanges(server, theirs), mine);
    expect(merged.transactions[0]).toMatchObject({ amount: 1, note: "lunch" });
  });

  it("takes a field out of a record when the edit removed it", () => {
    const server = withTx({ ...tx("a"), note: "old" });
    const { note: _note, ...bare } = server.transactions[0]!;
    const merged = applyChanges(server, diffState(server, { ...server, transactions: [bare] }));
    expect(merged.transactions[0]).not.toHaveProperty("note");
  });

  it("keeps settings another tab saved when a stale tab refreshes the rates", () => {
    const stale = withTx();
    const server = { ...stale, settings: { ...stale.settings, theme: "dark" as const, taxPaid: { q3: "2026-10-20" } } };
    const refreshed = { ...stale, settings: { ...stale.settings, rates: { USD: 41.5, EUR: 48.2 } } };
    const merged = applyChanges(server, diffState(stale, refreshed));
    expect(merged.settings).toMatchObject({ theme: "dark", taxPaid: { q3: "2026-10-20" }, rates: { USD: 41.5 } });
  });

  it("merges the keys of a map setting from two devices and drops a removed one", () => {
    const base = withTx();
    const server = { ...base, settings: { ...base.settings, taxPaid: { q2: "2026-07-20", q3: "2026-10-20" } } };
    const mine = { ...base, settings: { ...base.settings, taxPaid: { q2: "2026-07-20", q4: "2027-01-20" } } };
    const merged = applyChanges(server, diffState({ ...server, settings: { ...server.settings } }, mine));
    expect(merged.settings.taxPaid).toEqual({ q2: "2026-07-20", q4: "2027-01-20" });
    const added = applyChanges(server, diffState(base, mine));
    expect(added.settings.taxPaid).toEqual({ q2: "2026-07-20", q3: "2026-10-20", q4: "2027-01-20" });
  });

  it("replaces settings whole when a change does not name its fields", () => {
    const s = withTx();
    const server = { ...s, settings: { ...s.settings, theme: "dark" as const } };
    expect(applyChanges(server, { settings: s.settings }).settings.theme).toBe("system");
  });

  it("ignores field lists under keys an object inherits", () => {
    const s = withTx(tx("constructor"));
    const edited = { ...tx("constructor"), amount: 3 };
    const change = { upsert: [edited], remove: [], fields: { other: ["note"] } };
    expect(applyChanges(s, { transactions: change }).transactions[0]?.amount).toBe(3);
  });

  it("keeps an upsert that arrives together with a removal of the same key", () => {
    const s = withTx(tx("a"));
    const out = applyChanges(s, { transactions: { upsert: [tx("a", 9)], remove: ["a"] } });
    expect(out.transactions.map((t) => t.amount)).toEqual([9]);
  });

  it("counts what a change touches", () => {
    expect(
      changeSize({ transactions: { upsert: [tx("a")], remove: ["b", "c"] }, settings: DEFAULT_STATE.settings }),
    ).toBe(4);
  });
});

describe("parseChanges", () => {
  it("accepts a well-formed change set and ignores unknown collections", () => {
    const parsed = parseChanges({ transactions: { upsert: [tx("a")], remove: ["b"] }, nonsense: 1 });
    expect(parsed?.transactions?.remove).toEqual(["b"]);
  });

  it("keeps the fields of edited records and of settings", () => {
    const parsed = parseChanges({
      transactions: { upsert: [tx("a")], remove: [], fields: { a: ["amount"] } },
      settings: DEFAULT_STATE.settings,
      settingsFields: ["theme"],
    });
    expect(parsed?.transactions?.fields).toEqual({ a: ["amount"] });
    expect(parsed?.settingsFields).toEqual(["theme"]);
    expect(parseChanges({ settings: DEFAULT_STATE.settings })?.settingsFields).toBeUndefined();
  });

  it("rejects the wrong shapes", () => {
    expect(parseChanges(null)).toBeNull();
    expect(parseChanges({ transactions: [] })).toBeNull();
    expect(parseChanges({ transactions: { upsert: [1], remove: [] } })).toBeNull();
    expect(parseChanges({ transactions: { upsert: [], remove: [1] } })).toBeNull();
    expect(parseChanges({ transactions: { upsert: [], remove: [], fields: { a: [1] } } })).toBeNull();
    expect(parseChanges({ settings: "dark" })).toBeNull();
    expect(parseChanges({ settings: {}, settingsFields: "theme" })).toBeNull();
  });
});

describe("stableJson", () => {
  it("ignores key order and missing-versus-undefined fields", () => {
    expect(stableJson({ a: 1, b: { c: 2, d: 3 } })).toBe(stableJson({ b: { d: 3, c: 2 }, a: 1 }));
    expect(stableJson({ a: 1, note: undefined })).toBe(stableJson({ a: 1 }));
  });
});

describe("normalizeState", () => {
  it("is idempotent, so an unchanged record never looks changed", () => {
    const raw = {
      ...DEFAULT_STATE,
      transactions: [tx("a"), { ...tx("b"), tags: ["Trip", "trip", "#work"], note: "  coffee  " }],
      budgets: [{ categoryId: "cat-food", limit: 5000, currency: "UAH", rollover: true }],
      snapshots: [
        {
          date: "2026-09-01",
          total: 1,
          savings: 1,
          investments: 0,
          debts: 0,
          receivables: 0,
          rates: { USD: 41, EUR: 45 },
        },
      ],
    };
    const once = normalizeState(raw);
    const twice = normalizeState(once);
    expect(stableJson(twice)).toBe(stableJson(once));
  });
});

describe("every collection", () => {
  // One item in each collection, normalized as a backup would be
  const FULL = normalizeState({
    version: 1,
    transactions: [tx("t")],
    categories: [{ id: "c", name: "C", icon: "⭐", colorSlot: 1, kind: "expense" }],
    recurring: [
      { id: "r", type: "expense", amount: 1, currency: "UAH", categoryId: "c", dayOfMonth: 1, startMonth: "2026-01" },
    ],
    subscriptions: [
      { id: "s", name: "S", icon: "🎵", price: 1, currency: "UAH", dayOfMonth: 1, startMonth: "2026-01", active: true },
    ],
    savings: [{ id: "a", name: "A", icon: "💳", kind: "card", currency: "UAH", openingBalance: 0 }],
    investments: [
      {
        id: "i",
        name: "I",
        kind: "bonds",
        currency: "UAH",
        principal: 1,
        annualRatePct: 1,
        startDate: "2026-01-01",
        compounding: "payout",
        compoundingFreq: "monthly",
      },
    ],
    budgets: [{ categoryId: "c", limit: 1, currency: "UAH" }],
    debts: [{ id: "d", name: "D", icon: "🏦", kind: "loan", currency: "UAH", balance: 1 }],
    rules: [{ id: "u", match: "x", categoryId: "c" }],
    receivables: [{ id: "l", name: "L", amount: 1, currency: "UAH", date: "2026-01-01", repaid: 0 }],
    wishlist: [{ id: "w", name: "W", price: 1, currency: "UAH" }],
    plannedEvents: [{ id: "p", month: "2026-12", amount: 1, currency: "UAH" }],
    snapshots: [{ date: "2026-01-01", total: 1, savings: 1, investments: 0, debts: 0 }],
  });

  it("removes each item by its own key", () => {
    const empty = { ...FULL, ...Object.fromEntries(COLLECTION_NAMES.map((name) => [name, []])) };
    const changes = diffState(FULL, empty);
    expect(Object.fromEntries(COLLECTION_NAMES.map((name) => [name, changes[name]?.remove]))).toEqual({
      transactions: ["t"],
      categories: ["c"],
      recurring: ["r"],
      subscriptions: ["s"],
      savings: ["a"],
      investments: ["i"],
      budgets: ["c"],
      debts: ["d"],
      rules: ["u"],
      receivables: ["l"],
      wishlist: ["w"],
      plannedEvents: ["p"],
      snapshots: ["2026-01-01"],
    });
    expect(changeSize(changes)).toBe(13);
    expect(applyChanges(FULL, changes)).toEqual(empty);
  });

  it("describes a change set for the log", () => {
    expect(describeChanges({})).toBe("nothing");
    expect(
      describeChanges({ transactions: { upsert: [tx("a"), tx("b")], remove: ["c"] }, settings: FULL.settings }),
    ).toBe("transactions +2 \u22121, settings");
  });
});
