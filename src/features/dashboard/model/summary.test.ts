import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";

import { averageSpending, hasAnyData, holdingRows, savingsRate, type MonthFigures } from "./summary";

// A month's figures
const month = (name: string, income: number, expense: number): MonthFigures => ({
  month: name,
  income,
  expense,
  net: income - expense,
});

describe("savingsRate", () => {
  it("is the share of income kept, or zero without income", () => {
    expect(savingsRate({ income: 1000, net: 250 })).toBe(25);
    expect(savingsRate({ income: 0, net: -100 })).toBe(0);
  });
});

describe("hasAnyData", () => {
  it("is false only for an empty state", () => {
    expect(hasAnyData(DEFAULT_STATE)).toBe(false);
    expect(
      hasAnyData({
        ...DEFAULT_STATE,
        debts: [{ id: "d", name: "Loan", icon: "🏦", kind: "loan", currency: "UAH", balance: 1 }],
      }),
    ).toBe(true);
  });
});

describe("averageSpending", () => {
  it("averages the months that had spending", () => {
    const series = [month("2026-07", 0, 0), month("2026-08", 1000, 400), month("2026-09", 0, 200)];
    expect(averageSpending(series)).toBe(300);
    expect(averageSpending([month("2026-07", 0, 0)])).toBe(0);
  });
});

describe("holdingRows", () => {
  it("keeps the holdings worth something, the largest first, with stable colours", () => {
    const state: AppState = {
      ...DEFAULT_STATE,
      savings: [
        { id: "small", name: "Small", icon: "💳", kind: "card", currency: "UAH", openingBalance: 100 },
        { id: "empty", name: "Empty", icon: "💳", kind: "card", currency: "UAH", openingBalance: 0 },
        { id: "big", name: "Big", icon: "💳", kind: "card", currency: "UAH", openingBalance: 900 },
      ],
    };
    expect(holdingRows(state, "2026-10-10").map((row) => [row.holding.id, row.colorSlot])).toEqual([
      ["big", 3],
      ["small", 1],
    ]);
  });
});
