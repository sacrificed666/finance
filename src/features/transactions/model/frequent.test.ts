import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Transaction } from "@/features/data/model/types";

import { frequentEntries } from "./frequent";

// An expense in hryvnias on a day
const spent = (id: string, date: string, over: Partial<Transaction> = {}): Transaction => ({
  id,
  type: "expense",
  amount: 85,
  currency: "UAH",
  categoryId: "cat-coffee",
  date,
  note: "Coffee",
  accountId: "card",
  ...over,
});

const state: AppState = {
  ...DEFAULT_STATE,
  transactions: [
    spent("c1", "2026-10-01"),
    spent("c2", "2026-10-05"),
    spent("c3", "2026-10-09"),
    spent("s1", "2026-10-02", { categoryId: "cat-groceries", note: "Silpo", amount: 792 }),
    spent("s2", "2026-10-08", { categoryId: "cat-groceries", note: " silpo ", amount: 693 }),
    spent("once", "2026-10-03", { categoryId: "cat-taxi", note: "Uklon", amount: 520 }),
    spent("rent", "2026-10-01", { categoryId: "cat-rent", note: "Rent", recurringId: "r" }),
    spent("rent2", "2026-09-01", { categoryId: "cat-rent", note: "Rent", recurringId: "r" }),
    spent("old", "2026-05-01"),
    spent("later", "2026-10-20"),
  ],
};

describe("frequentEntries", () => {
  it("offers what is typed most often lately, with the amount only when it repeats", () => {
    expect(frequentEntries(state, "expense", "2026-10-10")).toEqual([
      {
        key: "cat-coffee|coffee",
        categoryId: "cat-coffee",
        note: "Coffee",
        accountId: "card",
        currency: "UAH",
        amount: 85,
        count: 3,
      },
      {
        key: "cat-groceries|silpo",
        categoryId: "cat-groceries",
        note: "silpo",
        accountId: "card",
        currency: "UAH",
        amount: null,
        count: 2,
      },
    ]);
  });

  it("leaves out other kinds and keeps to the limit", () => {
    expect(frequentEntries(state, "income", "2026-10-10")).toEqual([]);
    expect(frequentEntries(state, "expense", "2026-10-10", 1)).toHaveLength(1);
  });
});
