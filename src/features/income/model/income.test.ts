import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Transaction } from "@/features/data/model/types";

import {
  breakdownSummary,
  incomeByCurrency,
  incomeMatcher,
  incomeStability,
  incomeSummary,
  regularIncomes,
  taxLimits,
} from "./income";

// An income entry with the given fields
const income = (over: Partial<Transaction> & Pick<Transaction, "id" | "date" | "amount">): Transaction => ({
  type: "income",
  currency: "UAH",
  categoryId: "cat-salary",
  ...over,
});

const state: AppState = {
  ...DEFAULT_STATE,
  transactions: [
    income({ id: "aug", date: "2026-08-05", amount: 30000 }),
    income({
      id: "sep",
      date: "2026-09-05",
      amount: 40000,
      tax: { ratePct: 6, fixedUAH: 0, gross: 42553, regime: "fop3" },
    }),
    income({ id: "oct", date: "2026-10-05", amount: 50000, note: "October" }),
    income({ id: "usd", date: "2026-10-08", amount: 100, currency: "USD" }),
    income({ id: "nov", date: "2026-10-25", amount: 45000 }),
  ],
};

describe("incomeSummary", () => {
  it("compares this month with the recent average and keeps the planned part apart", () => {
    const summary = incomeSummary(state, "2026-10-10");
    expect(summary.thisMonth).toBeGreaterThan(95000);
    expect(summary.recentMonths).toBe(2);
    expect(summary.average).toBe(35000);
    expect(summary.soFar).toBeGreaterThan(50000);
    expect(summary.soFar).toBeLessThan(summary.thisMonth - 45000 + 1);
    expect(summary.averageToDate).toBe(35000);
    expect(summary.monthsSoFar).toBe(3);
    expect(summary.monthsTracked).toBe(3);
    expect(summary.plannedThisMonth).toBe(45000);
    expect(summary.planned).toBe(1);
    expect(summary.best?.month).toBe("2026-10");
    expect(summary.tax.entries).toBe(1);
  });
});

describe("taxLimits", () => {
  it("measures the year's taxed income against each regime's limit", () => {
    const [limit] = taxLimits(state, "2026-10-10");
    expect(limit?.regime).toBe("fop3");
    expect(limit?.headroom.used).toBe(42553);
    expect(taxLimits(DEFAULT_STATE, "2026-10-10")).toEqual([]);
  });
});

describe("incomeByCurrency", () => {
  it("adds up the received income of each currency", () => {
    expect(incomeByCurrency(state, "2026-10-10").map((entry) => [entry.currency, entry.native])).toEqual([
      ["UAH", 120000],
      ["USD", 100],
    ]);
  });
});

describe("breakdownSummary", () => {
  it("writes a contract in one line", () => {
    const summary = breakdownSummary(
      { days: 21, dailyRate: 56, premium: 100, compensations: 0, cutoffs: 20 },
      "USD",
      "d",
    );
    expect(summary).toBe("21d × $56.00  +$100  −$20");
  });
});

// The ids of the entries that pass a scope, a category and a search
const passing = (...args: [Parameters<typeof incomeMatcher>[2], string, string]) =>
  state.transactions.filter(incomeMatcher(state, "2026-10-10", ...args, (tx) => [tx.note])).map((tx) => tx.id);

describe("incomeMatcher", () => {
  it("tells received from planned and searches the notes", () => {
    expect(passing("planned", "", "")).toEqual(["nov"]);
    expect(passing("received", "", "octo")).toEqual(["oct"]);
    expect(passing("all", "cat-salary", "")).toHaveLength(5);
  });
});

describe("incomeStability", () => {
  it("measures how far the full months stray from their average, once there are three", () => {
    const series = [
      { month: "2026-07", income: 0 },
      { month: "2026-08", income: 90 },
      { month: "2026-09", income: 110 },
      { month: "2026-10", income: 500 },
    ];
    expect(incomeStability(series, "2026-10")).toBeNull();
    const steady = incomeStability([{ month: "2026-06", income: 100 }, ...series], "2026-10");
    expect(steady?.months).toBe(3);
    expect(steady?.share).toBeCloseTo(0.0816, 3);
  });
});

describe("regularIncomes", () => {
  // A salary on about the fifth of each month from July
  const salary = ["2026-07-05", "2026-08-04", "2026-09-06", "2026-10-05"].map((date, index) =>
    income({ id: `s${String(index)}`, date, amount: 50000 + index * 1000, note: "Salary" }),
  );
  const odd = [income({ id: "o1", date: "2026-09-20", amount: 5000, categoryId: "cat-freelance" })];

  it("finds an income that comes every month on about the same day and dates the next one", () => {
    const found = regularIncomes({ ...DEFAULT_STATE, transactions: [...salary, ...odd] }, "2026-10-20");
    expect(found).toEqual([
      { name: "Salary", categoryId: "cat-salary", amount: 51500, currency: "UAH", months: 4, next: "2026-11-05" },
    ]);
  });

  it("waits a few days for a late one, then lets it go", () => {
    const three = { ...DEFAULT_STATE, transactions: salary.slice(0, 3) };
    expect(regularIncomes(three, "2026-10-08")[0]?.next).toBe("2026-10-08");
    expect(regularIncomes(three, "2026-10-12")).toEqual([]);
  });

  it("leaves out amounts that jump", () => {
    const jumpy = salary.map((tx, index) =>
      Object.assign(structuredClone(tx), { amount: (index % 2) * 50000 + 10000 }),
    );
    expect(regularIncomes({ ...DEFAULT_STATE, transactions: jumpy }, "2026-10-20")).toEqual([]);
  });
});
