import { describe, expect, it } from "vitest";

import { debtPayoff } from "@/features/data/model/finmath";
import type { Debt } from "@/features/data/model/types";

import { planPayoff, type PayoffDebt } from "./payoff";

const card: PayoffDebt = { id: "card", balance: 20_000, ratePct: 36, payment: 1_500 };
const car: PayoffDebt = { id: "car", balance: 150_000, ratePct: 14, payment: 5_200 };
const friend: PayoffDebt = { id: "friend", balance: 6_000, ratePct: 0, payment: 1_000 };

describe("planPayoff", () => {
  it("with nothing extra, pays each debt as it stands, like the debts card", () => {
    const debt: Debt = {
      id: "car",
      name: "Car",
      icon: "🚗",
      kind: "loan",
      currency: "UAH",
      balance: 150_000,
      annualRatePct: 14,
      monthlyPayment: 5_200,
    };
    const single = debtPayoff(debt, "2026-10")!;
    const plan = planPayoff([car], "2026-10");
    expect(plan.months).toBe(single.months);
    expect(plan.finalMonth).toBe(single.finalMonth);
    expect(plan.interest).toBeCloseTo(single.interest, 2);
  });

  it("finishes sooner and pays less interest with an extra amount each month", () => {
    const asSet = planPayoff([card, car, friend], "2026-10");
    const sooner = planPayoff([card, car, friend], "2026-10", { extra: 3_000, strategy: "avalanche" });
    expect(sooner.months).toBeLessThan(asSet.months);
    expect(sooner.interest).toBeLessThan(asSet.interest);
  });

  it("clears the dearest debt first on the avalanche and the smallest first on the snowball", () => {
    const avalanche = planPayoff([card, car, friend], "2026-10", { extra: 3_000, strategy: "avalanche" });
    const snowball = planPayoff([card, car, friend], "2026-10", { extra: 3_000, strategy: "snowball" });
    expect(avalanche.cleared[0]?.id).toBe("card");
    expect(snowball.cleared[0]?.id).toBe("friend");
    expect(avalanche.interest).toBeLessThanOrEqual(snowball.interest);
  });

  it("keeps paying the same total: a cleared debt's payment moves on to the next one", () => {
    const small = { id: "small", balance: 1_000, ratePct: 0, payment: 1_000 };
    const big = { id: "big", balance: 10_000, ratePct: 0, payment: 1_000 };
    const asSet = planPayoff([small, big], "2026-01");
    const rolled = planPayoff([small, big], "2026-01", { extra: 0, strategy: "snowball" });
    expect(asSet.months).toBe(10);
    expect(rolled.months).toBe(6);
    expect(rolled.cleared).toEqual([
      { id: "small", month: "2026-01" },
      { id: "big", month: "2026-06" },
    ]);
  });

  it("says so when the payments never catch up with the interest", () => {
    const plan = planPayoff([{ id: "x", balance: 100_000, ratePct: 40, payment: 1_000 }], "2026-10");
    expect(plan.neverPaysOff).toBe(true);
    expect(plan.months).toBe(Infinity);
  });

  it("has nothing to do without debts", () => {
    expect(planPayoff([], "2026-10")).toEqual({
      months: 0,
      interest: 0,
      finalMonth: "",
      cleared: [],
      neverPaysOff: false,
    });
  });
});
