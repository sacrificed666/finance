import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Transaction } from "@/features/data/model/types";
import { report } from "@/features/reports/model/report";
import { renderWithStore } from "@/test/render";

import FixedCard from "./FixedCard";

// An entry in hryvnias in October
const entry = (id: string, over: Partial<Transaction>): Transaction => ({
  id,
  type: "expense",
  amount: 100,
  currency: "UAH",
  categoryId: "cat-groceries",
  date: "2026-10-05",
  ...over,
});

const state: AppState = {
  ...DEFAULT_STATE,
  transactions: [
    entry("pay", { type: "income", categoryId: "cat-salary", amount: 4000 }),
    entry("rent", { categoryId: "cat-rent", amount: 1000, recurringId: "r1" }),
    entry("old-rent", { categoryId: "cat-rent", amount: 800, recurringId: "r1", date: "2026-09-01" }),
    entry("milk", { amount: 1000 }),
  ],
};

describe("FixedCard", () => {
  it("splits spending into fixed and flexible and sets the fixed part against income", () => {
    renderWithStore(<FixedCard r={report(state, "month", "2026-10")} currency="UAH" />, { state });
    expect(screen.getByText("Fixed")).toBeInTheDocument();
    expect(screen.getByText("Flexible")).toBeInTheDocument();
    expect(screen.getByText("Fixed costs take 25% of income · +200 ₴ vs the period before")).toBeInTheDocument();
  });

  it("explains where fixed costs come from while there are none", () => {
    const plain = { ...state, transactions: state.transactions.filter((tx) => !tx.recurringId) };
    renderWithStore(<FixedCard r={report(plain, "month", "2026-10")} currency="UAH" />, { state: plain });
    expect(screen.getByText(/^Nothing fixed this period/u)).toBeInTheDocument();
    expect(screen.queryByText("Flexible")).not.toBeInTheDocument();
  });
});
