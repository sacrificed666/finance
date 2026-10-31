import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Transaction } from "@/features/data/model/types";
import { convert, ratesAt } from "@/shared/lib/money";

import { averageRate, monthsNeedingRates, normalizeMonthRates } from "./monthRates";

// An expense of a day in a currency
const tx = (date: string, currency: Transaction["currency"] = "UAH"): Transaction => ({
  id: date + currency,
  type: "expense",
  amount: 100,
  currency,
  categoryId: "cat-food",
  date,
});

const base: AppState = {
  ...DEFAULT_STATE,
  settings: { ...DEFAULT_STATE.settings, baseCurrency: "UAH", rates: { USD: 41.5, EUR: 48 } },
};

describe("monthsNeedingRates", () => {
  it("asks for nothing while everything is in hryvnias", () => {
    expect(monthsNeedingRates({ ...base, transactions: [tx("2026-05-02"), tx("2026-08-20")] }, "2026-09")).toEqual([]);
  });

  it("asks for past months with entries, newest first, leaving out the current month and the known ones", () => {
    const s: AppState = {
      ...base,
      transactions: [tx("2026-05-02", "USD"), tx("2026-08-20"), tx("2026-09-10"), tx("2026-07-01")],
      settings: { ...base.settings, monthRates: { "2026-07": { USD: 41, EUR: 47 } } },
    };
    expect(monthsNeedingRates(s, "2026-09")).toEqual(["2026-08", "2026-05"]);
    expect(monthsNeedingRates(s, "2026-09", 1)).toEqual(["2026-08"]);
  });

  it("needs them for every month once the base currency is foreign", () => {
    const s: AppState = {
      ...base,
      settings: { ...base.settings, baseCurrency: "USD" },
      transactions: [tx("2026-06-02")],
    };
    expect(monthsNeedingRates(s, "2026-09")).toEqual(["2026-06"]);
  });
});

describe("month rates in conversions", () => {
  it("uses the month's rate for an entry of that month, and today's otherwise", () => {
    const settings = { ...base.settings, monthRates: { "2025-01": { USD: 42, EUR: 44 } } };
    expect(convert(100, "USD", "UAH", ratesAt(settings, "2025-01-15"))).toBe(4200);
    expect(convert(100, "USD", "UAH", ratesAt(settings, "2026-09-15"))).toBe(4150);
  });
});

describe("helpers", () => {
  it("averages the NBU's daily rates", () => {
    expect(averageRate([{ rate_per_unit: 41 }, { rate_per_unit: 42 }, { rate: 43 }])).toBe(42);
    expect(averageRate([])).toBeNull();
    expect(averageRate({ rate: 41 })).toBeNull();
  });

  it("keeps only well-formed months with both rates", () => {
    expect(
      normalizeMonthRates({
        "2026-01": { USD: 42, EUR: 45 },
        "2026-13x": { USD: 1, EUR: 1 },
        "2026-02": { USD: 0, EUR: 45 },
      }),
    ).toEqual({ "2026-01": { USD: 42, EUR: 45 } });
    expect(normalizeMonthRates("nope")).toBeUndefined();
  });
});
