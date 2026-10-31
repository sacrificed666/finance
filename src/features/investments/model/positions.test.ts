import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Investment } from "@/features/data/model/types";

import { investmentsByKind, investmentTotals, oneYearFrom, positionReturns, valueByCurrency } from "./positions";

// A position with the given fields
const position = (id: string, over: Partial<Investment>): Investment => ({
  id,
  name: id,
  kind: "stocks",
  currency: "UAH",
  principal: 1000,
  annualRatePct: 0,
  startDate: "2026-01-10",
  compounding: "reinvest",
  compoundingFreq: "annually",
  ...over,
});

const settings = { ...DEFAULT_STATE.settings, rates: { USD: 40, EUR: 45 } };

describe("oneYearFrom", () => {
  it("keeps the day, or takes the month's last one", () => {
    expect(oneYearFrom("2026-10-10")).toBe("2027-10-10");
    expect(oneYearFrom("2028-02-29")).toBe("2029-02-28");
  });
});

describe("positionReturns", () => {
  it("counts a market position's gain and leaves the year flat without a rate", () => {
    const returns = positionReturns(position("s", { marketValue: 1500 }), "2026-10-10", "2027-10-10");
    expect(returns).toMatchObject({ earned: 500, gainPct: 50, nextYear: 0, valueInYear: 1500 });
  });

  it("projects what a deposit adds over the year", () => {
    const deposit = position("d", {
      kind: "deposit",
      annualRatePct: 10,
      compounding: "payout",
      startDate: "2026-10-10",
    });
    const returns = positionReturns(deposit, "2026-10-10", "2027-10-10");
    expect(returns.earned).toBe(0);
    expect(returns.nextYear).toBeCloseTo(100, 0);
    expect(returns.nextYearPct).toBeCloseTo(10, 0);
  });
});

describe("investmentsByKind", () => {
  it("sums each kind in the base currency, the largest first", () => {
    const rows = investmentsByKind(
      [position("a", {}), position("b", { kind: "crypto", currency: "USD", principal: 100 }), position("c", {})],
      "2026-10-10",
      settings,
    );
    expect(rows.map((row) => [row.kind, row.value])).toEqual([
      ["crypto", 4000],
      ["stocks", 2000],
    ]);
  });
});

describe("valueByCurrency", () => {
  it("leaves out the currencies nothing is held in", () => {
    const state: AppState = {
      ...DEFAULT_STATE,
      settings,
      investments: [position("a", { currency: "USD", principal: 10 })],
    };
    expect(valueByCurrency(state, "2026-10-10")).toEqual([{ currency: "USD", value: 400 }]);
  });
});

describe("investmentTotals", () => {
  it("adds up the positions with a year of months ahead", () => {
    const state: AppState = {
      ...DEFAULT_STATE,
      investments: [
        position("a", { marketValue: 1200, monthlyContribution: 100 }),
        position("b", { endDate: "2026-01-31" }),
      ],
    };
    const totals = investmentTotals(state, "2026-10-10");
    expect(totals).toMatchObject({ invested: 2000, value: 2200, earned: 200, topUps: 100 });
    expect(totals.ahead).toHaveLength(13);
    expect(totals.ahead[12]).toBeGreaterThan(totals.ahead[0] ?? 0);
  });
});
