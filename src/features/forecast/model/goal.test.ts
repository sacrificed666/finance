import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";

import { forecast } from "./forecast";
import { goalPlan, goalPresets, milestones, positiveAmount } from "./goal";

const state: AppState = {
  ...DEFAULT_STATE,
  savings: [{ id: "card", name: "Card", icon: "💳", kind: "card", currency: "UAH", openingBalance: 30000 }],
  transactions: [
    { id: "pay", type: "income", amount: 20000, currency: "UAH", categoryId: "cat-salary", date: "2026-09-01" },
    { id: "food", type: "expense", amount: 10000, currency: "UAH", categoryId: "cat-groceries", date: "2026-09-02" },
  ],
};

const f = forecast(state, "2026-10-10", {
  years: 2,
  view: "UAH",
  returnPct: 0,
  spreadPct: 0,
  inflationOn: false,
  withDebts: false,
  withSaving: true,
  events: [],
});

describe("positiveAmount", () => {
  it("reads a positive amount, or zero", () => {
    expect(positiveAmount("1 500")).toBe(1500);
    expect(positiveAmount("-5")).toBe(0);
    expect(positiveAmount("abc")).toBe(0);
  });
});

describe("goalPlan", () => {
  it("finds the month a goal is reached and the saving a deadline needs", () => {
    const plan = goalPlan(f, 100000, "2027-04", 0);
    expect(plan).toMatchObject({ reached: false, hitIndex: 7, hitMonth: "2027-05", months: 6 });
    expect(plan.neededMonthly).toBeCloseTo(10000 / 6);
  });

  it("is done when the money is there already and asks nothing without a goal", () => {
    expect(goalPlan(f, 20000, "2027-04", 0)).toMatchObject({ reached: true, neededMonthly: null });
    expect(goalPlan(f, 0, "2027-04", 0)).toMatchObject({ reached: false, hitMonth: null, neededMonthly: null });
  });
});

describe("goalPresets and milestones", () => {
  it("suggests round goals and lists the round sums passed on the way", () => {
    expect(goalPresets(f, "UAH")).toEqual([20000, 50000, 100000]);
    expect(milestones(f)).toEqual([
      { amount: 100000, month: "2027-05" },
      { amount: 200000, month: "2028-03" },
    ]);
  });
});
