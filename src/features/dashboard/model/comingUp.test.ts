import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Investment, Transaction } from "@/features/data/model/types";
import { profileFromRegime } from "@/features/income/model/tax";

import { comingUp } from "./comingUp";

// A planned entry in hryvnias on a day
const planned = (id: string, type: Transaction["type"], date: string, amount: number): Transaction => ({
  id,
  type,
  amount,
  currency: "UAH",
  categoryId: type === "income" ? "cat-salary" : "cat-rent",
  date,
  recurringId: "rule",
});

// A deposit that ends on its own date
const DEPOSIT: Investment = {
  id: "deposit",
  name: "Deposit",
  kind: "deposit",
  currency: "UAH",
  principal: 1000,
  annualRatePct: 14,
  startDate: "2026-01-10",
  compounding: "reinvest",
  compoundingFreq: "monthly",
};

const STATE: AppState = {
  ...DEFAULT_STATE,
  settings: { ...DEFAULT_STATE.settings, tax: profileFromRegime("fop3") },
  receivables: [
    {
      id: "oleh",
      name: "Oleh",
      icon: "🤝",
      amount: 4000,
      currency: "UAH",
      date: "2026-09-01",
      dueDate: "2026-10-30",
      repaid: 1500,
    },
    {
      id: "paid",
      name: "Paid",
      icon: "🤝",
      amount: 100,
      currency: "UAH",
      date: "2026-09-01",
      dueDate: "2026-10-25",
      repaid: 100,
    },
  ],
  transactions: [
    planned("rent", "expense", "2026-11-01", 15000),
    planned("salary", "income", "2026-11-05", 62000),
    planned("later", "expense", "2026-11-12", 399),
    planned("past", "expense", "2026-10-21", 99),
  ],
};

describe("comingUp", () => {
  it("lists what falls due in two weeks, overdue first, then by date", () => {
    const items = comingUp(STATE, "2026-10-22");
    expect(items.map((item) => [item.kind, item.date, item.overdue])).toEqual([
      ["tax", "2026-10-20", true],
      ["receivable", "2026-10-30", false],
      ["expense", "2026-11-01", false],
      ["income", "2026-11-05", false],
    ]);
    expect(items[1]).toMatchObject({ amount: 2500, icon: "🤝" });
  });

  it("names the day a deposit matures and leaves a quiet account empty", () => {
    const quiet: AppState = {
      ...DEFAULT_STATE,
      settings: { ...DEFAULT_STATE.settings, tax: { ...DEFAULT_STATE.settings.tax, regime: "none" } },
    };
    expect(comingUp(quiet, "2026-10-22")).toEqual([]);
    const deposit = { ...quiet, investments: [{ ...DEPOSIT, endDate: "2026-10-28" }] };
    expect(comingUp(deposit, "2026-10-22")).toMatchObject([{ kind: "maturity", date: "2026-10-28" }]);
  });

  it("expects a regular income again, unless one is planned for about that day", () => {
    const quiet: AppState = {
      ...DEFAULT_STATE,
      transactions: ["2026-07-05", "2026-08-05", "2026-09-04", "2026-10-05"].map((date, index) =>
        Object.assign(planned(`pay${String(index)}`, "income", date, 62000), { note: "Salary" }),
      ),
    };
    expect(comingUp(quiet, "2026-10-28")).toMatchObject([
      { kind: "income", date: "2026-11-05", amount: 62000, expected: { name: "Salary" } },
    ]);
    const plannedToo = {
      ...quiet,
      transactions: [
        ...quiet.transactions,
        Object.assign(planned("next", "income", "2026-11-06", 62000), { note: "Salary" }),
      ],
    };
    expect(comingUp(plannedToo, "2026-10-28").map((item) => item.id)).toEqual(["tx:next"]);
  });
});
