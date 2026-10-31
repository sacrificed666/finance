import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Transaction } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import BudgetsCard from "./BudgetsCard";

// An expense in hryvnias
const spend = (amount: number, date: string, categoryId: string): Transaction => ({
  id: `${date}:${categoryId}`,
  type: "expense",
  amount,
  currency: "UAH",
  categoryId,
  date,
});

const state: AppState = {
  ...DEFAULT_STATE,
  transactions: [
    spend(3000, "2026-10-02", "cat-groceries"),
    spend(16000, "2026-10-03", "cat-rent"),
    spend(500, "2026-10-04", "cat-transport"),
  ],
  budgets: [
    { categoryId: "cat-food", limit: 9000, currency: "UAH" },
    { categoryId: "cat-housing", limit: 15000, currency: "UAH" },
  ],
};

describe("BudgetsCard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-05T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("puts the budget most used first and tells what is left of all of them", () => {
    renderWithStore(<BudgetsCard month="2026-10" />, { state });
    expect(screen.getByText("5,000 ₴ left")).toBeInTheDocument();
    expect(screen.getByText("+ 500 ₴ spent outside any budget")).toBeInTheDocument();
    const [housing, food] = screen.getAllByRole("listitem");
    expect(within(housing!).getByText("16K ₴ of 15K ₴").className).toMatch(/overAmounts/u);
    expect(within(food!).getByText(/runs out/u)).toHaveTextContent("At this pace it runs out ~");
  });

  it("opens a budget to edit it", async () => {
    const { user } = renderWithStore(<BudgetsCard month="2026-10" />, { state });
    await user.click(screen.getAllByRole("button", { name: /Food/u })[0]!);
    expect(screen.getByRole("dialog", { name: "Edit budget" })).toBeInTheDocument();
  });

  it("invites to set the first budget", () => {
    renderWithStore(<BudgetsCard month="2026-10" />);
    expect(screen.getByText("No budgets")).toBeInTheDocument();
  });
});
