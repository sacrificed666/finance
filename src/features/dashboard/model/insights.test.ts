import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Transaction } from "@/features/data/model/types";
import { profileFromRegime } from "@/features/income/model/tax";

import { dashboardInsights } from "./insights";

// An expense in hryvnias on a day
const spend = (id: string, date: string, amount: number, categoryId = "cat-groceries", note?: string): Transaction => ({
  id,
  type: "expense",
  amount,
  currency: "UAH",
  categoryId,
  date,
  note,
});

// The default account without a tax calendar, so taxes stay quiet
const quiet: AppState = {
  ...DEFAULT_STATE,
  settings: { ...DEFAULT_STATE.settings, tax: { ...DEFAULT_STATE.settings.tax, regime: "none" } },
};

describe("dashboardInsights", () => {
  it("leads with an overdue tax", () => {
    const [first] = dashboardInsights(
      { ...DEFAULT_STATE, settings: { ...DEFAULT_STATE.settings, tax: profileFromRegime("fop3") } },
      "2026-10-22",
    );
    expect(first).toMatchObject({ kind: "tax", obligation: { kind: "esv", due: "2026-10-20" } });
  });

  it("says nothing when all is calm", () => {
    expect(dashboardInsights(quiet, "2026-10-22")).toEqual([]);
  });

  it("points out a late loan, a budget past its limit and a category that moved", () => {
    const state: AppState = {
      ...quiet,
      receivables: [
        {
          id: "oleh",
          name: "Oleh",
          icon: "🤝",
          amount: 1000,
          currency: "UAH",
          date: "2026-09-01",
          dueDate: "2026-10-01",
          repaid: 0,
        },
      ],
      budgets: [{ categoryId: "cat-food", limit: 500, currency: "UAH" }],
      transactions: [spend("now", "2026-10-05", 800), spend("before", "2026-09-05", 200)],
    };
    expect(dashboardInsights(state, "2026-10-22").map((insight) => insight.kind)).toEqual(["loan", "over", "change"]);
  });

  it("warns that a budget runs out before the month ends", () => {
    const state: AppState = {
      ...quiet,
      budgets: [{ categoryId: "cat-food", limit: 1000, currency: "UAH" }],
      transactions: [spend("now", "2026-10-05", 900)],
    };
    expect(dashboardInsights(state, "2026-10-10")).toEqual([
      expect.objectContaining({ kind: "runsOut", categoryId: "cat-food", date: "2026-10-12" }),
    ]);
  });

  it("waits a week into the month before comparing it, and skips a small change", () => {
    const state: AppState = {
      ...quiet,
      transactions: [spend("now", "2026-10-02", 210), spend("before", "2026-09-02", 200)],
    };
    expect(dashboardInsights(state, "2026-10-05").map((insight) => insight.kind)).toEqual(["recap"]);
    expect(dashboardInsights(state, "2026-10-12")).toEqual([]);
  });

  it("sums the month before up through the first week of a new one", () => {
    const state: AppState = {
      ...quiet,
      transactions: [
        spend("rent", "2026-09-01", 9000, "cat-rent"),
        spend("milk", "2026-09-02", 1000),
        { ...spend("pay", "2026-09-05", 15000, "cat-salary"), type: "income" },
      ],
    };
    expect(dashboardInsights(state, "2026-10-03")).toEqual([
      { kind: "recap", month: "2026-09", income: 15000, expense: 10000, categoryId: "cat-housing" },
    ]);
    expect(dashboardInsights(state, "2026-10-08")).toEqual([]);
  });

  it("leaves a category out until it has spent something this month", () => {
    const state: AppState = { ...quiet, transactions: [spend("before", "2026-09-02", 2000)] };
    expect(dashboardInsights(state, "2026-10-12")).toEqual([]);
  });

  it("offers a repeating charge as a subscription until it is dismissed", () => {
    const state: AppState = {
      ...quiet,
      transactions: ["2026-07-03", "2026-08-03", "2026-09-03", "2026-10-03"].map((date, index) =>
        spend(`gym-${String(index)}`, date, 600, "cat-groceries", "Sport Life"),
      ),
    };
    const insight = dashboardInsights(state, "2026-10-12")[0];
    expect(insight).toMatchObject({ kind: "subscription", suggestion: { name: "Sport Life" } });
    if (insight?.kind !== "subscription") return;
    expect(dashboardInsights(state, "2026-10-12", [insight.suggestion.key])).toEqual([]);
  });

  it("warns of an account that planned payments take below zero within two weeks", () => {
    const state: AppState = {
      ...quiet,
      savings: [{ id: "card", name: "Card", icon: "💳", kind: "card", currency: "UAH", openingBalance: 1000 }],
      transactions: [{ ...spend("rent", "2026-10-27", 1500, "cat-rent"), accountId: "card" }],
    };
    expect(dashboardInsights(state, "2026-10-22")).toEqual([
      { kind: "short", account: state.savings[0], date: "2026-10-27", balance: -500 },
    ]);
    expect(dashboardInsights(state, "2026-10-12")).toEqual([]);
  });

  it("points out an expense far above what is usual for its place", () => {
    const state: AppState = {
      ...quiet,
      transactions: [
        spend("a", "2026-08-03", 500, "cat-groceries", "Silpo"),
        spend("b", "2026-09-03", 600, "cat-groceries", "Silpo"),
        spend("c", "2026-09-20", 400, "cat-groceries", "Silpo"),
        spend("big", "2026-10-11", 2000, "cat-groceries", "Silpo"),
        spend("calm", "2026-10-12", 700, "cat-groceries", "Silpo"),
      ],
    };
    expect(dashboardInsights(state, "2026-10-12")[0]).toEqual({ kind: "unusual", tx: state.transactions[3], times: 4 });
  });

  it("notices a bill that costs more than in the months before", () => {
    const months = ["2026-06-10", "2026-07-10", "2026-08-10", "2026-09-10"];
    const state: AppState = {
      ...quiet,
      transactions: [
        ...months.map((date, index) => spend(`u${String(index)}`, date, 1450, "cat-utilities", "Utilities")),
        spend("now", "2026-10-10", 1650, "cat-utilities", "Utilities"),
      ],
    };
    expect(dashboardInsights(state, "2026-10-12")).toEqual([
      { kind: "priceUp", name: "Utilities", categoryId: "cat-utilities", now: 1650, before: 1450, currency: "UAH" },
    ]);
  });
});
