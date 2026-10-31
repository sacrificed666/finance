import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";

import { forecast, inflationMix, keptMoney, yearlyRows, type ForecastInputs } from "./forecast";

const state: AppState = {
  ...DEFAULT_STATE,
  settings: { ...DEFAULT_STATE.settings, rates: { USD: 40, EUR: 45 } },
  savings: [
    { id: "card", name: "Card", icon: "💳", kind: "card", currency: "UAH", openingBalance: 30000 },
    { id: "cash", name: "Dollars", icon: "💵", kind: "cash", currency: "USD", openingBalance: 250 },
  ],
  transactions: [
    { id: "pay", type: "income", amount: 20000, currency: "UAH", categoryId: "cat-salary", date: "2026-09-01" },
    { id: "food", type: "expense", amount: 8000, currency: "UAH", categoryId: "cat-groceries", date: "2026-09-02" },
  ],
};

const inputs: ForecastInputs = {
  years: 2,
  view: "UAH",
  returnPct: 0,
  spreadPct: 0,
  inflationOn: false,
  withDebts: false,
  withSaving: true,
  events: [],
};

describe("inflationMix", () => {
  it("weighs each currency's inflation by what is held in it", () => {
    const mix = inflationMix(state, "2026-10-10");
    expect(mix.pct).toBeCloseTo(0.75 * 10 + 0.25 * 3);
    expect(mix.shares).toEqual([
      { currency: "UAH", share: 0.75 },
      { currency: "USD", share: 0.25 },
    ]);
    expect(inflationMix(DEFAULT_STATE, "2026-10-10")).toEqual({ pct: 10, shares: null });
  });
});

describe("keptMoney", () => {
  it("splits what a month keeps into investment top-ups and the rest", () => {
    const withTopUp: AppState = {
      ...state,
      investments: [
        {
          id: "d",
          name: "Deposit",
          kind: "deposit",
          currency: "UAH",
          principal: 1000,
          annualRatePct: 0,
          startDate: "2026-01-01",
          compounding: "reinvest",
          compoundingFreq: "monthly",
          monthlyContribution: 2000,
        },
      ],
    };
    expect(keptMoney(withTopUp, "2026-10")).toEqual({ average: 12000, topUps: 2000, toAccounts: 10000 });
  });
});

describe("forecast", () => {
  it("adds what a month keeps to today's money until the horizon", () => {
    const f = forecast(state, "2026-10-10", inputs);
    expect(f.nowTotal).toBe(40000);
    expect(f.projection).toHaveLength(25);
    expect(f.endTotal).toBe(40000 + 24 * 12000);
    expect(f.split).toEqual({ start: 40000, deposits: 288000, growth: 0 });
    expect(f.avgSpend).toBe(8000);
    expect(f.freedomMonth).toBeNull();
  });

  it("subtracts planned sums and shows the money in today's terms", () => {
    const f = forecast(state, "2026-10-10", {
      ...inputs,
      withSaving: false,
      inflationOn: true,
      events: [{ id: "car", month: "2027-01", amount: -10000, currency: "UAH", note: "Car" }],
    });
    expect(f.endPoint.net).toBe(30000);
    expect(f.endTotal).toBeLessThan(30000);
  });
});

describe("yearlyRows", () => {
  it("takes a row a year with what the year added", () => {
    const rows = yearlyRows(forecast(state, "2026-10-10", inputs));
    expect(rows.map((row) => [row.index, row.net, row.added])).toEqual([
      [0, 40000, null],
      [12, 184000, 144000],
      [24, 328000, 144000],
    ]);
    expect(rows.at(-1)?.share).toBe(100);
  });
});
