import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Transaction } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import MonthHero from "./MonthHero";

// An entry in hryvnias
const entry = (
  id: string,
  type: Transaction["type"],
  amount: number,
  date: string,
  categoryId: string,
): Transaction => ({
  id,
  type,
  amount,
  currency: "UAH",
  categoryId,
  date,
});

const state: AppState = {
  ...DEFAULT_STATE,
  transactions: [
    entry("salary-sep", "income", 40000, "2026-09-05", "cat-salary"),
    entry("food-sep", "expense", 9000, "2026-09-12", "cat-groceries"),
    entry("salary-oct", "income", 42000, "2026-10-05", "cat-salary"),
    entry("food-oct", "expense", 5000, "2026-10-08", "cat-groceries"),
    entry("rent-oct", "expense", 12000, "2026-10-25", "cat-rent"),
  ],
  budgets: [{ categoryId: "cat-food", limit: 4000, currency: "UAH" }],
};

describe("MonthHero", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("leads with the month's spending and keeps the planned part apart", () => {
    renderWithStore(<MonthHero month="2026-10" onMonthChange={vi.fn<(month: string) => void>()} />, { state });
    expect(screen.getByRole("heading", { name: "Spent" })).toBeInTheDocument();
    expect(screen.getByText("17,000 ₴")).toBeInTheDocument();
    expect(screen.getByText("5,000 ₴ so far · 12K ₴ planned")).toBeInTheDocument();
    expect(screen.getByText("2 entries")).toBeInTheDocument();
    expect(screen.getByText("Budget left")).toBeInTheDocument();
    expect(screen.getByText("1 over the line")).toBeInTheDocument();
  });

  it("draws the pace and sets the month against the one before by this day", () => {
    const paced: AppState = {
      ...DEFAULT_STATE,
      transactions: [
        entry("sep", "expense", 300, "2026-09-02", "cat-groceries"),
        entry("oct", "expense", 600, "2026-10-01", "cat-groceries"),
      ],
    };
    renderWithStore(<MonthHero month="2026-10" onMonthChange={vi.fn<(month: string) => void>()} />, { state: paced });
    expect(screen.getByText("Spending pace")).toBeInTheDocument();
    expect(screen.getAllByText("+300 ₴ vs September by this day")).not.toHaveLength(0);
  });

  it("switches the month from its corner", async () => {
    const onMonthChange = vi.fn<(month: string) => void>();
    const { user } = renderWithStore(<MonthHero month="2026-10" onMonthChange={onMonthChange} />, { state });
    await user.click(screen.getByRole("button", { name: "Previous month" }));
    expect(onMonthChange).toHaveBeenCalledWith("2026-09");
  });
});
