import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Transaction } from "@/features/data/model/types";

import {
  budgetProgress,
  budgetSpent,
  budgetTotals,
  canAddBudget,
  deleteBudget,
  moveBetweenBudgets,
  runsOutOn,
  saveBudget,
  suggestedLimit,
  unbudgetedSpending,
  yearlyShare,
} from "./budgets";

// An expense in hryvnias
const spend = (amount: number, date: string, categoryId: string): Transaction => ({
  id: `${date}:${categoryId}`,
  type: "expense",
  amount,
  currency: "UAH",
  categoryId,
  date,
});

const state: AppState = {
  ...DEFAULT_STATE,
  transactions: [
    spend(3000, "2026-09-10", "cat-groceries"),
    spend(5000, "2026-10-08", "cat-groceries"),
    spend(12000, "2026-10-05", "cat-rent"),
    spend(700, "2026-10-06", "cat-transport"),
  ],
  budgets: [
    { categoryId: "cat-food", limit: 4000, currency: "UAH", rollover: true },
    { categoryId: "cat-housing", limit: 15000, currency: "UAH" },
  ],
};

describe("budgetTotals", () => {
  it("adds up the limits and spending and counts the budgets over", () => {
    expect(budgetTotals(state, "2026-10")).toEqual({ limit: 20000, spent: 17000, over: 0 });
    expect(budgetTotals(state, "2026-09")).toMatchObject({ limit: 23000, spent: 3000, over: 0 });
  });

  it("counts a subcategory's budget inside its parent's once", () => {
    const nested = {
      ...state,
      budgets: [...state.budgets, { categoryId: "cat-groceries", limit: 2000, currency: "UAH" as const }],
    };
    expect(budgetTotals(nested, "2026-10")).toEqual({ limit: 20000, spent: 17000, over: 1 });
    expect(unbudgetedSpending(nested, "2026-10")).toBe(700);
  });
});

describe("unbudgetedSpending", () => {
  it("gives the spending outside every budget", () => {
    expect(unbudgetedSpending(state, "2026-10")).toBe(700);
  });
});

describe("budgetProgress", () => {
  it("carries over what the month before left", () => {
    const [food] = state.budgets;
    expect(budgetProgress(state, food!, "2026-10")).toEqual({
      limit: 5000,
      spent: 5000,
      moved: 0,
      carried: 1000,
      share: 1,
    });
  });
});

describe("runsOutOn", () => {
  it("projects the day the money ends at this pace", () => {
    expect(runsOutOn(3000, 9000, "2026-10", "2026-10-05")).toBe("2026-10-16");
    expect(runsOutOn(1000, 9000, "2026-10", "2026-10-05")).toBeNull();
  });

  it("waits for a few days and skips spent budgets and other months", () => {
    expect(runsOutOn(3000, 9000, "2026-10", "2026-10-02")).toBeNull();
    expect(runsOutOn(9000, 9000, "2026-10", "2026-10-05")).toBeNull();
    expect(runsOutOn(3000, 9000, "2026-09", "2026-10-05")).toBeNull();
  });
});

describe("canAddBudget", () => {
  it("allows a budget while an expense category has none", () => {
    expect(canAddBudget(state)).toBe(true);
    const everything = state.categories.filter((entry) => entry.kind === "expense");
    const full = {
      ...state,
      budgets: everything.map((entry) => ({ categoryId: entry.id, limit: 1, currency: "UAH" as const })),
    };
    expect(canAddBudget(full)).toBe(false);
  });
});

describe("saveBudget", () => {
  it("adds a budget and moves one to another category", () => {
    const added = saveBudget(state, { categoryId: "cat-transport", limit: 2000, currency: "UAH" }, null);
    expect(added.budgets.map((budget) => budget.categoryId)).toEqual(["cat-food", "cat-housing", "cat-transport"]);
    const moved = saveBudget(state, { categoryId: "cat-transport", limit: 4000, currency: "UAH" }, "cat-food");
    expect(moved.budgets.map((budget) => budget.categoryId)).toEqual(["cat-housing", "cat-transport"]);
  });
});

describe("deleteBudget", () => {
  it("drops the budget of a category", () => {
    expect(deleteBudget(state, "cat-food").budgets.map((budget) => budget.categoryId)).toEqual(["cat-housing"]);
  });
});

describe("yearly budgets", () => {
  const yearly: AppState = {
    ...state,
    budgets: [...state.budgets, { categoryId: "cat-transport", limit: 6000, currency: "UAH", period: "yearly" }],
    transactions: [
      ...state.transactions,
      spend(1300, "2026-03-02", "cat-transport"),
      spend(400, "2025-12-30", "cat-transport"),
    ],
  };
  const travel = yearly.budgets[2]!;

  it("counts the year's spending up to the month and carries nothing", () => {
    expect(budgetSpent(yearly, travel, "2026-10")).toBe(2000);
    expect(budgetSpent(yearly, travel, "2026-09")).toBe(1300);
    expect(budgetProgress(yearly, { ...travel, rollover: true }, "2026-10")).toMatchObject({ limit: 6000, carried: 0 });
  });

  it("stays out of the month's totals without counting as spending outside budgets", () => {
    expect(budgetTotals(yearly, "2026-10")).toEqual(budgetTotals(state, "2026-10"));
    expect(unbudgetedSpending(yearly, "2026-10")).toBe(unbudgetedSpending(state, "2026-10") - 700);
  });

  it("gives a month the rest of the year's limit over the months to go", () => {
    expect(yearlyShare(yearly, "2026-10")).toEqual({ limit: (6000 - 1300) / 3, spent: 700 });
    expect(yearlyShare(yearly, "2026-01")).toEqual({ limit: 500, spent: 0 });
    expect(yearlyShare(state, "2026-10")).toEqual({ limit: 0, spent: 0 });
  });

  it("says on which day of the year the limit runs out at this pace", () => {
    expect(runsOutOn(4000, 6000, "2026-05", "2026-05-31", true)).toBe("2026-08-15");
    expect(runsOutOn(4000, 6000, "2026-04", "2026-05-31", true)).toBeNull();
    expect(runsOutOn(1000, 6000, "2026-05", "2026-05-31", true)).toBeNull();
  });
});

describe("moving a month's rest and suggested limits", () => {
  it("moves part of one budget's month into another, for that month only", () => {
    const moved = moveBetweenBudgets(state, "cat-housing", "cat-food", "2026-10", 1500);
    expect(budgetProgress(moved, moved.budgets[1]!, "2026-10")).toMatchObject({ limit: 13500, moved: -1500 });
    expect(budgetProgress(moved, moved.budgets[0]!, "2026-10")).toMatchObject({ moved: 1500, carried: 1000 });
    expect(budgetProgress(moved, moved.budgets[1]!, "2026-11").limit).toBe(15000);
    const back = moveBetweenBudgets(moved, "cat-food", "cat-housing", "2026-10", 1500);
    expect(back.budgets.every((budget) => budget.moved === undefined)).toBe(true);
    expect(moveBetweenBudgets(state, "cat-food", "cat-food", "2026-10", 10)).toBe(state);
  });

  it("suggests a month's average of the last three, or the last year, rounded up", () => {
    expect(suggestedLimit(state, "cat-groceries", "UAH", "2026-11", false)).toBe(2700);
    expect(suggestedLimit(state, "cat-groceries", "UAH", "2026-11", true)).toBe(8000);
    expect(suggestedLimit(state, "cat-pets", "UAH", "2026-11", false)).toBe(0);
  });
});
