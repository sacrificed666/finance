import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Transaction } from "@/features/data/model/types";

import {
  categoryChanges,
  keptRate,
  orderedRange,
  periodDays,
  periodKey,
  periodStart,
  report,
  sameDayBefore,
  yearReview,
} from "./report";

// An entry in hryvnias
const entry = (id: string, over: Partial<Transaction>): Transaction => ({
  id,
  type: "expense",
  amount: 100,
  currency: "UAH",
  categoryId: "cat-groceries",
  date: "2026-10-05",
  ...over,
});

const state: AppState = {
  ...DEFAULT_STATE,
  transactions: [
    entry("milk", { amount: 300, tags: ["home"] }),
    entry("taxi", { categoryId: "cat-taxi", amount: 200 }),
    entry("pay", { type: "income", categoryId: "cat-salary", amount: 2000 }),
    entry("old-milk", { amount: 100, date: "2026-09-05" }),
    entry("old-gym", { categoryId: "cat-pharmacy", amount: 500, date: "2026-09-06" }),
  ],
};

describe("periods", () => {
  it("starts a quarter or a year on its first month and names it by a key", () => {
    expect(periodStart("quarter", "2026-11")).toBe("2026-10");
    expect(periodStart("year", "2026-11")).toBe("2026-01");
    expect(periodKey("quarter", "2026-04")).toBe("2026-Q2");
    expect(periodKey("year", "2026-01")).toBe("2026");
    expect(periodKey("month", "2026-04")).toBe("2026-04");
  });

  it("counts the days of a period and those passed", () => {
    expect(periodDays(["2026-09", "2026-10", "2026-11"], "2026-10-10")).toEqual({ days: 91, elapsed: 40 });
  });
});

describe("report", () => {
  it("totals the month against the one before and finds the largest spendings", () => {
    const r = report(state, "month", "2026-10");
    expect(r.current).toMatchObject({ income: 2000, expense: 500, net: 1500 });
    expect(r.previous.expense).toBe(600);
    expect(r.current.byTag.get("home")).toBe(300);
    expect(r.largest.map(({ tx }) => tx.id)).toEqual(["milk", "taxi"]);
    expect(r.trendOf("cat-food").at(-1)).toBe(300);
    expect(keptRate(r.current.income, r.current.net)).toBe(75);
  });

  it("splits the income by source and counts what rules and subscriptions spent", () => {
    const fixed = [
      entry("rent", { categoryId: "cat-rent", amount: 1000, recurringId: "r1" }),
      entry("tv", { amount: 50, subscriptionId: "s1" }),
    ];
    const r = report({ ...state, transactions: [...state.transactions, ...fixed] }, "month", "2026-10");
    expect(r.current.fixed).toBe(1050);
    expect(r.previous.fixed).toBe(0);
    expect([...r.current.bySource.values()]).toEqual([2000]);
  });

  it("lists categories of either period, the largest now first", () => {
    const changes = categoryChanges(report(state, "month", "2026-10"));
    expect(changes.map((change) => [change.id, change.value, change.before])).toEqual([
      ["cat-food", 300, 100],
      ["cat-transport", 200, 0],
      ["cat-health", 0, 500],
    ]);
  });
});

describe("a period still running", () => {
  it("finds the same day in the period before, held to its last day", () => {
    expect(sameDayBefore("2026-10", "2026-09", "2026-10-15")).toBe("2026-09-15");
    expect(sameDayBefore("2026-03", "2026-02", "2026-03-31")).toBe("2026-02-28");
    expect(sameDayBefore("2026-10", "2026-07", "2026-11-05")).toBe("2026-08-05");
  });

  it("counts both sides up to the same day", () => {
    const r = report(state, "month", "2026-10", "2026-10-05");
    expect(r.inProgress).toBe(true);
    expect(r.previous.expense).toBe(100);
    const done = report(state, "month", "2026-09", "2026-10-05");
    expect(done.inProgress).toBe(false);
    expect(done.current.expense).toBe(600);
  });

  it("leaves what is planned later in a running month out of its trends", () => {
    const planned = {
      ...state,
      transactions: [...state.transactions, entry("later", { amount: 900, date: "2026-10-28" })],
    };
    const r = report(planned, "month", "2026-10", "2026-10-05");
    expect(r.trendOf("cat-food").at(-1)).toBe(300);
    expect(r.year.at(-1)?.expense).toBe(500);
    expect(report(planned, "month", "2026-10", "2026-10-30").year.at(-1)?.expense).toBe(1400);
  });
});

describe("yearReview", () => {
  it("finds the best and toughest months, or nothing without any", () => {
    const review = yearReview(report(state, "year", "2026-10").year);
    expect(review).toMatchObject({ best: { month: "2026-10" }, worst: { month: "2026-09" }, months: 2, inThePlus: 1 });
    expect(yearReview([])).toBeNull();
  });
});

describe("ranges and a year before", () => {
  const lastYear = {
    ...state,
    transactions: [...state.transactions, entry("2025", { amount: 900, date: "2025-10-07" })],
  };

  it("sets a month against the same month a year before", () => {
    const r = report(lastYear, "month", "2026-10", "2026-12-01", { compare: "lastYear" });
    expect(r).toMatchObject({ start: "2026-10", prevStart: "2025-10", prevEnd: "2025-10", compare: "lastYear" });
    expect(r.previous.expense).toBe(900);
  });

  it("covers a chosen range of months against the months just before it", () => {
    const r = report(state, "custom", "2026-10", "2026-12-01", { range: { from: "2026-10", to: "2026-09" } });
    expect(r).toMatchObject({ start: "2026-09", end: "2026-10", prevStart: "2026-07", prevEnd: "2026-08" });
    expect(r.current.expense).toBe(1100);
    expect(periodKey("custom", r.start, r.end)).toBe("2026-09_2026-10");
  });

  it("keeps a range in order and at most ten years long", () => {
    expect(orderedRange({ from: "2026-05", to: "2026-01" })).toEqual({ from: "2026-01", to: "2026-05" });
    expect(orderedRange({ from: "2000-01", to: "2026-12" })).toEqual({ from: "2017-01", to: "2026-12" });
  });
});
