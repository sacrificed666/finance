import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Investment } from "@/features/data/model/types";

import { hasSchedule, investmentSchedule } from "./schedule";

// A deposit paying its interest out, with the given fields
const deposit = (id: string, over: Partial<Investment>): Investment => ({
  id,
  name: id,
  kind: "deposit",
  currency: "UAH",
  principal: 12000,
  annualRatePct: 10,
  startDate: "2026-01-10",
  compounding: "payout",
  compoundingFreq: "monthly",
  ...over,
});

// The schedule of some positions on 10 October 2026
const scheduleOf = (investments: Investment[]) => {
  const state: AppState = { ...DEFAULT_STATE, investments };
  return investmentSchedule(state, "2026-10-10");
};

describe("investmentSchedule", () => {
  it("adds up the top-ups and a year of payouts of the open positions", () => {
    const schedule = scheduleOf([
      deposit("open", { monthlyContribution: 500 }),
      deposit("ended", { endDate: "2026-09-01" }),
    ]);
    expect(schedule.topUps).toBe(500);
    expect(schedule.payoutsYear).toBeGreaterThan(1200);
  });

  it("orders the ending terms and keeps the ended ones apart", () => {
    const schedule = scheduleOf([
      deposit("late", { endDate: "2027-05-01" }),
      deposit("soon", { endDate: "2026-12-01" }),
      deposit("done", { endDate: "2026-10-10" }),
    ]);
    expect(schedule.maturing.map((inv) => inv.id)).toEqual(["soon", "late"]);
    expect(schedule.matured.map((inv) => inv.id)).toEqual(["done"]);
  });

  it("has nothing to show for a position that only compounds", () => {
    expect(hasSchedule(scheduleOf([deposit("quiet", { compounding: "reinvest" })]))).toBe(false);
    expect(hasSchedule(scheduleOf([deposit("paying", {})]))).toBe(true);
  });
});
