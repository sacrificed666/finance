import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Transaction } from "@/features/data/model/types";

import {
  blankIncomeForm,
  incomeFigures,
  incomeFormFor,
  incomeGross,
  incomeProblem,
  parseOptional,
  profileOf,
  regimeOfStoredTax,
  storedTaxChoice,
  saveIncome,
  type IncomeForm,
} from "./incomeForm";
import { profileFromRegime } from "./tax";

const state: AppState = {
  ...DEFAULT_STATE,
  settings: { ...DEFAULT_STATE.settings, tax: { ...DEFAULT_STATE.settings.tax } },
};

// A filled form of a plain amount without tax
const plain = (over: Partial<IncomeForm> = {}): IncomeForm => ({
  ...blankIncomeForm(state, "2026-10-10"),
  taxRegime: "none",
  amount: "1000",
  ...over,
});

// Counts up from one, to stand in for random ids
const counter = () => {
  let next = 0;
  return () => `id-${String(++next)}`;
};

describe("parsing", () => {
  it("reads an empty field as zero", () => {
    expect(parseOptional(" ")).toBe(0);
    expect(parseOptional("12,5")).toBe(12.5);
  });

  it("finds the regime of a stored tax, or custom when it changed", () => {
    expect(regimeOfStoredTax({ ratePct: 6, fixedUAH: 1902.34, gross: 1, regime: "fop3" })).toBe("fop3");
    expect(regimeOfStoredTax({ ratePct: 7, fixedUAH: 0, gross: 1, regime: "fop3" })).toBe("custom");
    expect(regimeOfStoredTax({ ratePct: 6, fixedUAH: 0, gross: 1 })).toBe("custom");
  });

  it("knows a stored tax kept without the social contribution", () => {
    expect(storedTaxChoice({ ratePct: 6, fixedUAH: 0, gross: 1, regime: "fop3" })).toEqual({
      regime: "fop3",
      esv: false,
    });
    expect(storedTaxChoice({ ratePct: 23, fixedUAH: 0, gross: 1, regime: "general" })).toEqual({
      regime: "general",
      esv: false,
    });
    expect(storedTaxChoice({ ratePct: 0, fixedUAH: 0, gross: 1, regime: "none" })).toEqual({
      regime: "none",
      esv: true,
    });
  });
});

describe("figures", () => {
  it("adds up a contract and takes the taxes off the gross", () => {
    const contract = plain({ mode: "contract", days: "20", dailyRate: "50", premium: "100", cutoffs: "50" });
    expect(incomeGross(contract)).toBe(1050);
    const taxed = plain({ taxRegime: "custom", taxRate: "10", taxFixed: "0", taxVat: "0" });
    expect(profileOf(taxed)).toMatchObject({ regime: "custom", ratePct: 10 });
    expect(incomeFigures(taxed, state.settings).net).toBe(900);
    expect(profileOf(plain())).toBeNull();
    expect(profileOf(plain({ taxRegime: "fop3", taxEsv: false }))).toMatchObject({ ratePct: 6, fixedUAH: 0 });
  });
});

describe("incomeProblem", () => {
  it("names the first thing to fix", () => {
    expect(incomeProblem(plain(), state.settings)).toBeNull();
    expect(incomeProblem(plain({ categoryId: "" }), state.settings)).toBe("income.problem.category");
    expect(incomeProblem(plain({ date: "soon" }), state.settings)).toBe("income.problem.date");
    expect(incomeProblem(plain({ mode: "contract", days: "40" }), state.settings)).toBe("income.problem.days");
    expect(incomeProblem(plain({ mode: "contract", days: "2", premium: "-1" }), state.settings)).toBe(
      "income.problem.nonNegative",
    );
    expect(incomeProblem(plain({ taxRegime: "custom", taxRate: "100" }), state.settings)).toBe(
      "income.problem.taxRate",
    );
    expect(incomeProblem(plain({ amount: "0" }), state.settings)).toBe("income.problem.amount");
    expect(
      incomeProblem(plain({ taxRegime: "custom", taxRate: "0", taxFixed: "5000", taxVat: "0" }), state.settings),
    ).toBe("income.problem.afterTax");
  });
});

describe("saveIncome", () => {
  it("adds an income with its tax and keeps the tax as the default", () => {
    const form = plain({ taxRegime: "custom", taxRate: "10", taxFixed: "0", taxVat: "0" });
    const saved = saveIncome(state, form, counter());
    expect(saved.transactions).toEqual([
      expect.objectContaining({ id: "id-1", amount: 900, tax: expect.objectContaining({ gross: 1000, ratePct: 10 }) }),
    ]);
    expect(saved.settings.tax).toMatchObject({ regime: "custom", ratePct: 10 });
  });

  it("keeps the tax regime when an income without tax is added", () => {
    const fop = { ...state, settings: { ...state.settings, tax: profileFromRegime("fop2") } };
    expect(saveIncome(fop, plain(), counter()).settings).toBe(fop.settings);
  });

  it("changes an income in place and leaves the defaults", () => {
    const stored: Transaction = {
      id: "a",
      type: "income",
      amount: 500,
      currency: "UAH",
      categoryId: "cat-salary",
      date: "2026-10-01",
    };
    const withIncome = { ...state, transactions: [stored] };
    const form = { ...incomeFormFor(withIncome, stored, "2026-10-10"), amount: "700" };
    const saved = saveIncome(withIncome, form, counter());
    expect(saved.transactions).toEqual([expect.objectContaining({ id: "a", amount: 700 })]);
    expect(saved.settings).toBe(withIncome.settings);
  });
});
