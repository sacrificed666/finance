import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Transaction } from "@/features/data/model/types";

import { monthSummary, plannedAmount } from "./monthSummary";

// An entry in hryvnias
const entry = (
  id: string,
  type: Transaction["type"],
  amount: number,
  date: string,
  categoryId: string,
): Transaction => ({
  id,
  type,
  amount,
  currency: "UAH",
  categoryId,
  date,
});

const state: AppState = {
  ...DEFAULT_STATE,
  transactions: [
    entry("salary-sep", "income", 40000, "2026-09-05", "cat-salary"),
    entry("food-sep", "expense", 9000, "2026-09-12", "cat-groceries"),
    entry("salary-oct", "income", 42000, "2026-10-05", "cat-salary"),
    entry("food-oct", "expense", 5000, "2026-10-08", "cat-groceries"),
    entry("rent-oct", "expense", 12000, "2026-10-25", "cat-rent"),
  ],
  budgets: [
    { categoryId: "cat-food", limit: 4000, currency: "UAH" },
    { categoryId: "cat-housing", limit: 15000, currency: "UAH" },
  ],
};

describe("monthSummary", () => {
  it("compares the month with the one before and keeps the planned entries apart", () => {
    const summary = monthSummary(state, "2026-10", "2026-10-10");
    expect(summary.totals.expense).toBe(17000);
    expect(summary.previous.expense).toBe(9000);
    expect(summary.hasPrevious).toBe(true);
    expect(summary.isCurrent).toBe(true);
    expect(summary.plannedExpense).toBe(12000);
    expect(summary.spentSoFar).toBe(5000);
    expect(summary.perDay).toBe(500);
    expect(summary.previousPerDay).toBe(0);
    expect(summary.soFar).toEqual({ income: 42000, expense: 5000, net: 37000 });
    expect(summary.previousSoFar).toEqual({ income: 40000, expense: 0, net: 40000 });
    expect(summary.projected).toBe(27500);
    expect(summary.expenseCount).toBe(2);
    expect(summary.spendingMonths).toBe(2);
    expect(summary.averageSpend).toBe(13000);
  });

  it("pays the month's bills once and spreads only everyday spending", () => {
    const rent = { ...entry("rent-1", "expense", 12000, "2026-10-01", "cat-rent"), recurringId: "rent" };
    const summary = monthSummary(
      { ...state, transactions: [rent, entry("food", "expense", 1000, "2026-10-08", "cat-groceries")] },
      "2026-10",
      "2026-10-10",
    );
    expect(summary.projected).toBe(12000 + 3100);
  });

  it("counts every day of a month that has passed", () => {
    const summary = monthSummary(state, "2026-09", "2026-10-10");
    expect(summary.isCurrent).toBe(false);
    expect(summary.hasPrevious).toBe(false);
    expect(summary.perDay).toBe(300);
  });
});

describe("plannedAmount", () => {
  it("adds up the entries after today", () => {
    expect(plannedAmount(state, "2026-10", "2026-10-10", "expense")).toBe(12000);
    expect(plannedAmount(state, "2026-10", "2026-10-10", "income")).toBe(0);
  });
});
