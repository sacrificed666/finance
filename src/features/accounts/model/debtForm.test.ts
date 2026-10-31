import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";

import { debtProblem, deleteDebt, initialDebtForm, saveDebt, type DebtForm } from "./debtForm";

// A filled form of a car loan
const loan = (over: Partial<DebtForm> = {}): DebtForm => ({
  ...initialDebtForm("new"),
  name: "Car",
  kind: "loan",
  balance: "150000",
  ...over,
});

describe("debtProblem", () => {
  it("checks the name, the balance and the optional figures", () => {
    expect(debtProblem(loan())).toBeNull();
    expect(debtProblem(loan({ name: "" }))).toBe("balance.debt.problem.name");
    expect(debtProblem(loan({ balance: "-1" }))).toBe("balance.debt.problem.balance");
    expect(debtProblem(loan({ rate: "300" }))).toBe("balance.inv.problem.rate");
    expect(debtProblem(loan({ monthlyPayment: "x" }))).toBe("balance.debt.problem.payment");
  });
});

describe("saving", () => {
  it("adds a debt with its kind's icon and leaves empty figures out", () => {
    const saved = saveDebt(DEFAULT_STATE, loan({ rate: "14", principal: "" }), () => "d1");
    expect(saved.debts).toEqual([
      expect.objectContaining({ id: "d1", icon: "🏦", annualRatePct: 14, principal: undefined, balance: 150000 }),
    ]);
    const form = { ...initialDebtForm(saved.debts[0]!), balance: "140000" };
    const changed = saveDebt(saved, form, () => "other");
    expect(changed.debts).toEqual([expect.objectContaining({ id: "d1", balance: 140000 })]);
    expect(deleteDebt(changed, "d1").debts).toEqual([]);
  });
});
