import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Debt } from "@/features/data/model/types";

import { debtSchedule, debtSortKey, payoffDebts } from "./debts";

// A debt in hryvnias with the given fields
const debt = (over: Partial<Debt> & Pick<Debt, "id">): Debt => ({
  name: over.id,
  icon: "🏦",
  kind: "loan",
  currency: "UAH",
  balance: 10000,
  ...over,
});

const state: AppState = {
  ...DEFAULT_STATE,
  debts: [
    debt({ id: "car", balance: 12000, annualRatePct: 12, monthlyPayment: 1000 }),
    debt({ id: "friend", balance: 3000, monthlyPayment: 1000 }),
    debt({ id: "stuck", balance: 50000, annualRatePct: 50, monthlyPayment: 100 }),
    debt({ id: "open", balance: 2000 }),
  ],
};

describe("debtSchedule", () => {
  it("adds up the payments, the interest of the debts that end and their last month", () => {
    const schedule = debtSchedule(state, "2026-10");
    expect(schedule.payment).toBe(2100);
    expect(schedule.lastMonth).toBe("2027-10");
    expect(schedule.interest).toBeGreaterThan(0);
  });
});

describe("debtSortKey", () => {
  it("puts the endless debts last when ordered by payoff", () => {
    const keys = state.debts.map((item) => debtSortKey(state, item, "payoff", "2026-10"));
    expect(keys[1]).toBe(3);
    expect(keys[2]).toBe(Number.MAX_SAFE_INTEGER);
    expect(keys[3]).toBe(Number.MAX_SAFE_INTEGER - 1);
    expect(debtSortKey(state, state.debts[0]!, "rate", "2026-10")).toBe(12);
  });
});

describe("payoffDebts", () => {
  it("hands the planner the debts in the base currency", () => {
    expect(payoffDebts(state)[0]).toEqual({ id: "car", balance: 12000, ratePct: 12, payment: 1000 });
  });
});
