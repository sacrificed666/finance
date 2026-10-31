import { describe, expect, it } from "vitest";

import { returnPolicy } from "./returns";

describe("returnPolicy", () => {
  it("lets a deposit compound at a chosen frequency", () => {
    expect(returnPolicy({ kind: "deposit", compounding: "reinvest", compoundingFreq: "quarterly" })).toMatchObject({
      style: "interest",
      compounding: "reinvest",
      compoundingFreq: "quarterly",
      freqChoice: true,
    });
  });

  it("pays bond coupons out whatever was stored", () => {
    expect(returnPolicy({ kind: "bonds", compounding: "reinvest", compoundingFreq: "monthly" })).toMatchObject({
      style: "coupons",
      compounding: "payout",
      freqChoice: false,
    });
  });

  it("pays an Inzhur dividend fund monthly and grows the others", () => {
    expect(
      returnPolicy({ kind: "inzhur", fund: "inzhur-reit", compounding: "payout", compoundingFreq: "annually" }),
    ).toMatchObject({ style: "dividends", compoundingFreq: "monthly" });
    expect(
      returnPolicy({ kind: "inzhur", fund: "inzhur-energy", compounding: "payout", compoundingFreq: "monthly" }),
    ).toMatchObject({ style: "growth", compounding: "reinvest", compoundingFreq: "annually" });
  });
});
