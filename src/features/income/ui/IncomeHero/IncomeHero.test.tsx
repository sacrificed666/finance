import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Transaction } from "@/features/data/model/types";
import { profileFromRegime } from "@/features/income/model/tax";
import { renderWithStore } from "@/test/render";

import IncomeHero from "./IncomeHero";

// An income in hryvnias on a day
const income = (id: string, date: string, amount: number): Transaction => ({
  id,
  type: "income",
  amount,
  currency: "UAH",
  categoryId: "cat-salary",
  date,
});

const state: AppState = {
  ...DEFAULT_STATE,
  settings: { ...DEFAULT_STATE.settings, tax: profileFromRegime("fop3") },
  transactions: [
    income("sep", "2026-09-05", 40000),
    income("oct", "2026-10-05", 50000),
    income("later", "2026-10-25", 10000),
  ],
};

describe("IncomeHero", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("leads with this month and keeps the planned part apart", () => {
    renderWithStore(<IncomeHero />, { state });
    expect(screen.getByText("60,000 ₴")).toBeInTheDocument();
    expect(screen.getByText("50K ₴ so far · 10K ₴ planned")).toBeInTheDocument();
    expect(screen.getByText("2026 year to date")).toBeInTheDocument();
  });

  it("shows a dash for a tax not recorded yet and what is planned", () => {
    renderWithStore(<IncomeHero />, { state });
    expect(screen.getByText("no taxed income recorded this year")).toBeInTheDocument();
    expect(screen.getByText("Planned ahead")).toBeInTheDocument();
  });

  it("leaves out the tax without a regime and the plans until there are some", () => {
    renderWithStore(<IncomeHero />, {
      state: {
        ...state,
        settings: { ...state.settings, tax: { ...state.settings.tax, regime: "none" } },
        transactions: state.transactions.filter((tx) => tx.id !== "later"),
      },
    });
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.queryByText("2026 tax")).not.toBeInTheDocument();
    expect(screen.queryByText("Planned ahead")).not.toBeInTheDocument();
  });

  it("fills the free tiles with the next regular payday and how steady the months are", () => {
    const months = ["2026-06-05", "2026-07-06", "2026-08-05", "2026-09-04", "2026-10-05"];
    renderWithStore(<IncomeHero />, {
      state: {
        ...DEFAULT_STATE,
        transactions: months.map((date, index) =>
          Object.assign(income(`s${String(index)}`, date, 50000), { note: "Salary" }),
        ),
      },
    });
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByText("Next payday")).toBeInTheDocument();
    expect(screen.getByText("5 Nov")).toBeInTheDocument();
    expect(screen.getByText("in 26 days")).toBeInTheDocument();
    expect(screen.getByText("Salary · about 50K ₴")).toBeInTheDocument();
    expect(screen.getByText("±0%")).toBeInTheDocument();
    expect(screen.getByText("Steady month to month")).toBeInTheDocument();
  });
});
