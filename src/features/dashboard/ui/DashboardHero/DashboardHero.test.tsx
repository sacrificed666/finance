import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Transaction } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import DashboardHero from "./DashboardHero";

// An entry in hryvnias on the given day
const entry = (id: string, type: Transaction["type"], amount: number, date: string): Transaction => ({
  id,
  type,
  amount,
  currency: "UAH",
  categoryId: type === "income" ? "cat-salary" : "cat-groceries",
  date,
});

const state: AppState = {
  ...DEFAULT_STATE,
  savings: [{ id: "card", name: "Card", icon: "💳", kind: "card", currency: "UAH", openingBalance: 10000 }],
  transactions: [
    entry("pay", "income", 5000, "2026-10-01"),
    entry("food", "expense", 2000, "2026-10-02"),
    entry("bonus", "income", 1000, "2026-10-25"),
    entry("old-pay", "income", 4000, "2026-09-01"),
    entry("old-food", "expense", 1000, "2026-09-02"),
  ],
};

describe("DashboardHero", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the net worth and what it is made of while it has not moved", () => {
    renderWithStore(<DashboardHero />, { state });
    expect(screen.getByText("10,000 ₴")).toBeInTheDocument();
    expect(screen.getByText("What it is made of")).toBeInTheDocument();
  });

  it("shows the month so far and, without budgets, what the month's income leaves", () => {
    renderWithStore(<DashboardHero />, { state });
    expect(screen.getByRole("heading", { name: "October so far" })).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByText("181.82 ₴")).toBeInTheDocument();
    expect(screen.getByText("4,000 ₴ of income left after bills, 22 days to go")).toBeInTheDocument();
  });

  it("asks for a budget or the month's income before it can say what is safe", () => {
    const quiet = { ...state, transactions: state.transactions.filter((tx) => !tx.date.startsWith("2026-10")) };
    renderWithStore(<DashboardHero />, { state: quiet });
    expect(screen.getByRole("link", { name: "Set a budget" })).toHaveAttribute("href", "/transactions");
  });

  it("shares what the budgets leave over the days to go when they are the tighter", () => {
    const budgeted: AppState = { ...state, budgets: [{ categoryId: "cat-food", limit: 3100, currency: "UAH" }] };
    renderWithStore(<DashboardHero />, { state: budgeted });
    expect(screen.getByText("50 ₴")).toBeInTheDocument();
    expect(screen.getByText("1,100 ₴ left in your budgets, 22 days to go")).toBeInTheDocument();
  });

  it("keeps to what the income leaves when the budgets would allow more", () => {
    const loose: AppState = { ...state, budgets: [{ categoryId: "cat-food", limit: 6400, currency: "UAH" }] };
    renderWithStore(<DashboardHero />, { state: loose });
    expect(screen.getByText("181.82 ₴")).toBeInTheDocument();
    expect(screen.getByText("4,000 ₴ of income left after bills, 22 days to go")).toBeInTheDocument();
  });

  it("shows a dash for the savings rate without income", () => {
    renderWithStore(<DashboardHero />, { state: { ...state, transactions: [] } });
    expect(screen.getByText("-")).toBeInTheDocument();
  });
});
