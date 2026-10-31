import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import { averageKept, buildProjection } from "@/features/data/model/finmath";
import type { AppState, Transaction } from "@/features/data/model/types";

// An expense with any fields changed
const tx = (over: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(36).slice(2),
  type: "expense",
  amount: 100,
  currency: "UAH",
  categoryId: "cat-food",
  date: "2026-09-10",
  ...over,
});

// The default state with one card and these entries
const state = (transactions: Transaction[]): AppState => ({
  ...DEFAULT_STATE,
  settings: { ...DEFAULT_STATE.settings, baseCurrency: "UAH" },
  savings: [{ id: "card", name: "Card", icon: "💳", kind: "card", currency: "UAH", openingBalance: 10_000 }],
  transactions,
});

describe("averageKept", () => {
  it("averages full months with any entries, leaving the month in progress out", () => {
    const s = state([
      tx({ type: "income", amount: 30_000, date: "2026-07-05" }),
      tx({ amount: 20_000, date: "2026-07-20" }),
      tx({ type: "income", amount: 30_000, date: "2026-08-05" }),
      tx({ amount: 26_000, date: "2026-08-20" }),
      tx({ type: "income", amount: 90_000, date: "2026-09-05" }),
    ]);
    expect(averageKept(s, "2026-09")).toBe(7_000);
  });

  it("is zero with nothing to go on", () => {
    expect(averageKept(state([]), "2026-09")).toBe(0);
  });
});

describe("buildProjection", () => {
  it("adds what is kept each month to the accounts, compounding with the return", () => {
    const s = state([]);
    const flat = buildProjection(s, "2026-09-29", 12, { monthlySaving: 1_000 });
    expect(flat[0]?.savings).toBe(10_000);
    expect(flat[12]?.savings).toBeCloseTo(22_000, 6);
    const none = buildProjection(s, "2026-09-29", 12, {});
    expect(none[12]?.savings).toBe(10_000);
    const growing = buildProjection(s, "2026-09-29", 12, { monthlySaving: 1_000, savingsReturnPct: 12 });
    expect(growing[12]?.savings).toBeGreaterThan(22_000);
  });

  it("lets spending more than earning run the accounts down", () => {
    const points = buildProjection(state([]), "2026-09-29", 6, { monthlySaving: -500 });
    expect(points[6]?.savings).toBeCloseTo(7_000, 6);
  });
});
