import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Transaction } from "@/features/data/model/types";

import {
  addTag,
  byDay,
  deleteEntries,
  inScope,
  isFiltering,
  ledgerFileName,
  ledgerMatcher,
  markReviewed,
  netOf,
  NO_FILTER,
  recategorisable,
  removeView,
  saveView,
  showsView,
  toReview,
  viewOf,
  scopeMonths,
  setCategory,
  signedAmount,
  type LedgerKind,
} from "./ledger";

// An entry with the given fields
const entry = (over: Partial<Transaction> & Pick<Transaction, "id" | "date">): Transaction => ({
  type: "expense",
  amount: 100,
  currency: "UAH",
  categoryId: "cat-groceries",
  ...over,
});

const state: AppState = {
  ...DEFAULT_STATE,
  transactions: [
    entry({ id: "milk", date: "2026-10-02", amount: 85, note: "Milk", tags: ["home"] }),
    entry({ id: "coffee", date: "2026-10-02", amount: 120, categoryId: "cat-coffee", accountId: "card" }),
    entry({ id: "salary", date: "2026-10-05", type: "income", amount: 40000, categoryId: "cat-salary" }),
    entry({
      id: "move",
      date: "2026-10-06",
      type: "transfer",
      amount: 1000,
      categoryId: "",
      accountId: "card",
      toAccountId: "cash",
    }),
    entry({ id: "rent", date: "2026-10-25", amount: 12000, categoryId: "cat-rent" }),
    entry({ id: "old", date: "2026-08-20", amount: 300 }),
  ],
};

// The texts a search can match: the note and the tags
const texts = (tx: Transaction) => [tx.note, ...(tx.tags ?? [])];

// The ids of the entries that pass a filter
const passing = (over: Partial<typeof NO_FILTER>, kind: LedgerKind = "all") =>
  state.transactions
    .filter(ledgerMatcher(kind, { ...NO_FILTER, ...over }, state, "2026-10-10", texts))
    .map((tx) => tx.id);

describe("ledgerMatcher", () => {
  it("narrows by kind, timing, category with its subcategories, account and tag", () => {
    expect(passing({}, "income")).toEqual(["salary"]);
    expect(passing({ timing: "planned" })).toEqual(["rent"]);
    expect(passing({ categoryId: "cat-food" })).toEqual(["milk", "coffee", "old"]);
    expect(passing({ accountId: "cash" })).toEqual(["move"]);
    expect(passing({ tag: "home" })).toEqual(["milk"]);
  });

  it("searches the texts and the digits of the amount", () => {
    expect(passing({ query: " MILK " })).toEqual(["milk"]);
    expect(passing({ query: "12 000" })).toEqual(["rent"]);
    expect(passing({ query: "nothing" })).toEqual([]);
  });
});

describe("isFiltering", () => {
  it("tells a narrowed list from the whole one", () => {
    expect(isFiltering(NO_FILTER)).toBe(false);
    expect(isFiltering({ ...NO_FILTER, query: "  " })).toBe(false);
    expect(isFiltering({ ...NO_FILTER, tag: "home" })).toBe(true);
  });
});

describe("scopes", () => {
  it("reaches back a quarter or covers the year", () => {
    expect(scopeMonths("quarter", "2026-02")).toEqual({ start: "2025-12", end: "2026-02" });
    expect(scopeMonths("year", "2026-02")).toEqual({ start: "2026-01", end: "2026-12" });
    expect(inScope(state.transactions[5]!, "month", "2026-10")).toBe(false);
    expect(inScope(state.transactions[5]!, "quarter", "2026-10")).toBe(true);
    expect(inScope(state.transactions[5]!, "all", "2020-01")).toBe(true);
  });

  it("names the CSV file after the scope", () => {
    expect(ledgerFileName("month", "2026-10", "2026-10-10")).toBe("entries-2026-10.csv");
    expect(ledgerFileName("quarter", "2026-10", "2026-10-10")).toBe("entries-2026-08_2026-10.csv");
    expect(ledgerFileName("all", "2026-10", "2026-10-10")).toBe("entries-all-2026-10-10.csv");
  });
});

describe("amounts", () => {
  it("signs expenses and leaves transfers out of the net", () => {
    expect(signedAmount(state, state.transactions[0]!)).toBe(-85);
    expect(netOf(state, state.transactions)).toBe(40000 - 85 - 120 - 12000 - 300);
  });

  it("groups the entries by day in their order", () => {
    expect([...byDay(state.transactions.slice(0, 3))].map(([day, list]) => [day, list.length])).toEqual([
      ["2026-10-02", 2],
      ["2026-10-05", 1],
    ]);
  });
});

describe("bulk changes", () => {
  const picked = new Set(["milk", "salary"]);

  it("recategorises only the entries the category fits", () => {
    const ids = recategorisable(state, picked, "cat-coffee");
    expect([...ids]).toEqual(["milk"]);
    expect(setCategory(state, ids, "cat-coffee").transactions[0]?.categoryId).toBe("cat-coffee");
    expect(recategorisable(state, picked, "nowhere").size).toBe(0);
  });

  it("tags and deletes the picked entries", () => {
    expect(addTag(state, picked, "Trip").transactions[0]?.tags).toEqual(["home", "Trip"]);
    expect(deleteEntries(state, picked).transactions.map((tx) => tx.id)).toEqual(["coffee", "move", "rent", "old"]);
  });
});

describe("the review queue and saved views", () => {
  const imported: AppState = {
    ...state,
    transactions: [...state.transactions, entry({ id: "bank", date: "2026-10-07", unreviewed: true })],
  };

  it("finds the bank's entries to look over and takes them as they are", () => {
    expect(toReview(imported.transactions).map((tx) => tx.id)).toEqual(["bank"]);
    const matcher = ledgerMatcher("all", { ...NO_FILTER, review: true }, imported, "2026-10-15", () => []);
    expect(imported.transactions.filter(matcher).map((tx) => tx.id)).toEqual(["bank"]);
    expect(isFiltering({ ...NO_FILTER, review: true })).toBe(true);
    const done = markReviewed(imported, new Set(["bank"]));
    expect(toReview(done.transactions)).toEqual([]);
    expect(done.transactions.at(-1)).not.toHaveProperty("unreviewed");
  });

  it("keeps a search under a name, replaces one of the same name and removes it", () => {
    const filter = { ...NO_FILTER, query: " coffee ", tag: "home" };
    const view = viewOf("v1", "  Coffee  ", "expense", "year", filter);
    expect(view).toMatchObject({ name: "Coffee", query: "coffee", scope: "year", tag: "home" });
    expect(showsView(view, "expense", "year", filter)).toBe(true);
    expect(showsView(view, "expense", "month", filter)).toBe(false);
    const saved = saveView(saveView(state, view), { ...view, id: "v2", name: "coffee", tag: "" });
    expect(saved.settings.ledgerViews?.map((item) => item.id)).toEqual(["v2"]);
    expect(removeView(saved, "v2").settings.ledgerViews).toBeUndefined();
  });
});
